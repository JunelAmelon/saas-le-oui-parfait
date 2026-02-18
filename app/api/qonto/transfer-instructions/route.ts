import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { buildPrettyTransferReference, getMainBankAccount } from '@/lib/qonto';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
    if (!token) return NextResponse.json({ error: 'missing_auth' }, { status: 401 });

    await adminAuth.verifyIdToken(token);

    const body = (await req.json()) as { invoiceId?: string };
    const invoiceId = String(body?.invoiceId || '').trim();
    if (!invoiceId) return NextResponse.json({ error: 'missing_invoiceId' }, { status: 400 });

    const invRef = adminDb.collection('invoices').doc(invoiceId);
    const invSnap = await invRef.get();
    if (!invSnap.exists) return NextResponse.json({ error: 'invoice_not_found' }, { status: 404 });

    const inv = invSnap.data() as any;

    const paymentReference = String(inv?.qonto_payment_reference || '') ||
      buildPrettyTransferReference({ invoiceId, invoiceReference: inv?.reference });

    if (!inv?.qonto_payment_reference) {
      await invRef.set(
        {
          qonto_payment_reference: paymentReference,
          qonto_payment_reference_created_at: new Date().toISOString(),
        },
        { merge: true }
      );
    }

    const bankAccount = await getMainBankAccount();

    const totalTtc = Number(inv?.montant_ttc ?? inv?.amount ?? 0) || 0;
    const paid = Number(inv?.paid ?? 0) || 0;
    const amountDue = Math.max(0, totalTtc - paid);

    return NextResponse.json({
      ok: true,
      invoiceId,
      iban: bankAccount.iban,
      bic: bankAccount.bic || null,
      bankAccountName: bankAccount.name || null,
      reference: paymentReference,
      amountDue,
      currency: 'EUR',
    });
  } catch (e: any) {
    console.error('qonto transfer-instructions error:', e);
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
