export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import crypto from 'node:crypto';

async function getRoleForUid(uid: string): Promise<'planner' | 'client' | null> {
  try {
    const snap = await adminDb.collection('profiles').doc(uid).get();
    const role = snap.exists ? (snap.data() as any)?.role : null;
    return role === 'planner' || role === 'client' ? role : null;
  } catch {
    return null;
  }
}

function mustEnv(name: string) {
  const v = (process.env[name] || '').trim();
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

function envAny(names: string[]) {
  for (const n of names) {
    const v = (process.env[n] || '').trim();
    if (v) return v;
  }
  return '';
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
    if (!token) return NextResponse.json({ error: 'missing_auth' }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as any;
    const overrideScopes = typeof body?.scopes === 'string' ? body.scopes.trim() : '';
    const dryRun = Boolean(body?.dryRun);

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const role = await getRoleForUid(uid);
    if (role !== 'planner') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    const oauthBaseRaw = mustEnv('QONTO_OAUTH_BASE_URL').trim();
    const oauthBase = new URL(oauthBaseRaw).origin.replace(/\/$/, '');
    const clientId = envAny(['QONTO_OAUTH_CLIENT_ID', 'QONTO_CLIENT_ID']);
    if (!clientId) throw new Error('Missing env var QONTO_OAUTH_CLIENT_ID (or QONTO_CLIENT_ID)');
    const redirectUri = envAny(['QONTO_OAUTH_REDIRECT_URI', 'QONTO_REDIRECT_URI']);
    if (!redirectUri) throw new Error('Missing env var QONTO_OAUTH_REDIRECT_URI (or QONTO_REDIRECT_URI)');
    const scopes = (overrideScopes || process.env.QONTO_OAUTH_SCOPES || 'offline_access payment_link.write organization.read').trim();
    const organizationIdRaw = envAny(['QONTO_OAUTH_ORGANIZATION_ID', 'QONTO_ORGANIZATION_ID']);
    const registrationIdRaw = envAny(['QONTO_OAUTH_REGISTRATION_ID', 'QONTO_REGISTRATION_ID']);
    const organizationId = organizationIdRaw && organizationIdRaw !== '...' ? organizationIdRaw : '';
    const registrationId = registrationIdRaw && registrationIdRaw !== '...' ? registrationIdRaw : '';

    // organization_id/registration_id are optional for many Payment Links OAuth flows.
    // If your Qonto sandbox enforces them, Qonto will return an explicit invalid_request on the consent page.

    const state = crypto.randomBytes(24).toString('hex');

    if (!dryRun) {
      await adminDb.collection('integrations').doc('qonto_oauth_state').set(
        {
          state,
          uid,
          created_at: new Date().toISOString(),
        },
        { merge: false }
      );
    }

    const url = new URL(`${oauthBase}/oauth2/auth`);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', scopes);
    url.searchParams.set('state', state);
    if (organizationId) url.searchParams.set('organization_id', organizationId);
    if (registrationId) url.searchParams.set('registration_id', registrationId);

    return NextResponse.json({ ok: true, url: url.toString(), scopes, dryRun });
  } catch (e: any) {
    console.error('qonto oauth start error:', e);
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
