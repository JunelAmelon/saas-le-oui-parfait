import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { getStoredQontoTokens } from '@/lib/qonto-oauth';

export const runtime = 'nodejs';

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

    const stored = await getStoredQontoTokens(uid);
    if (!stored) {
      return NextResponse.json({ ok: true, connected: false, token: null });
    }

    return NextResponse.json({
      ok: true,
      connected: true,
      token: {
        expires_at: stored.expires_at,
        scope: stored.scope || null,
        token_type: stored.token_type || null,
        has_refresh_token: Boolean(stored.refresh_token),
        updated_at: stored.updated_at,
      },
    });
  } catch (e: any) {
    console.error('qonto token-info error:', e);
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
