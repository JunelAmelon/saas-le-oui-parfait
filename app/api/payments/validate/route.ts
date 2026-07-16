import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    const { payment_id, validated_by } = await request.json();

    if (!payment_id || !validated_by) {
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
      status: 'validated',
      validated_at: Timestamp.now(),
      validated_by,
    });

    const invoiceRef = adminDb.collection('invoices').doc(payment?.invoice_id);
    await invoiceRef.update({
      status: 'paid',
      paid_at: Timestamp.now(),
      updated_at: Timestamp.now(),
    });

    return NextResponse.json({
      success: true,
      message: 'Payment validated successfully',
    });
  } catch (error) {
    console.error('Payment validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate payment' },
      { status: 500 }
    );
  }
}
