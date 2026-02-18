import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { getMainBankAccount, listTransactions } from '@/lib/qonto';

export const runtime = 'nodejs';

function normalizeText(v: any) {
  return String(v || '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function transactionContainsRef(tx: any, ref: string) {
  const nref = normalizeText(ref);
  const hay = [tx?.label, tx?.note, tx?.reference, tx?.transaction_id, tx?.id]
    .map(normalizeText)
    .filter(Boolean)
    .join(' | ');
  return hay.includes(nref);
}

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
    const paymentRef = String(inv?.qonto_payment_reference || '').trim();
    if (!paymentRef) {
      return NextResponse.json({ error: 'missing_qonto_payment_reference' }, { status: 400 });
    }

    const totalTtc = Number(inv?.montant_ttc ?? inv?.amount ?? 0) || 0;
    const alreadyPaid = Number(inv?.paid ?? 0) || 0;
    const remaining = Math.max(0, totalTtc - alreadyPaid);

    if (remaining <= 0) {
      return NextResponse.json({ ok: true, invoiceId, status: 'paid', paid: alreadyPaid, matched: null, message: 'already_paid' });
    }

    const bankAccount = await getMainBankAccount();

    const updatedAtFrom = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString();
    const txRes = await listTransactions({
      iban: bankAccount.iban,
      side: 'credit',
      updated_at: updatedAtFrom,
      per_page: 100,
    });

    const txs = Array.isArray(txRes?.transactions) ? txRes.transactions : [];
    const candidates = txs.filter((tx) => transactionContainsRef(tx, paymentRef));
    const matched =
      candidates.find((tx) => String(tx?.status || '').toLowerCase() === 'completed') ||
      candidates[0];

    if (!matched) {
      return NextResponse.json({ ok: true, invoiceId, status: inv?.status || 'pending', paid: alreadyPaid, matched: null });
    }

    const matchStatus = String(matched?.status || '').toLowerCase();
    if (matchStatus && matchStatus !== 'completed') {
      return NextResponse.json({
        ok: true,
        invoiceId,
        status: inv?.status || 'pending',
        paid: alreadyPaid,
        matched: {
          id: matched.transaction_id || matched.id || null,
          amount: Number(matched.amount ?? 0) || 0,
          settled_at: matched.settled_at || null,
          status: matchStatus,
        },
        message: 'transaction_not_completed_yet',
      });
    }

    const received = Number(matched.amount ?? 0) || 0;
    const newPaid = Math.min(totalTtc, alreadyPaid + received);
    const newStatus = newPaid >= totalTtc ? 'paid' : 'partial';

    await invRef.set(
      {
        paid: newPaid,
        status: newStatus,
        payment_method: 'transfer',
        payment_provider: 'qonto',
        qonto_last_match: {
          transaction_id: matched.transaction_id || matched.id || null,
          settled_at: matched.settled_at || null,
          emitted_at: matched.emitted_at || null,
          amount: received,
          currency: 'EUR',
          label: matched.label || null,
          note: matched.note || null,
          reference: matched.reference || null,
          matched_at: new Date().toISOString(),
        },
      },
      { merge: true }
    );

    return NextResponse.json({
      ok: true,
      invoiceId,
      status: newStatus,
      paid: newPaid,
      matched: {
        id: matched.transaction_id || matched.id || null,
        amount: received,
        settled_at: matched.settled_at || null,
      },
    });
  } catch (e: any) {
    console.error('qonto reconcile error:', e);
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
