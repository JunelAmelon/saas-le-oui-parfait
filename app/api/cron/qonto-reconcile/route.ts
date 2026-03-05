import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getMainBankAccount, listTransactions } from '@/lib/qonto';
import { handlePaymentSuccessNotifications } from '@/lib/notifications.server';

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

function getAuthOk(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get('authorization') || '';

  if (!auth.startsWith('Bearer ')) return false;
  const token = auth.slice('Bearer '.length);
  if (token !== secret) return false;

  return true;
}

export async function GET(req: Request) {
  try {
    if (!getAuthOk(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const limit = Math.min(200, Math.max(1, Number(new URL(req.url).searchParams.get('limit') || 50)));

    const invoiceSnap = await adminDb
      .collection('invoices')
      .where('status', 'in', ['pending', 'partial', 'overdue'])
      .limit(limit)
      .get();

    const invoices: Array<{ id: string; data: any }> = [];
    invoiceSnap.forEach((d) => {
      invoices.push({ id: d.id, data: d.data() as any });
    });

    const target = invoices.filter((x) => String(x.data?.qonto_payment_reference || '').trim());

    if (target.length === 0) {
      return NextResponse.json({ ok: true, checked: invoices.length, reconciled: 0, updated: 0, message: 'no_candidates' });
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

    let updated = 0;
    let reconciled = 0;

    for (const inv of target) {
      const invRef = adminDb.collection('invoices').doc(inv.id);
      const paymentRef = String(inv.data?.qonto_payment_reference || '').trim();
      if (!paymentRef) continue;

      const alreadyNotifiedTxIds = Array.isArray(inv.data?.qonto_notified_transaction_ids)
        ? (inv.data.qonto_notified_transaction_ids as any[]).map((v) => String(v || '').trim()).filter(Boolean)
        : [];
      const alreadyNotifiedTotal = parseMoney(inv.data?.qonto_notified_total_received ?? 0);

      const totalTtcRaw = inv.data?.montant_ttc ?? inv.data?.amount ?? 0;
      const totalTtc = parseMoney(totalTtcRaw);
      const alreadyPaid = parseMoney(inv.data?.paid ?? 0);
      if (totalTtc <= 0) continue;

      const candidates = txs.filter((tx) => transactionContainsRef(tx, paymentRef));
      const completed = candidates.filter((tx) => String(tx?.status || '').toLowerCase() === 'completed');
      if (completed.length === 0) continue;

      const txIds = completed
        .map((t) => String(t?.transaction_id || t?.id || '').trim())
        .filter(Boolean);
      const totalReceived = completed.reduce((sum, t) => sum + getTxAmountEur(t), 0);
      const newPaid = Math.min(totalTtc, Math.max(alreadyPaid, totalReceived));
      const newStatus = newPaid >= totalTtc ? 'paid' : 'partial';

      if (Math.abs(newPaid - alreadyPaid) < 0.001 && String(inv.data?.status || '') === newStatus) {
        reconciled += 1;
        continue;
      }

      await invRef.set(
        {
          paid: newPaid,
          status: newStatus,
          payment_method: 'transfer',
          payment_provider: 'qonto',
          qonto_reconciled_transaction_ids: txIds,
          qonto_total_received: totalReceived,
          qonto_last_reconcile: {
            reconciled_at: new Date().toISOString(),
            matched_ref: paymentRef,
            tx_count: txIds.length,
          },
        },
        { merge: true }
      );

      updated += 1;
      reconciled += 1;

      const hasNewTx = txIds.some((id) => !alreadyNotifiedTxIds.includes(id));
      const shouldNotify = (totalReceived > 0 && totalReceived > alreadyNotifiedTotal + 0.01) || hasNewTx;
      if (shouldNotify) {
        const nextNotifiedTxIds = Array.from(new Set([...alreadyNotifiedTxIds, ...txIds]));
        const delta = Math.max(0, newPaid - alreadyPaid);
        const notifyAmount = delta > 0 ? delta : Math.max(0, totalReceived - alreadyNotifiedTotal);
        try {
          await handlePaymentSuccessNotifications(inv.id, notifyAmount);
          await invRef.set(
            {
              qonto_notified_total_received: totalReceived,
              qonto_notified_transaction_ids: nextNotifiedTxIds,
              qonto_notified_at: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (e) {
          console.warn('Unable to send payment notifications (cron reconcile):', e);
        }
      }
    }

    return NextResponse.json({ ok: true, checked: invoices.length, candidates: target.length, reconciled, updated });
  } catch (e: any) {
    console.error('cron qonto reconcile error:', e);
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
