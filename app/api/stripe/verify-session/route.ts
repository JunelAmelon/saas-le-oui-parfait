import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

const secretKey = process.env.STRIPE_SECRET_KEY!;
if (!secretKey) {
  throw new Error('STRIPE_SECRET_KEY is not configured');
}
const stripe = new Stripe(secretKey);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({} as any));
    const sessionId = (body?.session_id || body?.sessionId || '').toString();

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session || session.object !== 'checkout.session') {
      return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
    }

    // Stripe sends "paid" when the payment is successful for Checkout sessions.
    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { ok: false, status: session.payment_status },
        { status: 200 }
      );
    }

    const { invoice_id, client_id, planner_id, invoice_number } = session.metadata || {};

    if (!invoice_id || !client_id || !planner_id) {
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
    }

    const invoiceRef = adminDb.collection('invoices').doc(invoice_id);
    const invoiceSnap = await invoiceRef.get();

    if (!invoiceSnap.exists) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const invoice = invoiceSnap.data() as any;

    // Idempotency: if already paid, do nothing.
    if (invoice?.status === 'paid') {
      return NextResponse.json({ ok: true, alreadyPaid: true });
    }

    // Idempotency: don't create duplicates.
    const existingPaymentSnap = await adminDb
      .collection('payments')
      .where('stripe_session_id', '==', session.id)
      .limit(1)
      .get();

    if (existingPaymentSnap.empty) {
      await adminDb.collection('payments').add({
        invoice_id,
        client_id,
        planner_id,
        amount: invoice?.amount_ttc || 0,
        method: 'stripe',
        source: 'stripe_auto',
        status: 'validated',
        stripe_session_id: session.id,
        stripe_payment_intent_id: (session.payment_intent as string) || null,
        declared_at: Timestamp.now(),
        validated_at: Timestamp.now(),
        created_at: Timestamp.now(),
      });
    }

    await invoiceRef.update({
      status: 'paid',
      paid_at: Timestamp.now(),
      stripe_session_id: session.id,
      stripe_payment_intent_id: session.payment_intent as string,
      updated_at: Timestamp.now(),
    });

    return NextResponse.json({ ok: true, invoice_number, invoice_id });
  } catch (error) {
    console.error('Stripe verify-session error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
