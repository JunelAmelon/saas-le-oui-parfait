import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { exchangeAuthorizationCode, storeQontoTokens } from '@/lib/qonto-oauth';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const code = String(url.searchParams.get('code') || '').trim();
    const state = String(url.searchParams.get('state') || '').trim();
    const oauthError = String(url.searchParams.get('error') || '').trim();
    const oauthErrorDescription = String(url.searchParams.get('error_description') || '').trim();

    const redirectAfter = process.env.QONTO_OAUTH_AFTER_CONNECT_URL;

    if (oauthError) {
      if (redirectAfter) {
        const next = new URL(redirectAfter);
        next.searchParams.set('qonto_oauth', 'error');
        next.searchParams.set('error', oauthError);
        if (oauthErrorDescription) next.searchParams.set('error_description', oauthErrorDescription);
        return NextResponse.redirect(next.toString());
      }

      return NextResponse.json(
        { error: 'oauth_error', oauth_error: oauthError, oauth_error_description: oauthErrorDescription || null },
        { status: 400 }
      );
    }

    if (!code || !state) {
      if (redirectAfter) {
        const next = new URL(redirectAfter);
        next.searchParams.set('qonto_oauth', 'error');
        next.searchParams.set('error', 'missing_code_or_state');
        return NextResponse.redirect(next.toString());
      }

      return NextResponse.json({ error: 'missing_code_or_state' }, { status: 400 });
    }

    const plannerId = state.split('.')[0];
    if (!plannerId) return NextResponse.json({ error: 'invalid_state' }, { status: 400 });

    const integrationRef = adminDb.collection('integrations').doc(plannerId);
    const snap = await integrationRef.get();
    const expectedState = String((snap.data() as any)?.qonto_oauth_state || '').trim();
    const redirectUri = String((snap.data() as any)?.qonto_oauth_redirect_uri || '').trim();

    if (!expectedState || expectedState !== state) {
      return NextResponse.json({ error: 'state_mismatch' }, { status: 400 });
    }
    if (!redirectUri) {
      return NextResponse.json({ error: 'missing_redirect_uri' }, { status: 400 });
    }

    const tokens = await exchangeAuthorizationCode({ code, redirectUri });

    await storeQontoTokens(plannerId, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_at,
      scope: tokens.scope,
      token_type: tokens.token_type,
    });

    await integrationRef.set(
      {
        qonto_oauth_connected_at: new Date().toISOString(),
        qonto_oauth_state: null,
      },
      { merge: true }
    );

    // Simple UX: redirect back to app settings if configured, else show JSON.
    if (redirectAfter) {
      const next = new URL(redirectAfter);
      next.searchParams.set('qonto_oauth', 'connected');
      return NextResponse.redirect(next.toString());
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('qonto oauth callback error:', e);
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
