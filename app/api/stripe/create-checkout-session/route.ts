import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-06-24.dahlia',
});

export async function POST(request: NextRequest) {
  try {
    const { invoice } = await request.json();

    if (!invoice || !invoice.id || !invoice.number || !invoice.amount_ttc) {
      return NextResponse.json(
        { error: 'Invalid invoice data' },
        { status: 400 }
      );
    }

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
        invoice_id: invoice.id,
        client_id: invoice.client_id,
        planner_id: invoice.planner_id,
        invoice_number: invoice.number,
      },
      success_url: `${process.env.NEXT_PUBLIC_URL}/espace-client/paiements?success=true&invoice=${invoice.id}`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/espace-client/paiements?cancelled=true`,
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
