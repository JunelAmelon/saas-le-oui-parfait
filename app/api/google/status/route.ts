import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Verify the caller is authenticated and matches the requested userId
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
    if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    try {
      const decoded = await adminAuth.verifyIdToken(token);
      if (decoded.uid !== userId) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
    }

    const tokenDoc = await adminDb.collection('google_tokens').doc(userId).get();
    const connected = tokenDoc.exists && !!(tokenDoc.data() as any)?.refresh_token;

    return NextResponse.json({ connected });
  } catch (e: any) {
    console.error('Google status error:', e);
    return NextResponse.json({ connected: false, error: e?.message }, { status: 200 });
  }
}
