import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { buildQontoAuthorizeUrl } from '@/lib/qonto-oauth';

export const runtime = 'nodejs';

function randomState() {
  // Enough for CSRF state
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

function resolveRedirectUri(req: Request) {
  const explicit = process.env.QONTO_OAUTH_REDIRECT_URI;
  if (explicit) return String(explicit).trim();
  const url = new URL(req.url);
  return `${url.origin}/api/qonto/oauth/callback`;
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

    const redirectUri = resolveRedirectUri(req);

    // Include planner UID to retrieve integration doc in callback.
    const state = `${uid}.${randomState()}`;
    const scope = String(
      process.env.QONTO_OAUTH_SCOPE || 'offline_access organization.read payment_link.read payment_link.write'
    );

    await adminDb
      .collection('integrations')
      .doc(uid)
      .set(
        {
          qonto_oauth_state: state,
          qonto_oauth_state_created_at: new Date().toISOString(),
          qonto_oauth_redirect_uri: redirectUri,
        },
        { merge: true }
      );

    const url = buildQontoAuthorizeUrl({ redirectUri, state, scope });

    return NextResponse.json({ ok: true, url });
  } catch (e: any) {
    console.error('qonto oauth start error:', e);
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
