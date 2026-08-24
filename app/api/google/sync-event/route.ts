import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { getValidCalendarClient, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, CalendarEventInput } from '@/lib/google-calendar';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    // Verify authentication
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
    const { action, userId, eventId, event } = body as {
      action: 'create' | 'update' | 'delete';
      userId: string;
      eventId?: string;
      event?: CalendarEventInput;
    };

    if (!userId || !action) {
      return NextResponse.json({ error: 'userId and action are required' }, { status: 400 });
    }

    // Only the authenticated user can sync their own calendar
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

    if (action === 'create' && event) {
      const googleEventId = await createCalendarEvent(calendar, event);
      return NextResponse.json({ ok: true, googleEventId });
    }

    if (action === 'update' && event) {
      if (eventId) {
        try {
          await updateCalendarEvent(calendar, eventId, event);
          return NextResponse.json({ ok: true, googleEventId: eventId });
        } catch (updateErr: any) {
          // Event might have been deleted from Google — fall back to create
          console.warn('Update failed, trying create:', updateErr?.message || updateErr);
          const googleEventId = await createCalendarEvent(calendar, event);
          return NextResponse.json({ ok: true, googleEventId });
        }
      } else {
        const googleEventId = await createCalendarEvent(calendar, event);
        return NextResponse.json({ ok: true, googleEventId });
      }
    }

    if (action === 'delete' && eventId) {
      await deleteCalendarEvent(calendar, eventId);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Invalid action or missing parameters' }, { status: 400 });
  } catch (e: any) {
    console.error('Google sync-event error:', e);
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
