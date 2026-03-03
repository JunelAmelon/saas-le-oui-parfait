import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  // Qonto redirects here after the payment links provider onboarding.
  // We keep it minimal and redirect back to /agence with query params.
  const url = new URL(req.url);
  const redirectAfter = process.env.QONTO_OAUTH_AFTER_CONNECT_URL || `${url.origin}/agence`;

  try {
    const next = new URL(redirectAfter);
    // Preserve any useful query params from Qonto for troubleshooting
    url.searchParams.forEach((v, k) => {
      if (String(k).toLowerCase().includes('token')) return;
      next.searchParams.set(`qonto_pl_${k}`, String(v));
    });
    next.searchParams.set('qonto_pl', 'callback');
    return NextResponse.redirect(next.toString());
  } catch {
    return NextResponse.json({ ok: true });
  }
}
