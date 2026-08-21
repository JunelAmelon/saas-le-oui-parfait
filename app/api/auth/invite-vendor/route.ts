import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { resolveBaseUrl, sendPasswordResetEmail } from '@/lib/password-reset-email';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
    if (!token) return NextResponse.json({ error: 'missing_auth' }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(token);
    const plannerId = decoded.uid;

    const body = (await req.json()) as {
      vendorId?: string;
      email?: string;
      fullName?: string;
    };
    const vendorId = String(body?.vendorId || '').trim();
    const email = String(body?.email || '').trim().toLowerCase();
    const fullName = String(body?.fullName || '').trim();

    if (!vendorId) return NextResponse.json({ error: 'missing_vendor_id' }, { status: 400 });
    if (!email) return NextResponse.json({ error: 'missing_email' }, { status: 400 });

    // Verify the vendor belongs to the planner
    const vendorRef = adminDb.collection('vendors').doc(vendorId);
    const vendorSnap = await vendorRef.get();
    if (!vendorSnap.exists) {
      return NextResponse.json({ error: 'vendor_not_found' }, { status: 404 });
    }
    const vendorData = vendorSnap.data();
    if (vendorData?.planner_id !== plannerId) {
      return NextResponse.json({ error: 'not_authorized' }, { status: 403 });
    }

    let uid: string;
    let alreadyExists = false;
    try {
      const existing = await adminAuth.getUserByEmail(email);
      uid = existing.uid;
      alreadyExists = true;
    } catch (e: any) {
      if (String(e?.code || '').includes('auth/user-not-found')) {
        const created = await adminAuth.createUser({
          email,
          emailVerified: false,
          displayName: fullName || vendorData?.name || undefined,
          disabled: false,
        });
        uid = created.uid;
      } else {
        throw e;
      }
    }

    // Create/update profile with vendor role
    try {
      await adminDb
        .collection('profiles')
        .doc(uid)
        .set(
          {
            uid,
            email,
            role: 'vendor',
            full_name: fullName || vendorData?.name || '',
            vendor_id: vendorId,
            planner_id: plannerId,
            updated_at: new Date().toISOString(),
          },
          { merge: true }
        );
    } catch (e) {
      // ignore profile creation error
    }

    // Update vendor with pro account info
    await vendorRef.update({
      pro_account_uid: uid,
      pro_account_status: 'invited',
      updated_at: new Date().toISOString(),
    });

    // Update all existing vendor_bookings for this vendor with the new vendor_uid
    // so the vendor can read them via Firestore rules
    try {
      const bookingsSnap = await adminDb
        .collection('vendor_bookings')
        .where('vendor_id', '==', vendorId)
        .get();

      const batch = adminDb.batch();
      bookingsSnap.docs.forEach((bkDoc) => {
        batch.update(bkDoc.ref, {
          vendor_uid: uid,
          updated_at: new Date().toISOString(),
        });
      });
      await batch.commit();
    } catch (e) {
      console.error('Error updating vendor_bookings with vendor_uid:', e);
      // Non-blocking
    }

    const baseUrl = resolveBaseUrl(req);
    await sendPasswordResetEmail({ email, baseUrl, role: 'vendor' });

    return NextResponse.json({ ok: true, uid, alreadyExists });
  } catch (e: any) {
    console.error('invite-vendor error:', e);
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
