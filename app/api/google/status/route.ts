import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const tokenDoc = await adminDb.collection('google_tokens').doc(userId).get();
    const connected = tokenDoc.exists && !!(tokenDoc.data() as any)?.refresh_token;

    return NextResponse.json({ connected });
  } catch (e: any) {
    console.error('Google status error:', e);
    return NextResponse.json({ connected: false, error: e?.message }, { status: 200 });
  }
}
