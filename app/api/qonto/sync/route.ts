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

    const paymentLinkId = String(inv.qonto_payment_link_id || '').trim();
    if (!paymentLinkId) {
      return NextResponse.json({ ok: true, skipped: 'no_payment_link' });
    }

    let pl: any;
    try {
      pl = await qontoRequest<any>({ method: 'GET', path: `/v2/payment_links/${encodeURIComponent(paymentLinkId)}` });
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

    const paymentLink = pl?.payment_link || pl?.paymentLink || pl;
    const status = String(paymentLink?.status || pl?.status || '');
    const url = String(paymentLink?.url || pl?.url || inv.qonto_payment_link_url || '');

    const patch: any = {
      qonto_payment_link_status: status || null,
      qonto_last_sync_at: new Date().toISOString(),
    };

    // Minimal mapping: if payment link is paid, mark invoice as paid.
    if (status === 'paid') {
      const amount = Number(inv.montant_ttc ?? inv.amount ?? 0);
      patch.status = 'paid';
      patch.method = 'qonto_payment_link';
      patch.paid = amount;
      patch.paid_at = new Date().toISOString();
    }

    await adminDb.collection('invoices').doc(invoiceId).set(patch, { merge: true });

    return NextResponse.json({ ok: true, paymentLink: { id: paymentLinkId, url, status } });
  } catch (e: any) {
    console.error('qonto sync error:', e);
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
