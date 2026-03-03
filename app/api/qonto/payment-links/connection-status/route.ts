import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { getValidQontoAccessToken, qontoOAuthRequest } from '@/lib/qonto-oauth';

export const runtime = 'nodejs';

function pickConnectionStatus(payload: any) {
  if (!payload) return { status: null, connection_location: null, raw: payload };
  if (Array.isArray(payload?.connections)) {
    const c = payload.connections[0] || null;
    return { status: c?.status || null, connection_location: c?.connection_location || null, raw: payload };
  }
  if (Array.isArray(payload)) {
    const c = payload[0] || null;
    return { status: c?.status || null, connection_location: c?.connection_location || null, raw: payload };
  }
  return {
    status: payload?.status || null,
    connection_location: payload?.connection_location || null,
    raw: payload,
  };
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
    if (!token) return NextResponse.json({ error: 'missing_auth' }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const profileSnap = await adminDb.collection('profiles').doc(uid).get();
    const role = String((profileSnap.data() as any)?.role || '');
    if (role !== 'planner') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    const { accessToken } = await getValidQontoAccessToken(uid);

    let payload: any;
    try {
      payload = await qontoOAuthRequest<any>({
        accessToken,
        path: '/v2/payment_links/connections',
        init: { method: 'GET' },
      });
    } catch (e: any) {
      const msg = String(e?.message || 'error');
      if (msg.includes('error 404') && msg.toLowerCase().includes('connection not found')) {
        return NextResponse.json({ ok: true, status: 'not_connected', connection_location: null, raw: null });
      }
      throw e;
    }

    const parsed = pickConnectionStatus(payload);

    return NextResponse.json({ ok: true, ...parsed });
  } catch (e: any) {
    console.error('qonto payment-links connection-status error:', e);
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
