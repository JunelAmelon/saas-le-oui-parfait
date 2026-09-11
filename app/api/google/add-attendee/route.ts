import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
    if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    try {
      await adminAuth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
    }

    // Deprecated: vendor Google Calendar events are now created privately via
    // /api/google/sync-event so vendors never see each other and receive no
    // calendar notification. This endpoint is kept only to avoid breaking old
    // clients; it performs no action.
    return NextResponse.json({ ok: true, deprecated: true });
  } catch (e: any) {
    console.error('add-attendee error:', e);
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
