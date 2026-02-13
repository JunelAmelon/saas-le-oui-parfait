import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
    if (!token) return NextResponse.json({ error: 'missing_auth' }, { status: 401 });

    await adminAuth.verifyIdToken(token);

    const body = (await req.json()) as {
      recipientId?: string;
      title?: string;
      body?: string;
      link?: string;
    };

    const recipientId = String(body?.recipientId || '');
    const title = String(body?.title || 'Notification');
    const messageBody = String(body?.body || '');
    const link = body?.link ? String(body.link) : '';

    if (!recipientId) return NextResponse.json({ error: 'missing_recipient' }, { status: 400 });

    const tokenDoc = await adminDb.collection('push_tokens').doc(`user:${recipientId}`).get();
    const fcmToken = tokenDoc.exists ? (tokenDoc.data() as any)?.token : null;
    if (!fcmToken) return NextResponse.json({ ok: true, skipped: 'no_token' });

    const payload: admin.messaging.Message = {
      token: fcmToken,
      notification: {
        title,
        body: messageBody,
      },
      data: {
        link,
      },
    };

    const res = await admin.messaging().send(payload);
    return NextResponse.json({ ok: true, id: res });
  } catch (e: any) {
    console.error('push send error:', e);
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
