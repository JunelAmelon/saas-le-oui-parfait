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

function getTxAmountEur(tx: any) {
  const cents = Number(tx?.amount_cents);
  if (Number.isFinite(cents) && cents !== 0) return cents / 100;
  const amt = Number(tx?.amount);
  return Number.isFinite(amt) ? amt : 0;
}

function parseMoney(v: any) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const s = String(v ?? '').trim();
  if (!s) return 0;
  const normalized = s.replace(/\s/g, '').replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
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

    const invoiceType = String(inv?.type || '').toLowerCase();
    const totalTtcRaw = inv?.montant_ttc ?? inv?.amount ?? 0;
    const totalTtc = parseMoney(totalTtcRaw);
    const alreadyPaid = parseMoney(inv?.paid ?? 0);
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
    const completed = candidates.filter((tx) => String(tx?.status || '').toLowerCase() === 'completed');
    const matched = completed[0] || candidates[0];

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

    const txIds = completed
      .map((t) => String(t?.transaction_id || t?.id || '').trim())
      .filter(Boolean);
    const totalReceived = completed.reduce((sum, t) => sum + getTxAmountEur(t), 0);
    const received = getTxAmountEur(matched);

    if (invoiceType === 'deposit') {
      const eps = 0.01;
      const isExact = Math.abs(totalReceived - totalTtc) < eps;
      if (!isExact) {
        return NextResponse.json({
          ok: true,
          invoiceId,
          status: inv?.status || 'pending',
          paid: alreadyPaid,
          matched: {
            id: matched.transaction_id || matched.id || null,
            amount: received,
            settled_at: matched.settled_at || null,
          },
          message: 'deposit_requires_exact_amount',
          invoice_type: invoiceType,
          expected: totalTtc,
          expected_raw: totalTtcRaw,
          received_total: totalReceived,
        });
      }
    }

    const newPaid = Math.min(totalTtc, Math.max(alreadyPaid, totalReceived));
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
        qonto_reconciled_transaction_ids: txIds,
        qonto_total_received: totalReceived,
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
