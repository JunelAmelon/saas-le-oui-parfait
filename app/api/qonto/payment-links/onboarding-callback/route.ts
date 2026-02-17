export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const appBase = (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
  const redirectTo = `${appBase}/settings?tab=integrations${status ? `&qonto_onboarding_status=${encodeURIComponent(status)}` : ''}`;
  return NextResponse.redirect(redirectTo);
}
