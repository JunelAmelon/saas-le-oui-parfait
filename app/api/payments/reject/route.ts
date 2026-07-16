import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { payment_id, reason } = await request.json();

    if (!payment_id || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const paymentRef = adminDb.collection('payments').doc(payment_id);
    const paymentSnap = await paymentRef.get();

    if (!paymentSnap.exists) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    const payment = paymentSnap.data();

    await paymentRef.update({
      status: 'rejected',
      rejected_reason: reason,
    });

    const invoiceRef = adminDb.collection('invoices').doc(payment?.invoice_id);
    await invoiceRef.update({
      status: 'sent',
    });

    return NextResponse.json({
      success: true,
      message: 'Payment rejected successfully',
    });
  } catch (error) {
    console.error('Payment rejection error:', error);
    return NextResponse.json(
      { error: 'Failed to reject payment' },
      { status: 500 }
    );
  }
}
