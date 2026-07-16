import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    const { invoice_id, amount, transfer_date, transfer_reference, proof_url, client_name } = await request.json();

    if (!invoice_id || !amount || !transfer_date || !transfer_reference || !proof_url) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const invoiceRef = adminDb.collection('invoices').doc(invoice_id);
    const invoiceSnap = await invoiceRef.get();

    if (!invoiceSnap.exists) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    const invoice = invoiceSnap.data();

    if (invoice?.status === 'paid') {
      return NextResponse.json(
        { error: 'Invoice already paid' },
        { status: 400 }
      );
    }

    if (Math.abs(amount - (invoice?.amount_ttc || 0)) > 0.01) {
      return NextResponse.json(
        { error: 'Amount must match invoice total' },
        { status: 400 }
      );
    }

    const paymentData = {
      invoice_id,
      client_id: invoice?.client_id,
      planner_id: invoice?.planner_id,
      amount,
      method: 'bank_transfer',
      source: 'client_declared',
      status: 'pending',
      transfer_date,
      transfer_reference,
      proof_url,
      declared_at: Timestamp.now(),
      created_at: Timestamp.now(),
    };

    const paymentRef = await adminDb.collection('payments').add(paymentData);

    await invoiceRef.update({
      status: 'payment_pending',
      updated_at: Timestamp.now(),
    });

    // Envoyer notification email à l'admin
    try {
      const plannerRef = await adminDb.collection('profiles').doc(invoice?.planner_id).get();
      const plannerData = plannerRef.data();
      
      if (plannerData?.email) {
        await fetch(`${process.env.NEXT_PUBLIC_URL}/api/email/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: plannerData.email,
            subject: `Nouveau paiement à valider - ${invoice?.number}`,
            template: 'payment_pending',
            data: {
              admin_email: plannerData.email,
              client_name: client_name || 'Client',
              invoice_number: invoice?.number,
              amount,
              transfer_date,
              proof_url,
            },
          }),
        });
      }
    } catch (emailError) {
      console.error('Error sending notification email:', emailError);
      // Ne pas bloquer la réponse si l'email échoue
    }

    return NextResponse.json({
      success: true,
      payment_id: paymentRef.id,
      message: 'Payment declared successfully. Waiting for validation.',
    });
  } catch (error) {
    console.error('Payment declaration error:', error);
    return NextResponse.json(
      { error: 'Failed to declare payment' },
      { status: 500 }
    );
  }
}
