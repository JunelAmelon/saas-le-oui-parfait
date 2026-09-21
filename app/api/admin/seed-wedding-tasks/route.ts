import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getWeddingTaskPayloads } from '@/lib/wedding-tasks';

export const runtime = 'nodejs';

function getAuthOk(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) return false;
  return auth.slice('Bearer '.length) === secret;
}

export async function GET(req: Request) {
  try {
    if (!getAuthOk(req)) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const dryRun = url.searchParams.get('dry_run') === '1';

    const clientsSnap = await adminDb.collection('clients').get();
    const results: Array<{
      clientId: string;
      clientName: string;
      status: 'skipped_no_event' | 'skipped_already_seeded' | 'skipped_no_date' | 'skipped_past' | 'seeded' | 'error';
      tasksAdded?: number;
      error?: string;
    }> = [];

    for (const clientDoc of clientsSnap.docs) {
      const client = clientDoc.data() as any;
      const clientId = clientDoc.id;
      const clientName = client.couple_names || `${client.name || ''} & ${client.partner || ''}`.trim() || 'Client';

      const eventsSnap = await adminDb
        .collection('events')
        .where('client_id', '==', clientId)
        .limit(1)
        .get();

      if (eventsSnap.empty) {
        results.push({ clientId, clientName, status: 'skipped_no_event' });
        continue;
      }

      const ev = eventsSnap.docs[0];
      const eventDate = ev.data().event_date;
      if (!eventDate) {
        results.push({ clientId, clientName, status: 'skipped_no_date' });
        continue;
      }

      const weddingDate = new Date(eventDate + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (!Number.isNaN(weddingDate.getTime()) && weddingDate < today) {
        results.push({ clientId, clientName, status: 'skipped_past' });
        continue;
      }

      const existingSnap = await adminDb
        .collection('tasks')
        .where('client_id', '==', clientId)
        .get();

      const alreadySeeded = existingSnap.docs.some((d) => (d.data() as any).auto_generated);
      if (alreadySeeded) {
        results.push({ clientId, clientName, status: 'skipped_already_seeded' });
        continue;
      }

      try {
        const plannerId = client.planner_id || ev.data().planner_id || '';
        const payloads = getWeddingTaskPayloads(clientId, plannerId, ev.id, eventDate);

        if (dryRun) {
          results.push({
            clientId,
            clientName,
            status: 'seeded',
            tasksAdded: payloads.length,
          });
          continue;
        }

        let added = 0;
        for (const task of payloads) {
          await adminDb.collection('tasks').add(task);
          added++;
        }

        results.push({
          clientId,
          clientName,
          status: 'seeded',
          tasksAdded: added,
        });
      } catch (e: any) {
        results.push({
          clientId,
          clientName,
          status: 'error',
          error: e?.message || String(e),
        });
      }
    }

    return NextResponse.json({
      ok: true,
      dry_run: dryRun,
      total: clientsSnap.size,
      seeded: results.filter((r) => r.status === 'seeded').length,
      skipped: results.filter((r) => r.status.startsWith('skipped')).length,
      errors: results.filter((r) => r.status === 'error').length,
      details: results,
    });
  } catch (e: any) {
    console.error('seed-wedding-tasks error:', e);
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
