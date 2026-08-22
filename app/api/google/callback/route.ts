import { NextResponse } from 'next/server';
import { getTokensFromCode } from '@/lib/google-calendar';
import { adminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(new URL('/espace-client?google_error=access_denied', req.url));
    }

    if (!code) {
      return NextResponse.json({ error: 'No code received' }, { status: 400 });
    }

    const userId = state;
    if (!userId) {
      return NextResponse.json({ error: 'No userId in state' }, { status: 400 });
    }

    const tokens = await getTokensFromCode(code);

    await adminDb.collection('google_tokens').doc(userId).set({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
      scope: tokens.scope,
      token_type: tokens.token_type,
      connected_at: new Date(),
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    return NextResponse.redirect(new URL('/espace-client?google_connected=true', baseUrl));
  } catch (e: any) {
    console.error('Google callback error:', e);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    return NextResponse.redirect(new URL(`/espace-client?google_error=${encodeURIComponent(e?.message || 'error')}`, baseUrl));
  }
}
