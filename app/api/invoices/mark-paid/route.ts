import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    const { invoice_id, validated_by, method, note } = await request.json();

    if (!invoice_id) {
      return NextResponse.json({ error: 'Missing invoice_id' }, { status: 400 });
    }

    const invoiceRef = adminDb.collection('invoices').doc(invoice_id);
    const invoiceSnap = await invoiceRef.get();

    if (!invoiceSnap.exists) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const invoice = invoiceSnap.data() as any;

    if (invoice?.status === 'paid') {
      return NextResponse.json({ ok: true, alreadyPaid: true });
    }

    const amount = Number(invoice?.amount_ttc ?? 0);

    const existingValidated = await adminDb
      .collection('payments')
      .where('invoice_id', '==', invoice_id)
      .where('status', '==', 'validated')
      .limit(1)
      .get();

    if (existingValidated.empty) {
      await adminDb.collection('payments').add({
        invoice_id,
        client_id: invoice?.client_id || null,
        planner_id: invoice?.planner_id || null,
        amount,
        method: method || 'bank_transfer',
        source: 'admin_manual',
        status: 'validated',
        note: note || null,
        declared_at: Timestamp.now(),
        validated_at: Timestamp.now(),
        validated_by: validated_by || null,
        created_at: Timestamp.now(),
      });
    }

    await invoiceRef.update({
      status: 'paid',
      paid_at: Timestamp.now(),
      updated_at: Timestamp.now(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Invoice mark-paid error:', error);
    return NextResponse.json({ error: 'Failed to mark invoice as paid' }, { status: 500 });
  }
}
