import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { verifyQontoSignature, getMainBankAccount, listTransactions } from '@/lib/qonto';
import { buildPrettyTransferReference } from '@/lib/qonto';
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

export async function POST(req: Request) {
    try {
        const bodyText = await req.text();
        const signature = req.headers.get('Qonto-SHA256-Signature') || req.headers.get('X-Qonto-Signature') || '';
        const secret = process.env.QONTO_WEBHOOK_SECRET || '';

        // Log the raw webhook for debugging/audit
        await adminDb.collection('qonto_webhooks').add({
            received_at: new Date().toISOString(),
            body: bodyText,
            signature_present: !!signature,
        });

        // Verify signature
        if (secret && !verifyQontoSignature(bodyText, signature, secret)) {
            console.warn('Qonto webhook signature verification failed');
            return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
        }

        const payload = JSON.parse(bodyText);

        // Qonto webhook for transactions usually sends a list or a single object.
        // Based on standard event patterns: { "event": "transaction.created", "resource_type": "transaction", "data": { ... } }
        const event = payload?.event || payload?.event_type;
        const tx = payload?.data || (payload?.resource_type === 'transaction' ? payload : null);

        if (!tx || tx.side !== 'credit') {
            return NextResponse.json({ ok: true, message: 'not_a_credit_transaction' });
        }

        // Extraction des textes pour le matching
        const txLabel = tx.label || '';
        const txReference = tx.reference || '';
        const txNote = tx.note || '';

        // On cherche une facture qui a une référence Qonto correspondant à un des champs de la transaction
        // On peut faire une recherche Firestore sur qonto_payment_reference
        // Mais comme la référence peut être "contenue" dans le label, on va peut-être devoir chercher plus largement
        // Cependant, pour l'automatisation propre, on encourage le matching exact sur qonto_payment_reference

        // Tentative 1: Matching direct sur qonto_payment_reference (Recommandé)
        // On va scanner les champs de la transaction pour trouver une string qui ressemble à nos références LOP-FACT-...
        // buildPrettyTransferReference génère: LOP-<PRETTY_BASE>-<TAIL_6>
        // Exemple: LOP-FACT-2026-001-ABCDEF ou LOP-ACOMPTE-ABCDEF
        const refMatch = bodyText.match(/LOP-[A-Z0-9-]+-[A-Z0-9]{6}/i);
        const extractedRef = refMatch ? normalizeText(refMatch[0]) : null;

        if (!extractedRef) {
            return NextResponse.json({ ok: true, message: 'no_lop_reference_found' });
        }

        const invoicesSnap = await adminDb.collection('invoices')
            .where('qonto_payment_reference', '==', extractedRef)
            .limit(1)
            .get();

        if (invoicesSnap.empty) {
            return NextResponse.json({ ok: true, message: 'no_matching_invoice' });
        }

        const invDoc = invoicesSnap.docs[0];
        const inv = invDoc.data();
        const invoiceId = invDoc.id;

        const alreadyNotifiedTxIds = Array.isArray((inv as any)?.qonto_notified_transaction_ids)
            ? ((inv as any).qonto_notified_transaction_ids as any[]).map((v) => String(v || '').trim()).filter(Boolean)
            : [];
        const alreadyNotifiedTotal = parseMoney((inv as any)?.qonto_notified_total_received ?? 0);

        // Logique de mise à jour (similaire à reconcile)
        const totalTtc = parseMoney(inv?.montant_ttc ?? inv?.amount ?? 0);
        const received = getTxAmountEur(tx);
        const alreadyPaid = parseMoney(inv?.paid ?? 0);
        const invoiceType = String(inv?.type || '').toLowerCase();

        // Exact amount check for deposits (to match old reconcile process)
        if (invoiceType === 'deposit') {
            const eps = 0.01;
            const isExact = Math.abs(received - totalTtc) < eps;
            if (!isExact) {
                return NextResponse.json({
                    ok: true,
                    invoice_id: invoiceId,
                    message: 'deposit_requires_exact_amount',
                    expected: totalTtc,
                    received: received
                });
            }
        }

        const newPaid = Math.min(totalTtc, alreadyPaid + received);
        const newStatus = newPaid >= totalTtc ? 'paid' : 'partial';

        const txId = String((tx as any)?.transaction_id || (tx as any)?.id || '').trim();
        const hasNewTx = txId ? !alreadyNotifiedTxIds.includes(txId) : received > alreadyNotifiedTotal + 0.01;

        await invDoc.ref.update({
            paid: newPaid,
            status: newStatus,
            payment_method: 'transfer',
            payment_provider: 'qonto',
            qonto_last_match: {
                transaction_id: tx.transaction_id || tx.id || null,
                settled_at: tx.settled_at || null,
                amount: received,
                matched_at: new Date().toISOString(),
                webhook_synced: true,
            },
            ...(hasNewTx
                ? {
                    qonto_notified_total_received: alreadyPaid + received,
                    qonto_notified_transaction_ids: txId
                        ? Array.from(new Set([...alreadyNotifiedTxIds, txId]))
                        : alreadyNotifiedTxIds,
                    qonto_notified_at: new Date().toISOString(),
                }
                : {}),
            updated_at: new Date().toISOString(),
        });

        // Trigger notifications (Email, Push, Firestore)
        if (hasNewTx) {
            try {
                await handlePaymentSuccessNotifications(invoiceId, received);
            } catch (e) {
                console.warn('Unable to send payment notifications:', e);
            }
        }

        return NextResponse.json({
            ok: true,
            invoice_id: invoiceId,
            matched_ref: extractedRef,
            new_status: newStatus
        });

    } catch (e: any) {
        console.error('qonto webhook error:', e);
        return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
    }
}
