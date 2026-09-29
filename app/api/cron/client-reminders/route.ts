import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { sendEmailServer } from '@/lib/notifications.server';
import {
  buildReminderEmail,
  buildReminderNotification,
  reminderDef,
  calculateScheduledSendDate,
} from '@/lib/client-reminders';

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
    const firstNames = [data.partner1_first_name, data.partner2_first_name]
      .map((x) => String(x || '').trim())
      .filter(Boolean)
      .join(' & ');
    const coupleNames =
      firstNames ||
      data.couple_names ||
      `${data.name || ''}${data.name && data.partner ? ' & ' : ''}${data.partner || ''}`.trim() ||
      data.name ||
      'Client';
    const plannerId = data.planner_id || null;
    let plannerName = 'Votre wedding planner';
    if (plannerId) {
      try {
        const plannerSnap = await adminDb.collection('profiles').doc(plannerId).get();
        const plannerData = plannerSnap.exists ? (plannerSnap.data() as any) : null;
        plannerName = plannerData?.full_name || plannerData?.displayName || plannerData?.email || plannerName;
      } catch {
        // fallback below
      }
    }

    return {
      email,
      name: coupleNames,
      plannerId,
      plannerName,
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

      // Synchronise les anciens rappels par défaut avec la configuration actuelle,
      // sans toucher aux rappels modifiés manuellement.
      if (def && data.schedule_mode !== 'manual') {
        const configUpdates: Record<string, any> = {};
        if (data.label !== def.label) configUpdates.label = def.label;
        if (Number(data.interval_days || 0) !== def.intervalDays) configUpdates.interval_days = def.intervalDays;
        if (data.max_sends !== def.maxSends) configUpdates.max_sends = def.maxSends;
        if (data.schedule_mode !== 'wedding_based') configUpdates.schedule_mode = 'wedding_based';
        if (Object.keys(configUpdates).length > 0) {
          await doc.ref.update(configUpdates);
          Object.assign(data, configUpdates);
        }
      }

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

      // Mariage passé → on arrête les relances automatiquement avant toute autre logique.
      if (weddingDate && weddingDate < now) {
        await doc.ref.update({
          active: false,
          completed_at: now.toISOString(),
          completed_by: 'auto_wedding_passed',
        });
        push('auto_completed_wedding_passed');
        continue;
      }

      // Option B global : chaque envoi par défaut suit le rétroplanning du mariage.
      // sent_count=0 → mail d'information, sent_count=1 → relance.
      if (def && weddingDate && !data.completed_at && data.schedule_mode !== 'manual') {
        const expected = calculateScheduledSendDate(def, weddingDate, sentCount, now).toISOString();
        if (data.next_send_at !== expected) {
          await doc.ref.update({ next_send_at: expected, schedule_mode: 'wedding_based' });
          data.next_send_at = expected;
        }
      } else if (def && !data.next_send_at && data.schedule_mode !== 'manual') {
        const fallback = new Date(now);
        fallback.setDate(fallback.getDate() + def.intervalDays);
        await doc.ref.update({ next_send_at: fallback.toISOString(), schedule_mode: 'wedding_based' });
        data.next_send_at = fallback.toISOString();
      }

      const nextSendAt = toJsDate(data.next_send_at);
      if (!nextSendAt || nextSendAt > now) {
        push('skipped_not_due');
        continue;
      }

      const daysRemaining = weddingDate
        ? Math.max(0, Math.ceil((weddingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        : null;
      const { subject, text } = buildReminderEmail(type, client.name, baseUrl, {
        sendIndex: sentCount,
        plannerName: client.plannerName,
        daysRemaining,
        customLabel: label,
      });
      const notification = buildReminderNotification(type, label, {
        sendIndex: sentCount,
        plannerName: client.plannerName,
        daysRemaining,
        customLabel: label,
      });

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
              title: notification.title,
              message: notification.message,
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
        const reachedMax = maxSends !== null && sentCount + 1 >= maxSends;
        const next =
          def && weddingDate && !reachedMax
            ? calculateScheduledSendDate(def, weddingDate, sentCount + 1, now)
            : (() => {
                const d = new Date(now);
                d.setDate(d.getDate() + intervalDays);
                return d;
              })();

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
