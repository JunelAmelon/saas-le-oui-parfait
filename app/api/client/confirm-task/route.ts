import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

function toIsoDate(d: Date) {
  return d.toISOString();
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.slice('Bearer '.length);
    let decoded: { uid: string };
    try {
      decoded = await adminAuth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json({ error: 'invalid-token' }, { status: 401 });
    }

    const { clientId, taskId, confirmed } = await req.json();
    if (!clientId || !taskId || typeof confirmed !== 'boolean') {
      return NextResponse.json({ error: 'bad-request' }, { status: 400 });
    }

    const clientSnap = await adminDb.collection('clients').doc(clientId).get();
    if (!clientSnap.exists) {
      return NextResponse.json({ error: 'client-not-found' }, { status: 404 });
    }
    const client = clientSnap.data() as any;
    if (client.client_user_id !== decoded.uid) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const taskSnap = await adminDb.collection('tasks').doc(taskId).get();
    if (!taskSnap.exists) {
      return NextResponse.json({ error: 'task-not-found' }, { status: 404 });
    }
    const task = taskSnap.data() as any;
    if (task.client_id !== clientId) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const now = new Date();
    const update: Record<string, any> = {
      client_confirmed: confirmed,
      client_confirmed_at: confirmed ? toIsoDate(now) : null,
      updated_at: toIsoDate(now),
    };

    await adminDb.collection('tasks').doc(taskId).update(update);

    const plannerId = task.planner_id || client.planner_id;
    if (plannerId) {
      try {
        await adminDb.collection('notifications').add({
          recipient_id: plannerId,
          type: 'step_client_confirmed',
          title: confirmed ? 'Étape validée par le couple' : 'Validation annulée par le couple',
          message: `${client.couple_names || client.name || 'Un couple'} a ${confirmed ? 'validé' : 'annulé'} l'étape "${task.title}".`,
          link: `/admin/clients/${clientId}/etapes`,
          read: false,
          created_at: toIsoDate(now),
          client_id: clientId,
          task_id: taskId,
        });
      } catch (e) {
        console.warn('Unable to notify planner:', e);
      }
    }

    return NextResponse.json({ ok: true, confirmed });
  } catch (e: any) {
    console.error('confirm-task error:', e);
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
