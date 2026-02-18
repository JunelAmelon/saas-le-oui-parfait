import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { qontoRequest } from '@/lib/qonto';

export const runtime = 'nodejs';

function mask(v: string, keepStart = 3, keepEnd = 2) {
  const s = String(v || '');
  if (s.length <= keepStart + keepEnd) return '*'.repeat(Math.max(0, s.length));
  return `${s.slice(0, keepStart)}***${s.slice(-keepEnd)}`;
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
    if (!token) return NextResponse.json({ error: 'missing_auth' }, { status: 401 });

    await adminAuth.verifyIdToken(token);

    const login = process.env.QONTO_API_LOGIN || process.env.QONTO_LOGIN || '';
    const secret = process.env.QONTO_API_SECRET || process.env.QONTO_SECRET || '';
    const staging = process.env.X_QONTO_STAGING_TOKEN || process.env.QONTO_STAGING_TOKEN || '';

    // Try a harmless call to confirm auth works
    let qontoStatus: { ok: boolean; error?: string } = { ok: false };
    try {
      await qontoRequest('/v2/organization', { method: 'GET' });
      qontoStatus = { ok: true };
    } catch (e: any) {
      qontoStatus = { ok: false, error: String(e?.message || e) };
    }

    return NextResponse.json({
      env: {
        QONTO_API_LOGIN_present: Boolean(login),
        QONTO_API_LOGIN_masked: login ? mask(login, 6, 2) : null,
        QONTO_API_LOGIN_length: login ? login.trim().length : 0,

        QONTO_API_SECRET_present: Boolean(secret),
        QONTO_API_SECRET_masked: secret ? mask(secret, 3, 2) : null,
        QONTO_API_SECRET_length: secret ? secret.trim().length : 0,

        X_QONTO_STAGING_TOKEN_present: Boolean(staging),
        X_QONTO_STAGING_TOKEN_masked: staging ? mask(staging, 4, 2) : null,
        X_QONTO_STAGING_TOKEN_length: staging ? staging.trim().length : 0,
      },
      qonto: qontoStatus,
    });
  } catch (e: any) {
    console.error('qonto debug error:', e);
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
