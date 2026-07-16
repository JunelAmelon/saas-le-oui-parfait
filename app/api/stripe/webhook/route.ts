import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-06-24.dahlia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'No signature' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const { invoice_id, client_id, planner_id, invoice_number } = session.metadata || {};

      if (!invoice_id || !client_id || !planner_id) {
        console.error('Missing metadata in session:', session.id);
        return NextResponse.json(
          { error: 'Missing metadata' },
          { status: 400 }
        );
      }

      const invoiceRef = adminDb.collection('invoices').doc(invoice_id);
      const invoiceSnap = await invoiceRef.get();

      if (!invoiceSnap.exists) {
        console.error('Invoice not found:', invoice_id);
        return NextResponse.json(
          { error: 'Invoice not found' },
          { status: 404 }
        );
      }

      const invoice = invoiceSnap.data();

      if (invoice?.status === 'paid') {
        return NextResponse.json({ received: true });
      }

      const existingPaymentSnap = await adminDb
        .collection('payments')
        .where('stripe_session_id', '==', session.id)
        .limit(1)
        .get();

      if (!existingPaymentSnap.empty) {
        await invoiceRef.update({
          status: 'paid',
          paid_at: Timestamp.now(),
          stripe_session_id: session.id,
          stripe_payment_intent_id: session.payment_intent as string,
          updated_at: Timestamp.now(),
        });
        return NextResponse.json({ received: true });
      }

      const paymentData = {
        invoice_id,
        client_id,
        planner_id,
        amount: invoice?.amount_ttc || 0,
        method: 'stripe',
        source: 'stripe_auto',
        status: 'validated',
        stripe_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent as string,
        declared_at: Timestamp.now(),
        validated_at: Timestamp.now(),
        created_at: Timestamp.now(),
      };

      await adminDb.collection('payments').add(paymentData);

      await invoiceRef.update({
        status: 'paid',
        paid_at: Timestamp.now(),
        stripe_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent as string,
        updated_at: Timestamp.now(),
      });

      console.log(`Payment validated for invoice ${invoice_number}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
