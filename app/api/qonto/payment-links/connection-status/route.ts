export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { qontoRequest } from '@/lib/qonto';

async function getRoleForUid(uid: string): Promise<'planner' | 'client' | null> {
  try {
    const snap = await adminDb.collection('profiles').doc(uid).get();
    const role = snap.exists ? (snap.data() as any)?.role : null;
    return role === 'planner' || role === 'client' ? role : null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
    if (!token) return NextResponse.json({ error: 'missing_auth' }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const role = await getRoleForUid(uid);
    if (role !== 'planner') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    let data: any;
    try {
      data = await qontoRequest<any>({ method: 'GET', path: '/v2/payment_links/connections' });
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg.includes('Missing Qonto env vars (QONTO_API_LOGIN/QONTO_API_SECRET_KEY)')) {
        return NextResponse.json(
          {
            error: 'qonto_payment_links_requires_oauth',
            details: 'OAuth access token missing. Click "Connect with Qonto" and complete the consent flow.',
          },
          { status: 400 }
        );
      }
      throw e;
    }

    const status = String(data?.status || '');
    const connectionLocation = String(data?.connection_location || data?.connectionLocation || '');

    return NextResponse.json({ ok: true, status: status || null, connection_location: connectionLocation || null, raw: data });
  } catch (e: any) {
    console.error('qonto payment-links connection-status error:', e);
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
