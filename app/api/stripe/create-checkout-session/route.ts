import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';

const secretKey = process.env.STRIPE_SECRET_KEY!;
if (!secretKey) {
  throw new Error('STRIPE_SECRET_KEY is not configured');
}
const stripe = new Stripe(secretKey);

export async function POST(request: NextRequest) {
  try {
    const { invoice: invoiceInput } = await request.json();

    if (!invoiceInput || !invoiceInput.id) {
      return NextResponse.json(
        { error: 'Invalid invoice data' },
        { status: 400 }
      );
    }

    const invoiceRef = adminDb.collection('invoices').doc(invoiceInput.id);
    const invoiceSnap = await invoiceRef.get();

    if (!invoiceSnap.exists) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    const invoice = invoiceSnap.data() as any;

    if (
      !invoice ||
      invoice.status === 'paid' ||
      !(invoice.amount_ttc > 0) ||
      !invoice.number ||
      !invoice.client_id ||
      !invoice.planner_id
    ) {
      return NextResponse.json(
        { error: 'Invalid invoice' },
        { status: 400 }
      );
    }

    const envBaseUrl = (process.env.NEXT_PUBLIC_URL || '').trim();
    const baseUrl = /^https?:\/\//i.test(envBaseUrl)
      ? envBaseUrl.replace(/\/$/, '')
      : request.nextUrl.origin;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Facture ${invoice.number}`,
              description: invoice.label || 'Facture',
            },
            unit_amount: Math.round(invoice.amount_ttc * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        invoice_id: invoiceInput.id,
        client_id: invoice.client_id,
        planner_id: invoice.planner_id,
        invoice_number: invoice.number,
      },
      success_url: `${baseUrl}/espace-client/paiements?success=true&invoice=${invoiceInput.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/espace-client/paiements?cancelled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe session creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
