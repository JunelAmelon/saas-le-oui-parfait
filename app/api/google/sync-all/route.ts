import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { getValidCalendarClient, createCalendarEvent, updateCalendarEvent, CalendarEventInput } from '@/lib/google-calendar';

export const runtime = 'nodejs';

function addOneDay(dateStr: string): string {
  if (!dateStr) return dateStr;
  const d = new Date(dateStr + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return dateStr;
  d.setDate(d.getDate() + 1);
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function buildWeddingEvent(params: {
  coupleNames: string;
  eventDate: string;
  location?: string;
  clientEmail?: string;
  phone?: string;
  guestCount?: number;
  notes?: string;
}): CalendarEventInput {
  const { coupleNames, eventDate, location, clientEmail, phone, guestCount, notes } = params;
  const descParts: string[] = [];
  if (phone) descParts.push(`Téléphone: ${phone}`);
  if (guestCount) descParts.push(`Invités: ${guestCount}`);
  if (notes) descParts.push(`Notes: ${notes}`);
  descParts.push('— Le Oui Parfait');
  return {
    summary: `Mariage ${coupleNames}`,
    description: descParts.join('\n'),
    startDate: eventDate,
    endDate: addOneDay(eventDate),
    location: location || undefined,
  };
}

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

    const tokenDoc = await adminDb.collection('google_tokens').doc(decodedUid).get();
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

    // Fetch all events for this planner
    const eventsSnap = await adminDb.collection('events')
      .where('planner_id', '==', decodedUid)
      .get();

    const clientsSnap = await adminDb.collection('clients')
      .where('planner_id', '==', decodedUid)
      .get();

    const clientMap = new Map<string, any>();
    clientsSnap.forEach((doc) => {
      clientMap.set(doc.id, { id: doc.id, ...doc.data() });
    });

    let synced = 0;
    let skipped = 0;
    let errors = 0;
    const results: Array<{ clientId: string; status: string; googleEventId?: string }> = [];

    for (const eventDoc of eventsSnap.docs) {
      const ev = eventDoc.data() as any;
      const eventId = eventDoc.id;

      if (!ev.event_date) {
        skipped++;
        results.push({ clientId: ev.client_id, status: 'no_date' });
        continue;
      }

      const client = clientMap.get(ev.client_id);
      const coupleNames = ev.couple_names || (client ? `${client.name} & ${client.partner}` : 'Mariage');
      const clientEmail = ev.client_email || client?.email || undefined;
      const phone = client?.phone || undefined;
      const location = ev.location || client?.event_location || undefined;

      const gEvent = buildWeddingEvent({
        coupleNames,
        eventDate: ev.event_date,
        location: location || undefined,
        clientEmail: clientEmail || undefined,
        phone: phone || undefined,
        guestCount: ev.guest_count || undefined,
        notes: ev.notes || undefined,
      });

      try {
        if (ev.google_event_id) {
          // Update existing
          await updateCalendarEvent(calendar, ev.google_event_id, gEvent);
          results.push({ clientId: ev.client_id, status: 'updated', googleEventId: ev.google_event_id });
        } else {
          // Create new
          const googleEventId = await createCalendarEvent(calendar, gEvent);
          await adminDb.collection('events').doc(eventId).update({ google_event_id: googleEventId });
          results.push({ clientId: ev.client_id, status: 'created', googleEventId });
        }
        synced++;
      } catch (e: any) {
        console.error(`Sync failed for event ${eventId}:`, e?.message || e);
        errors++;
        results.push({ clientId: ev.client_id, status: 'error', googleEventId: undefined });
      }
    }

    return NextResponse.json({
      ok: true,
      total: eventsSnap.size,
      synced,
      skipped,
      errors,
      results,
    });
  } catch (e: any) {
    console.error('sync-all error:', e);
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
