import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { sendEmailServer } from '@/lib/notifications.server';
import { buildReminderEmail, reminderDef, calculateFirstSendDate } from '@/lib/client-reminders';

export const runtime = 'nodejs';

function getAuthOk(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) return false;
  return auth.slice('Bearer '.length) === secret;
}

function toJsDate(v: any): Date | null {
  if (!v) return null;
  if (typeof v === 'string') {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (v.toDate) return v.toDate();
  if (v.seconds) return new Date(v.seconds * 1000);
  return null;
}

async function getClientInfo(clientId: string) {
  try {
    const snap = await adminDb.collection('clients').doc(clientId).get();
    if (!snap.exists) return null;
    const data = snap.data() as any;
    const email = data.email || data.client_email || null;
    const coupleNames =
      data.couple_names ||
      `${data.name || ''}${data.name && data.partner ? ' & ' : ''}${data.partner || ''}`.trim() ||
      data.name ||
      'Client';
    return {
      email,
      name: coupleNames,
      plannerId: data.planner_id || null,
      clientUserId: data.client_user_id || null,
      eventDate: data.event_date || null,
    };
  } catch {
    return null;
  }
}

async function getWeddingDate(clientId: string, fallback: string | null): Promise<Date | null> {
  try {
    const snap = await adminDb
      .collection('events')
      .where('client_id', '==', clientId)
      .limit(5)
      .get();
    const dates = snap.docs
      .map((d) => toJsDate((d.data() as any)?.event_date))
      .filter((d): d is Date => !!d)
      .sort((a, b) => a.getTime() - b.getTime());
    if (dates[0]) return dates[0];
  } catch {
    // fallback below
  }
  return toJsDate(fallback);
}

export async function GET(req: Request) {
  try {
    if (!getAuthOk(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const dryRun =
      url.searchParams.get('dry_run') === '1' ||
      process.env.DISABLE_CLIENT_REMINDER_EMAILS === 'true';

    const now = new Date();
    const baseUrl = (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://leouiparfait.fr').replace(/\/$/, '');

    const snap = await adminDb
      .collection('client_reminders')
      .where('active', '==', true)
      .get();

    const results: Array<{
      id: string;
      type: string;
      clientId: string;
      status: string;
    }> = [];

    for (const doc of snap.docs) {
      const data = doc.data() as any;
      const id = doc.id;
      const clientId = data.client_id;
      const type = data.type || 'tenue';
      const def = reminderDef(type);
      const label = data.label || def?.label || 'Rappel';

      const push = (status: string) =>
        results.push({ id, type, clientId: clientId || '', status });

      if (data.completed_at) {
        push('skipped_completed');
        continue;
      }
      if (!clientId) {
        push('skipped_no_client');
        continue;
      }

      const sentCount = Number(data.sent_count || 0);
      const maxSends = data.max_sends === null || data.max_sends === undefined
        ? def?.maxSends ?? null
        : Number(data.max_sends);
      if (maxSends !== null && sentCount >= maxSends) {
        await doc.ref.update({ active: false, finished_at: now.toISOString() });
        push('skipped_max_sends');
        continue;
      }

      const client = await getClientInfo(clientId);
      if (!client?.email) {
        push('skipped_no_email');
        continue;
      }

      const weddingDate = await getWeddingDate(clientId, client.eventDate);
      // Option B global : réaligne automatiquement le 1er envoi des rappels
      // par défaut non envoyés (sent_count=0) sur le rétroplanning mariage.
      if (def && sentCount === 0 && !data.completed_at && data.schedule_mode !== 'manual') {
        const expected = calculateFirstSendDate(def, weddingDate, now).toISOString();
        if (data.next_send_at !== expected) {
          await doc.ref.update({ next_send_at: expected, schedule_mode: 'wedding_based' });
          data.next_send_at = expected;
        }
      }

      const nextSendAt = toJsDate(data.next_send_at);
      if (!nextSendAt || nextSendAt > now) {
        push('skipped_not_due');
        continue;
      }

      // Mariage passé → on arrête les relances automatiquement
      if (weddingDate && weddingDate < now) {
        await doc.ref.update({
          active: false,
          completed_at: now.toISOString(),
          completed_by: 'auto_wedding_passed',
        });
        push('auto_completed_wedding_passed');
        continue;
      }

      const { subject, text } = buildReminderEmail(type, client.name, baseUrl, label);

      if (dryRun) {
        push('dry_run');
        continue;
      }

      try {
        await sendEmailServer({ to: client.email, subject, text });

        if (client.clientUserId) {
          try {
            await adminDb.collection('notifications').add({
              recipient_id: client.clientUserId,
              type: 'client_reminder',
              title: subject,
              message: `Rappel : ${label} — marquez l'étape comme bouclée dans votre espace pour arrêter les relances.`,
              link: '/espace-client',
              read: false,
              created_at: now,
              planner_id: client.plannerId,
              client_id: clientId,
              reminder_id: id,
            });
          } catch (e) {
            console.warn('Unable to add reminder notification:', e);
          }
        }

        const intervalDays = Number(data.interval_days || def?.intervalDays || 30);
        const next = new Date(now);
        next.setDate(next.getDate() + intervalDays);
        const reachedMax = maxSends !== null && sentCount + 1 >= maxSends;

        await doc.ref.update({
          sent_count: sentCount + 1,
          last_sent_at: now.toISOString(),
          next_send_at: next.toISOString(),
          ...(reachedMax ? { active: false, finished_at: now.toISOString() } : {}),
        });

        push('sent');
      } catch (e) {
        console.error('Error sending client reminder:', e);
        push('error');
      }
    }

    return NextResponse.json({
      ok: true,
      date: now.toISOString(),
      checked: snap.size,
      sent: results.filter((r) => r.status === 'sent').length,
      dry_run: results.filter((r) => r.status === 'dry_run').length,
      details: results,
    });
  } catch (e: any) {
    console.error('client-reminders cron error:', e);
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
