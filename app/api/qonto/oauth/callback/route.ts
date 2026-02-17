export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

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

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const oauthError = url.searchParams.get('error');
    const oauthErrorDescription = url.searchParams.get('error_description');
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    const appBase = (url.origin || process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

    if (oauthError) {
      const redirectTo = `${appBase}/settings?tab=integrations&qonto_oauth_error=${encodeURIComponent(oauthError)}${
        oauthErrorDescription ? `&qonto_oauth_error_description=${encodeURIComponent(oauthErrorDescription)}` : ''
      }`;
      return NextResponse.redirect(redirectTo);
    }

    if (!code || !state) {
      const redirectTo = `${appBase}/settings?tab=integrations&qonto_oauth_error=${encodeURIComponent('missing_code_or_state')}`;
      return NextResponse.redirect(redirectTo);
    }

    const stateDoc = await adminDb.collection('integrations').doc('qonto_oauth_state').get();
    const stored = stateDoc.exists ? (stateDoc.data() as any) : null;
    if (!stored?.state || stored.state !== state) {
      return NextResponse.json({ error: 'invalid_state' }, { status: 400 });
    }

    const oauthBaseRaw = mustEnv('QONTO_OAUTH_BASE_URL').trim();
    const oauthBaseOrigin = new URL(oauthBaseRaw).origin.replace(/\/$/, '');
    const tokenUrl = `${oauthBaseOrigin}/oauth2/token`;

    const clientId = envAny(['QONTO_OAUTH_CLIENT_ID', 'QONTO_CLIENT_ID']);
    if (!clientId) throw new Error('Missing env var QONTO_OAUTH_CLIENT_ID (or QONTO_CLIENT_ID)');
    const clientSecret = envAny(['QONTO_OAUTH_CLIENT_SECRET', 'QONTO_CLIENT_SECRET']);
    if (!clientSecret) throw new Error('Missing env var QONTO_OAUTH_CLIENT_SECRET (or QONTO_CLIENT_SECRET)');
    const redirectUri = envAny(['QONTO_OAUTH_REDIRECT_URI', 'QONTO_REDIRECT_URI']);
    if (!redirectUri) throw new Error('Missing env var QONTO_OAUTH_REDIRECT_URI (or QONTO_REDIRECT_URI)');

    const stagingToken = (process.env.QONTO_STAGING_TOKEN || process.env.X_QONTO_STAGING_TOKEN || '').trim();
    const isSandboxLike = /sandbox|staging/i.test(oauthBaseOrigin);

    const form = new URLSearchParams();
    form.set('grant_type', 'authorization_code');
    form.set('client_id', clientId);
    form.set('client_secret', clientSecret);
    form.set('code', code);
    form.set('redirect_uri', redirectUri);

    const resp = await fetch(tokenUrl, {
      method: 'POST',
      redirect: 'manual',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        ...(stagingToken && isSandboxLike ? { 'X-Qonto-Staging-Token': stagingToken } : {}),
      },
      body: form.toString(),
    });

    if (resp.status >= 300 && resp.status < 400) {
      const loc = resp.headers.get('location') || '';
      const redirectTo = `${appBase}/settings?tab=integrations&qonto_oauth_error=${encodeURIComponent('token_exchange_redirected')}&qonto_oauth_error_description=${encodeURIComponent(`status_${resp.status} location_${loc || 'missing'}`)}`;
      return NextResponse.redirect(redirectTo);
    }

    const text = await resp.text();

    // Qonto sandbox can sometimes return an HTML maintenance page instead of JSON.
    if (/^\s*<!doctype\s+html/i.test(text) && /improving the performance|account isn't available/i.test(text)) {
      const redirectTo = `${appBase}/settings?tab=integrations&qonto_oauth_error=${encodeURIComponent('qonto_maintenance')}&qonto_oauth_error_description=${encodeURIComponent('Qonto sandbox indisponible (maintenance). Réessaie dans quelques minutes.')}`;
      return NextResponse.redirect(redirectTo);
    }

    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      // ignore
    }

    if (!resp.ok) {
      const msg = (json && (json.error_description || json.error || json.message)) || text || `http_${resp.status}`;
      const redirectTo = `${appBase}/settings?tab=integrations&qonto_oauth_error=${encodeURIComponent('token_exchange_failed')}&qonto_oauth_error_description=${encodeURIComponent(msg)}`;
      return NextResponse.redirect(redirectTo);
    }

    const accessToken = String(json?.access_token || '');
    const refreshToken = String(json?.refresh_token || '');
    const scope = String(json?.scope || '');
    const expiresIn = Number(json?.expires_in || 0);

    if (!json) {
      const snippet = (text || '').slice(0, 400);
      const redirectTo = `${appBase}/settings?tab=integrations&qonto_oauth_error=${encodeURIComponent('token_exchange_non_json')}&qonto_oauth_error_description=${encodeURIComponent(snippet || 'empty_response')}`;
      return NextResponse.redirect(redirectTo);
    }

    if (!accessToken) {
      const details = JSON.stringify(json).slice(0, 600);
      const redirectTo = `${appBase}/settings?tab=integrations&qonto_oauth_error=${encodeURIComponent('missing_access_token')}&qonto_oauth_error_description=${encodeURIComponent(details)}`;
      return NextResponse.redirect(redirectTo);
    }

    await adminDb.collection('integrations').doc('qonto').set(
      {
        provider: 'qonto',
        environment: oauthBaseOrigin.includes('sandbox') ? 'sandbox' : 'production',
        access_token: accessToken,
        refresh_token: refreshToken || null,
        scope,
        expires_in: expiresIn || null,
        obtained_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    );

    // Cleanup state
    try {
      await adminDb.collection('integrations').doc('qonto_oauth_state').delete();
    } catch {
      // ignore
    }

    const redirectTo = `${appBase}/factures`;

    return NextResponse.redirect(redirectTo);
  } catch (e: any) {
    console.error('qonto oauth callback error:', e);
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
