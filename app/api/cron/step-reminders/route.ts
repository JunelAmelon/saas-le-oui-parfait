import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { sendEmailServer } from '@/lib/notifications.server';

export const runtime = 'nodejs';

function getAuthOk(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) return false;
  return auth.slice('Bearer '.length) === secret;
}

function daysBetween(a: Date, b: Date) {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

const DEFAULT_REMINDER_OFFSETS = [-7, -3, 0, 3, 7, 14];

function toJsDate(v: any): Date | null {
  if (!v) return null;
  if (typeof v === 'string') {
    const d = new Date(v + 'T00:00:00');
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (v.toDate) return v.toDate();
  if (v.seconds) return new Date(v.seconds * 1000);
  return null;
}

function formatDate(d: Date) {
  return d.toLocaleDateString('fr-FR');
}

async function getClientInfo(clientId: string): Promise<{ email: string | null; name: string; plannerId: string | null; clientUserId: string | null }> {
  try {
    const snap = await adminDb.collection('clients').doc(clientId).get();
    if (!snap.exists) return { email: null, name: 'Client', plannerId: null, clientUserId: null };
    const data = snap.data() as any;
    const email = data.email || data.client_email || null;
    const plannerId = data.planner_id || null;
    const clientUserId = data.client_user_id || null;
    const coupleNames = data.couple_names
      || `${data.name || ''}${data.name && data.partner ? ' & ' : ''}${data.partner || ''}`.trim()
      || data.name
      || 'Client';
    return { email, name: coupleNames, plannerId, clientUserId };
  } catch {
    return { email: null, name: 'Client', plannerId: null, clientUserId: null };
  }
}

interface StepReminderResult {
  id: string;
  title: string;
  clientId: string;
  clientName: string;
  clientEmail: string | null;
  clientUserId: string | null;
  plannerId: string | null;
  daysUntil: number;
  tier: string;
  status: 'sent' | 'skipped_already_sent' | 'skipped_no_email' | 'dry_run' | 'error';
}

function buildSubject(name: string, daysUntil: number, isUrgent: boolean): string {
  const prefix = isUrgent ? '[URGENT] ' : '';
  if (daysUntil < 0) {
    return `${prefix}Rappel dans ${Math.abs(daysUntil)} jour${Math.abs(daysUntil) > 1 ? 's' : ''} — ${name} — Le Oui Parfait`;
  }
  if (daysUntil === 0) {
    return `${prefix}C'est le moment : ${name} — Le Oui Parfait`;
  }
  return `${prefix}Retard de ${daysUntil} jour${daysUntil > 1 ? 's' : ''} — ${name} — Le Oui Parfait`;
}

function buildBody(
  coupleName: string,
  name: string,
  description: string,
  deadline: Date,
  daysUntil: number,
  isUrgent: boolean,
): string {
  const dateStr = formatDate(deadline);
  let intro = '';

  if (daysUntil < 0) {
    intro = `Votre prochaine étape “${name}” est prévue pour le ${dateStr} (dans ${Math.abs(daysUntil)} jour${Math.abs(daysUntil) > 1 ? 's' : ''}).`;
  } else if (daysUntil === 0) {
    intro = `Aujourd'hui, ${dateStr}, c'est le jour prévu pour l'étape “${name}”.`;
  } else {
    intro = `L'étape “${name}” était prévue pour le ${dateStr} (il y a ${daysUntil} jour${daysUntil > 1 ? 's' : ''}).`;
  }

  const urgency = isUrgent
    ? '\n\nCette étape est prioritaire car votre mariage approche.'
    : '';

  const baseUrl = (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://leouiparfait.fr').replace(/\/$/, '');

  return (
    `Bonjour ${coupleName},\n\n`
    + `${intro}${urgency}\n\n`
    + `Détail : ${description}\n\n`
    + `Une fois cette étape réalisée, connectez-vous à votre espace client pour la confirmer et arrêter les rappels automatiques :\n`
    + `${baseUrl}/espace-client/planning\n\n`
    + `Cordialement,\nL'équipe Le Oui Parfait`
  );
}

export async function GET(req: Request) {
  try {
    if (!getAuthOk(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const dryRun =
      url.searchParams.get('dry_run') === '1' ||
      process.env.DISABLE_STEP_REMINDER_EMAILS === 'true';

    const now = new Date();
    const results: StepReminderResult[] = [];

    const snap = await adminDb
      .collection('tasks')
      .where('kind', '==', 'milestone')
      .get();

    const docs: Array<{ id: string; data: any }> = [];
    snap.forEach((d) => {
      const data = d.data() as any;
      if (data.client_confirmed) return;
      docs.push({ id: d.id, data });
    });

    for (const { id, data } of docs) {
      const deadlineStr = data.deadline_date || data.deadline;
      const deadline = toJsDate(deadlineStr);
      if (!deadline) continue;

      const daysUntil = daysBetween(now, deadline);
      const reminderOffsets = (data.reminder_offsets || DEFAULT_REMINDER_OFFSETS) as number[];
      if (!reminderOffsets.length) continue;

      const offset = reminderOffsets.find((o) => daysUntil >= o && daysUntil < o + 1);
      if (offset === undefined) continue;

      const tier = `J${offset >= 0 ? '+' : ''}${offset}`;
      const lastTier = data.last_reminder_tier;

      if (lastTier === tier) {
        results.push({
          id,
          title: data.title || 'Étape',
          clientId: data.client_id,
          clientName: '',
          clientEmail: null,
          clientUserId: null,
          plannerId: null,
          daysUntil,
          tier,
          status: 'skipped_already_sent',
        });
        continue;
      }

      const clientId = data.client_id;
      if (!clientId) continue;

      const { email, name, plannerId, clientUserId } = await getClientInfo(clientId);
      const title = data.title || 'Étape';
      const description = data.description || '';
      const isUrgent = data.priority === 'urgent';

      if (!email) {
        results.push({
          id,
          title,
          clientId,
          clientName: name,
          clientEmail: null,
          clientUserId,
          plannerId,
          daysUntil,
          tier,
          status: 'skipped_no_email',
        });
        continue;
      }

      const subject = buildSubject(title, daysUntil, isUrgent);
      const text = buildBody(name, title, description, deadline, daysUntil, isUrgent);

      if (dryRun) {
        results.push({
          id,
          title,
          clientId,
          clientName: name,
          clientEmail: email,
          clientUserId,
          plannerId,
          daysUntil,
          tier,
          status: 'dry_run',
        });
        continue;
      }

      try {
        await sendEmailServer({ to: email, subject, text });

        await adminDb.collection('tasks').doc(id).update({
          last_reminder_sent: now.toISOString(),
          last_reminder_tier: tier,
        });

        // In-app notification côté client
        try {
          if (clientUserId) {
            await adminDb.collection('notifications').add({
              recipient_id: clientUserId,
              type: 'step_reminder',
              title: subject,
              message: `${title} — ${daysUntil === 0 ? "aujourd'hui" : daysUntil < 0 ? `dans ${Math.abs(daysUntil)} jour(s)` : `retard de ${daysUntil} jour(s)`}`,
              link: '/espace-client/planning',
              read: false,
              created_at: now,
              planner_id: plannerId,
              client_id: clientId,
              task_id: id,
            });
          }
        } catch (e) {
          console.warn('Unable to add step notification:', e);
        }

        results.push({
          id,
          title,
          clientId,
          clientName: name,
          clientEmail: email,
          clientUserId,
          plannerId,
          daysUntil,
          tier,
          status: 'sent',
        });
      } catch (e) {
        console.error('Error sending step reminder:', e);
        results.push({
          id,
          title,
          clientId,
          clientName: name,
          clientEmail: email,
          clientUserId,
          plannerId,
          daysUntil,
          tier,
          status: 'error',
        });
      }
    }

    return NextResponse.json({
      ok: true,
      date: now.toISOString(),
      checked: docs.length,
      sent: results.filter((r) => r.status === 'sent').length,
      dry_run: results.filter((r) => r.status === 'dry_run').length,
      skipped: results.filter((r) => r.status.startsWith('skipped')).length,
      errors: results.filter((r) => r.status === 'error').length,
      details: results,
    });
  } catch (e: any) {
    console.error('step-reminders cron error:', e);
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
