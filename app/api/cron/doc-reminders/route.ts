import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { sendEmailServer } from '@/lib/notifications.server';
import { buildClientDocReminderEmail, buildPlannerDocReminderEmail } from '@/lib/doc-reminders';

export const runtime = 'nodejs';

// Nombre de jours avant d'envoyer un rappel pour un document non ouvert.
const REMINDER_AFTER_DAYS = 5;

const toMillis = (v: any): number => {
  if (!v) return 0;
  if (v?.toDate) return v.toDate().getTime();
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
};

async function getUserEmail(uid: string | undefined | null): Promise<string | null> {
  if (!uid) return null;
  try {
    const { adminAuth } = await import('@/lib/firebase-admin');
    const u = await adminAuth.getUser(uid);
    return u.email || null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization') || '';
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: any[] = [];
  const cutoff = Date.now() - REMINDER_AFTER_DAYS * 24 * 60 * 60 * 1000;

  try {
    // Documents suivis, jamais ouverts, sans rappel deja envoye.
    // Les docs legacy sont exclus via opened_by === 'legacy' / opened_at present.
    const snap = await adminDb.collection('documents').where('view_tracked', '==', true).get();

    const stale = snap.docs.filter((d) => {
      const data = d.data() as any;
      if (data.opened_at) return false;
      if (data.opened_by === 'legacy') return false;
      if (data.reminder_sent_at) return false;
      const created = toMillis(data.created_timestamp) || toMillis(data.uploaded_at);
      return created > 0 && created <= cutoff;
    });

    for (const docSnap of stale) {
      const doc = docSnap.data() as any;
      const docName = String(doc.name || 'Document');
      const clientId = doc.client_id;
      const plannerId = doc.planner_id;
      if (!clientId || !plannerId) {
        results.push({ id: docSnap.id, skipped: 'missing client_id or planner_id' });
        continue;
      }

      try {
        const clientSnap = await adminDb.collection('clients').doc(String(clientId)).get();
        const client = clientSnap.exists ? (clientSnap.data() as any) : null;
        const coupleName = `${client?.name || ''}${client?.partner ? ' & ' + client.partner : ''}`.trim() || 'le couple';
        const clientUserId = client?.client_user_id || null;

        // Nom reel du planner (ex. "Kathy") : profiles > Auth displayName > agence.
        let plannerName = 'Le Oui Parfait';
        try {
          const profileSnap = await adminDb.collection('profiles').doc(String(plannerId)).get();
          const profile = profileSnap.exists ? (profileSnap.data() as any) : null;
          plannerName =
            String(profile?.full_name || profile?.name || profile?.display_name || '').trim() ||
            plannerName;
        } catch { /* non-blocking */ }

        // 1. Planner : notif in-app + email
        const plannerEmailCtx = { docName, coupleName, plannerName };
        try {
          await adminDb.collection('notifications').add({
            recipient_id: plannerId,
            type: 'document',
            title: 'Document non consulté',
            message: `${docName} · ${coupleName} : pas ouvert depuis ${REMINDER_AFTER_DAYS} jours`,
            link: `/documents?clientId=${clientId}`,
            read: false,
            created_at: new Date(),
            planner_id: plannerId,
            client_id: clientId,
          });
        } catch (e) {
          console.error('doc-reminders planner notif error:', e);
        }

        const plannerEmail = await getUserEmail(plannerId);
        if (plannerEmail) {
          const { subject, text } = buildPlannerDocReminderEmail(plannerEmailCtx);
          try {
            await sendEmailServer({ to: plannerEmail, subject, text });
          } catch (e) {
            console.error('doc-reminders planner email error:', e);
          }
        }

        // 2. Couple : notif in-app + email
        if (clientUserId) {
          try {
            await adminDb.collection('notifications').add({
              recipient_id: clientUserId,
              type: 'document',
              title: 'Rappel : document à consulter',
              message: `${docName} vous attend dans votre espace client`,
              link: '/espace-client/documents',
              read: false,
              created_at: new Date(),
              planner_id: plannerId,
              client_id: clientId,
            });
          } catch (e) {
            console.error('doc-reminders client notif error:', e);
          }

          const clientEmail = client?.email || (await getUserEmail(clientUserId));
          if (clientEmail) {
            const { subject, text } = buildClientDocReminderEmail(plannerEmailCtx);
            try {
              await sendEmailServer({ to: clientEmail, subject, text });
            } catch (e) {
              console.error('doc-reminders client email error:', e);
            }
          }
        }

        await adminDb.collection('documents').doc(docSnap.id).update({
          reminder_sent_at: new Date(),
        });
        results.push({ id: docSnap.id, reminded: true, couple: coupleName });
      } catch (e) {
        console.error(`doc-reminders error for ${docSnap.id}:`, e);
        results.push({ id: docSnap.id, error: 'processing_failed' });
      }
    }

    return NextResponse.json({ ok: true, processed: results.length, results });
  } catch (e) {
    console.error('doc-reminders fatal error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
