import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

function mask(v: string, keepStart = 4, keepEnd = 2) {
  const s = String(v || '');
  if (!s) return null;
  if (s.length <= keepStart + keepEnd) return '*'.repeat(Math.max(0, s.length));
  return `${s.slice(0, keepStart)}***${s.slice(-keepEnd)}`;
}

function normalize(v: string | undefined) {
  if (!v) return '';
  const trimmed = String(v).trim();
  const unquoted = trimmed.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
  return unquoted.trim();
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

    const qontoEnv = normalize(process.env.QONTO_ENV);
    const clientId = normalize(process.env.QONTO_OAUTH_CLIENT_ID);
    const clientSecret = normalize(process.env.QONTO_OAUTH_CLIENT_SECRET);
    const redirectUri = normalize(process.env.QONTO_OAUTH_REDIRECT_URI);
    const scope = normalize(process.env.QONTO_OAUTH_SCOPE);

    const oauthBase = qontoEnv === 'sandbox' ? 'https://oauth-sandbox.staging.qonto.co' : 'https://oauth.qonto.com';

    return NextResponse.json({
      ok: true,
      env: {
        QONTO_ENV: qontoEnv || null,
        oauth_base: oauthBase,
        QONTO_OAUTH_REDIRECT_URI: redirectUri || null,
        QONTO_OAUTH_SCOPE: scope || null,
        QONTO_OAUTH_CLIENT_ID_present: Boolean(clientId),
        QONTO_OAUTH_CLIENT_ID_masked: mask(clientId, 6, 2),
        QONTO_OAUTH_CLIENT_ID_length: clientId.length,
        QONTO_OAUTH_CLIENT_SECRET_present: Boolean(clientSecret),
        QONTO_OAUTH_CLIENT_SECRET_masked: mask(clientSecret, 3, 2),
        QONTO_OAUTH_CLIENT_SECRET_length: clientSecret.length,
      },
    });
  } catch (e: any) {
    console.error('qonto oauth debug error:', e);
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
