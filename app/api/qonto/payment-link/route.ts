export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { qontoRequest } from '@/lib/qonto';

async function getRoleForUid(uid: string): Promise<'planner' | 'client' | null> {
  try {
    const snap = await adminDb.collection('profiles').doc(uid).get();
    const role = snap.exists ? (snap.data() as any)?.role : null;
    return role === 'planner' || role === 'client' ? role : null;
  } catch {
    return null;
  }
}

async function getClientIdForAuthUid(uid: string): Promise<string | null> {
  try {
    const qs = await adminDb
      .collection('clients')
      .where('client_user_id', '==', uid)
      .limit(1)
      .get();
    if (qs.empty) return null;
    return qs.docs[0].id;
  } catch {
    return null;
  }
}

function toMoneyValueEUR(amount: number) {
  const rounded = Math.round((Number(amount) || 0) * 100) / 100;
  return { value: rounded.toFixed(2), currency: 'EUR' };
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
    if (!token) return NextResponse.json({ error: 'missing_auth' }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const role = await getRoleForUid(uid);
    if (!role) return NextResponse.json({ error: 'missing_role' }, { status: 403 });

    const body = (await req.json()) as { invoiceId?: string };
    const invoiceId = String(body?.invoiceId || '').trim();
    if (!invoiceId) return NextResponse.json({ error: 'missing_invoiceId' }, { status: 400 });

    const invSnap = await adminDb.collection('invoices').doc(invoiceId).get();
    if (!invSnap.exists) return NextResponse.json({ error: 'invoice_not_found' }, { status: 404 });
    const inv = { id: invSnap.id, ...(invSnap.data() as any) };

    if (role === 'client') {
      const clientId = await getClientIdForAuthUid(uid);
      if (!clientId) return NextResponse.json({ error: 'client_not_found' }, { status: 404 });
      if (String(inv.client_id || '') !== clientId) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
    }

    const existingUrl = String(inv.qonto_payment_link_url || '');
    const existingId = String(inv.qonto_payment_link_id || '');
    if (existingUrl && existingId) {
      return NextResponse.json({
        ok: true,
        paymentLink: { id: existingId, url: existingUrl, status: inv.qonto_payment_link_status || null },
      });
    }

    // Ensure payment links are enabled/connected
    let conn: { status?: string; connection_location?: string } | null = null;
    try {
      conn = await qontoRequest<{ status: string; connection_location?: string }>({
        method: 'GET',
        path: '/v2/payment_links/connections',
      });
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg.toLowerCase().includes('unauthorized') || msg.includes('(401)')) {
        return NextResponse.json(
          {
            error: 'qonto_payment_links_requires_oauth',
            details:
              'Payment Links endpoints require OAuth (Bearer token). Run the OAuth flow at /api/qonto/oauth/start then complete the consent to store the token.',
          },
          { status: 400 }
        );
      }
      throw e;
    }
    if (conn?.status && conn.status !== 'enabled') {
      return NextResponse.json(
        {
          error: 'qonto_payment_links_not_enabled',
          connectionStatus: conn.status,
          connectionLocation: conn.connection_location || null,
        },
        { status: 400 }
      );
    }

    const amount = Number(inv.montant_ttc ?? inv.amount ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'invalid_amount' }, { status: 400 });
    }

    const title = String(inv.reference || 'Facture');
    const debitorName = String(inv.client || inv.client_name || inv.debitor_name || 'Client');

    let created: { payment_link: any };
    try {
      created = await qontoRequest<{ payment_link: any }>({
        method: 'POST',
        path: '/v2/payment_links',
        body: {
          payment_link: {
            potential_payment_methods: ['credit_card', 'bank_transfer'],
            reusable: false,
            items: [
              {
                title,
                quantity: 1,
                unit_price: toMoneyValueEUR(amount),
                vat_rate: '0.0',
                type: 'good',
                description: title,
                measure_unit: 'unit',
              },
            ],
            debitor_name: debitorName,
          },
        },
      });
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg.toLowerCase().includes('unauthorized') || msg.includes('(401)')) {
        return NextResponse.json(
          {
            error: 'qonto_payment_links_requires_oauth',
            details:
              'Payment Links endpoints require OAuth (Bearer token). Run the OAuth flow at /api/qonto/oauth/start then complete the consent to store the token.',
          },
          { status: 400 }
        );
      }
      throw e;
    }

    const paymentLink = (created as any)?.payment_link || (created as any)?.paymentLink || (created as any);
    const paymentLinkId = String(paymentLink?.id || paymentLink?.payment_link_id || '');
    const paymentLinkUrl = String(paymentLink?.url || paymentLink?.payment_link_url || '');
    const paymentLinkStatus = String(paymentLink?.status || '');

    if (!paymentLinkId || !paymentLinkUrl) {
      return NextResponse.json(
        {
          error: 'qonto_payment_link_missing_fields',
          details: {
            has_payment_link: Boolean(paymentLink),
            keys: paymentLink ? Object.keys(paymentLink) : [],
          },
        },
        { status: 502 }
      );
    }

    await adminDb
      .collection('invoices')
      .doc(invoiceId)
      .set(
        {
          payment_provider: 'qonto',
          qonto_payment_link_id: paymentLinkId,
          qonto_payment_link_url: paymentLinkUrl,
          qonto_payment_link_status: paymentLinkStatus || 'open',
          qonto_last_sync_at: new Date().toISOString(),
        },
        { merge: true }
      );

    return NextResponse.json({ ok: true, paymentLink: { id: paymentLinkId, url: paymentLinkUrl, status: paymentLinkStatus } });
  } catch (e: any) {
    console.error('qonto payment-link error:', e);
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
