import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Migration: syncs existing client_vendors into vendor_bookings.
 * Run once after deploying the vendor pro space.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
    if (!token) return NextResponse.json({ error: 'missing_auth' }, { status: 401 });

    await adminAuth.verifyIdToken(token);

    const linksSnap = await adminDb.collection('client_vendors').get();
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const linkDoc of linksSnap.docs) {
      const link = linkDoc.data();
      const vendorId = link.vendor_id;
      const clientId = link.client_id;
      const plannerId = link.planner_id;
      if (!vendorId || !clientId || !plannerId) {
        skipped++;
        continue;
      }

      // Check if booking already exists (single-field query to avoid composite index requirement)
      const existingSnap = await adminDb
        .collection('vendor_bookings')
        .where('vendor_id', '==', vendorId)
        .limit(500)
        .get();
      const existingDoc = existingSnap.docs.find((d) => d.data()?.client_id === clientId);

      // Fetch vendor for pro_account_uid
      const vendorSnap = await adminDb.collection('vendors').doc(vendorId).get();
      const vendorData = vendorSnap.exists ? vendorSnap.data() : null;
      const vendorUid = vendorData?.pro_account_uid || null;

      // Fetch client for couple names
      const clientSnap = await adminDb.collection('clients').doc(clientId).get();
      const clientData = clientSnap.exists ? clientSnap.data() : null;
      const clientNames = clientData
        ? `${clientData.name || ''}${clientData.name && clientData.partner ? ' & ' : ''}${clientData.partner || ''}`.trim() || 'Client'
        : 'Client';

      // Fetch event for wedding date
      const eventsSnap = await adminDb
        .collection('events')
        .where('client_id', '==', clientId)
        .limit(1)
        .get();
      const eventData = eventsSnap.docs[0]?.data();
      const weddingDate = eventData?.event_date || clientData?.event_date || '';
      const eventId = eventsSnap.docs[0]?.id || '';

      // Fetch planner name
      const plannerSnap = await adminDb.collection('profiles').doc(plannerId).get();
      const plannerData = plannerSnap.exists ? plannerSnap.data() : null;
      const plannerName = plannerData?.full_name || plannerData?.email || '';

      const bookingData: any = {
        vendor_id: vendorId,
        vendor_uid: vendorUid,
        planner_id: plannerId,
        client_id: clientId,
        event_id: eventId,
        client_names: clientNames,
        wedding_date: weddingDate,
        planner_name: plannerName,
        status: 'confirmed',
        updated_at: new Date().toISOString(),
      };

      if (existingDoc) {
        await existingDoc.ref.update(bookingData);
        updated++;
      } else {
        bookingData.created_at = new Date().toISOString();
        await adminDb.collection('vendor_bookings').add(bookingData);
        created++;
      }
    }

    return NextResponse.json({ ok: true, created, updated, skipped, total: linksSnap.size });
  } catch (e: any) {
    console.error('migrate-vendor-bookings error:', e);
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
