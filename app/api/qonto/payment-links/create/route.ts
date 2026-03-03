import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { getValidQontoAccessToken, qontoOAuthRequest } from '@/lib/qonto-oauth';
import { buildPrettyTransferReference } from '@/lib/qonto';

export const runtime = 'nodejs';

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

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    // Only the client user can create a payment link for their invoice, but the Qonto OAuth is owned by planner.
    const profileSnap = await adminDb.collection('profiles').doc(uid).get();
    const role = String((profileSnap.data() as any)?.role || '');
    if (role !== 'client') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    const body = (await req.json()) as { invoiceId?: string };
    const invoiceId = String(body?.invoiceId || '').trim();
    if (!invoiceId) return NextResponse.json({ error: 'missing_invoiceId' }, { status: 400 });

    const invRef = adminDb.collection('invoices').doc(invoiceId);
    const invSnap = await invRef.get();
    if (!invSnap.exists) return NextResponse.json({ error: 'invoice_not_found' }, { status: 404 });

    const inv = invSnap.data() as any;

    // Ensure client owns invoice
    const invoiceClientId = String(inv?.client_id || '').trim();
    const clientSnap = await adminDb.collection('clients').where('client_user_id', '==', uid).limit(1).get();
    const myClientId = clientSnap.empty ? '' : clientSnap.docs[0].id;

    if (!invoiceClientId || !myClientId || invoiceClientId !== myClientId) {
      return NextResponse.json({ error: 'forbidden_invoice' }, { status: 403 });
    }

    const plannerId = String(inv?.planner_id || '').trim();
    if (!plannerId) return NextResponse.json({ error: 'missing_planner_id' }, { status: 400 });

    const totalTtc = parseMoney(inv?.montant_ttc ?? inv?.amount ?? 0);
    const paid = parseMoney(inv?.paid ?? 0);
    const amountDue = Math.max(0, totalTtc - paid);
    if (amountDue <= 0) return NextResponse.json({ error: 'already_paid' }, { status: 400 });

    // Ensure we have a reference stored (used for matching + external reference)
    const existingRef = String(inv?.qonto_payment_reference || '').trim();
    const paymentReference = existingRef || buildPrettyTransferReference({ invoiceId, invoiceReference: inv?.reference });

    if (!existingRef) {
      await invRef.set(
        {
          qonto_payment_reference: paymentReference,
          qonto_payment_reference_created_at: new Date().toISOString(),
        },
        { merge: true }
      );
    }

    const { accessToken } = await getValidQontoAccessToken(plannerId);

    // Ensure Payment Links feature is enabled/connected
    try {
      const connection = await qontoOAuthRequest<any>({
        accessToken,
        path: '/v2/payment_links/connections',
        init: { method: 'GET' },
      });

      const status = String(connection?.status || '').toLowerCase();
      if (status && status !== 'enabled') {
        return NextResponse.json(
          {
            error: 'qonto_payment_links_not_enabled',
            status,
            connection_location: connection?.connection_location || null,
          },
          { status: 400 }
        );
      }
    } catch (e: any) {
      const msg = String(e?.message || 'connection_status_error');
      // Qonto returns 404 "connection not found" when no provider connection has been created yet.
      if (msg.includes('error 404') && msg.toLowerCase().includes('connection not found')) {
        return NextResponse.json(
          {
            error: 'qonto_payment_links_not_enabled',
            status: 'not_connected',
            connection_location: null,
          },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: 'qonto_payment_links_connection_check_failed', detail: msg }, { status: 400 });
    }

    // Create an invoice payment link (resource_type Invoice)
    const payload = {
      resource_type: 'Invoice',
      invoice_id: invoiceId,
      invoice_number: String(inv?.reference || inv?.invoice_number || `INV-${invoiceId.slice(-6)}`),
      debitor_name: String(inv?.client || inv?.debitor_name || inv?.customer_name || 'Client'),
      amount: {
        value: amountDue.toFixed(2),
        currency: 'EUR',
      },
      potential_payment_methods: ['credit_card', 'apple_pay'],
    };

    let created: any;
    try {
      created = await qontoOAuthRequest<any>({
        accessToken,
        path: '/v2/payment_links',
        init: {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      });
    } catch (e: any) {
      const msg = String(e?.message || 'qonto_payment_link_create_failed');
      return NextResponse.json({ error: 'qonto_payment_link_create_failed', detail: msg }, { status: 400 });
    }

    const url = String(created?.url || '').trim();
    const paymentLinkId = String(created?.id || '').trim();

    if (!url) {
      return NextResponse.json({ error: 'qonto_payment_link_missing_url' }, { status: 500 });
    }

    await invRef.set(
      {
        payment_provider: 'qonto_payment_link',
        qonto_payment_link: {
          id: paymentLinkId || null,
          url,
          created_at: new Date().toISOString(),
          amount_due: amountDue,
          reference: paymentReference,
        },
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true, url, id: paymentLinkId || null, reference: paymentReference });
  } catch (e: any) {
    const msg = String(e?.message || 'error');
    if (msg === 'qonto_oauth_not_connected') {
      return NextResponse.json({ error: 'qonto_oauth_not_connected' }, { status: 400 });
    }
    console.error('qonto payment-links create error:', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
