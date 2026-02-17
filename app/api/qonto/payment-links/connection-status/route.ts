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

    // Payment Links endpoints require OAuth Bearer token.
    const integrationSnap = await adminDb.collection('integrations').doc('qonto').get();
    const integrationData = integrationSnap.exists ? (integrationSnap.data() as any) : null;
    const storedAccessToken = String(integrationData?.access_token || '').trim();
    if (!storedAccessToken) {
      return NextResponse.json(
        {
          error: 'qonto_payment_links_requires_oauth',
          details: 'OAuth access token missing. Run “Connect with Qonto” in this environment (prod vs local) and complete the consent flow.',
        },
        { status: 400 }
      );
    }

    const data = await qontoRequest<any>({ method: 'GET', path: '/v2/payment_links/connections' });

    const status = String(data?.status || '');
    const connectionLocation = String(data?.connection_location || data?.connectionLocation || '');

    return NextResponse.json({ ok: true, status: status || null, connection_location: connectionLocation || null, raw: data });
  } catch (e: any) {
    console.error('qonto payment-links connection-status error:', e);
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
