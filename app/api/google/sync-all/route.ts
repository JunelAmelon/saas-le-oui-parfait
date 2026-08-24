import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { getValidCalendarClient, createCalendarEvent, updateCalendarEvent, CalendarEventInput } from '@/lib/google-calendar';

export const runtime = 'nodejs';

function normalizeDate(raw: string): string {
  if (!raw) return '';
  // Already ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // DD/MM/YYYY or DD/MM/YY
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    let yyyy = m[3];
    if (yyyy.length === 2) yyyy = '20' + yyyy;
    return `${yyyy}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  // Try Date parsing
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  console.warn('Could not normalize date:', raw);
  return raw;
}

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

    // Track which clients have an event document
    const clientsWithEvents = new Set<string>();

    let synced = 0;
    let skipped = 0;
    let errors = 0;
    const results: Array<{ clientId: string; status: string; googleEventId?: string; detail?: string }> = [];

    for (const eventDoc of eventsSnap.docs) {
      const ev = eventDoc.data() as any;
      const eventId = eventDoc.id;
      clientsWithEvents.add(ev.client_id);

      if (!ev.event_date) {
        skipped++;
        results.push({ clientId: ev.client_id, status: 'no_date' });
        continue;
      }

      const client = clientMap.get(ev.client_id);
      const coupleNames = ev.couple_names || (client ? `${client.name} & ${client.partner}` : 'Mariage');
      const phone = client?.phone || undefined;
      const location = ev.location || client?.event_location || undefined;
      const normalizedDate = normalizeDate(ev.event_date);

      if (!normalizedDate || !/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
        console.warn(`Invalid date for event ${eventId}: "${ev.event_date}" -> "${normalizedDate}"`);
        skipped++;
        results.push({ clientId: ev.client_id, status: 'invalid_date', detail: `raw: ${ev.event_date}` });
        continue;
      }

      const gEvent = buildWeddingEvent({
        coupleNames,
        eventDate: normalizedDate,
        location: location || undefined,
        phone: phone || undefined,
        guestCount: ev.guest_count || undefined,
        notes: ev.notes || undefined,
      });

      try {
        if (ev.google_event_id) {
          // Update existing — if it fails (event deleted from Google), fall back to create
          try {
            await updateCalendarEvent(calendar, ev.google_event_id, gEvent);
            results.push({ clientId: ev.client_id, status: 'updated', googleEventId: ev.google_event_id });
          } catch (updateErr: any) {
            console.warn(`Update failed for event ${eventId}, trying create:`, updateErr?.message || updateErr);
            const googleEventId = await createCalendarEvent(calendar, gEvent);
            await adminDb.collection('events').doc(eventId).update({ google_event_id: googleEventId });
            results.push({ clientId: ev.client_id, status: 'recreated', googleEventId });
          }
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
        results.push({ clientId: ev.client_id, status: 'error', detail: e?.message || 'unknown' });
      }
    }

    // Also handle clients that don't have an events document yet
    const clientsWithoutEvents: Array<[string, any]> = [];
    clientMap.forEach((client, clientId) => {
      if (!clientsWithEvents.has(clientId)) {
        clientsWithoutEvents.push([clientId, client]);
      }
    });

    for (const [clientId, client] of clientsWithoutEvents) {
      if (clientsWithEvents.has(clientId)) continue;
      if (!client.event_date) {
        skipped++;
        results.push({ clientId, status: 'no_date_no_event' });
        continue;
      }

      const normalizedDate = normalizeDate(client.event_date);
      if (!normalizedDate || !/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
        console.warn(`Invalid date for client ${clientId}: "${client.event_date}" -> "${normalizedDate}"`);
        skipped++;
        results.push({ clientId, status: 'invalid_date', detail: `raw: ${client.event_date}` });
        continue;
      }

      const coupleNames = `${client.name || ''} & ${client.partner || ''}`.trim() || 'Mariage';
      const gEvent = buildWeddingEvent({
        coupleNames,
        eventDate: normalizedDate,
        location: client.event_location || undefined,
        phone: client.phone || undefined,
        guestCount: client.guests ? parseInt(client.guests) : undefined,
        notes: client.notes || undefined,
      });

      try {
        const googleEventId = await createCalendarEvent(calendar, gEvent);
        // Create the missing event document with google_event_id
        await adminDb.collection('events').add({
          client_id: clientId,
          planner_id: decodedUid,
          couple_names: coupleNames,
          event_date: client.event_date,
          location: client.event_location || '',
          guest_count: client.guests ? parseInt(client.guests) : 0,
          budget: client.budget ? parseFloat(client.budget) : 0,
          status: 'confirmed',
          client_email: client.email || '',
          notes: client.notes || '',
          google_event_id: googleEventId,
          created_at: new Date().toISOString(),
        });
        results.push({ clientId, status: 'created_missing_event', googleEventId });
        synced++;
      } catch (e: any) {
        console.error(`Sync failed for client ${clientId} (no event doc):`, e?.message || e);
        errors++;
        results.push({ clientId, status: 'error', detail: e?.message || 'unknown' });
      }
    }

    return NextResponse.json({
      ok: true,
      total: eventsSnap.size + clientMap.size - clientsWithEvents.size,
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
