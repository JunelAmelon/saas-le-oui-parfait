import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { getValidCalendarClient, addAttendeesToCalendarEvent } from '@/lib/google-calendar';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
    if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    let decodedUid: string;
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      decodedUid = decoded.uid;
    } catch {
      return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
    }

    const body = await req.json();
    const { userId, eventId, attendeeEmails } = body as {
      userId: string;
      eventId: string;
      attendeeEmails: string[];
    };

    if (!userId || !eventId || !attendeeEmails?.length) {
      return NextResponse.json({ error: 'userId, eventId and attendeeEmails are required' }, { status: 400 });
    }

    if (decodedUid !== userId) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const tokenDoc = await adminDb.collection('google_tokens').doc(userId).get();
    if (!tokenDoc.exists) {
      return NextResponse.json({ error: 'Google Calendar not connected' }, { status: 400 });
    }

    const tokenData = tokenDoc.data() as any;
    if (!tokenData.refresh_token) {
      return NextResponse.json({ error: 'No refresh token — reconnection needed' }, { status: 400 });
    }

    const calendar = await getValidCalendarClient(
      tokenData.refresh_token,
      tokenData.access_token,
      tokenData.expiry_date,
    );

    await addAttendeesToCalendarEvent(calendar, eventId, attendeeEmails);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('add-attendee error:', e);
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
