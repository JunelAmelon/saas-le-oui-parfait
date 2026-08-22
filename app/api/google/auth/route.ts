import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/google-calendar';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const authUrl = getAuthUrl(userId);
    return NextResponse.redirect(authUrl);
  } catch (e: any) {
    console.error('Google auth error:', e);
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
