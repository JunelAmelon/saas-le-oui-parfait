import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { docusignRequest, fetchPdfAsBase64, getDocuSignEnv } from '@/lib/docusign';

export const runtime = 'nodejs';

type Body = {
  docType: 'contract' | 'devis';
  docId: string;
};

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
    if (!token) return NextResponse.json({ error: 'missing_auth' }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(token);
    const callerUid = String(decoded?.uid || '').trim();

    const body = (await req.json()) as Body;
    const docType = body?.docType;
    const docId = String(body?.docId || '').trim();
    if (!docType || !docId) return NextResponse.json({ error: 'missing_params' }, { status: 400 });

    const env = getDocuSignEnv();

    let pdfUrl = '';
    let clientEmail = '';
    let clientName = 'Client';
    let reference = 'Document';
    let clientId: string | null = null;
    let plannerId: string | null = null;

    if (docType === 'contract') {
      const snap = await adminDb.collection('contracts').doc(docId).get();
      const c = snap.exists ? (snap.data() as any) : null;
      if (!c) return NextResponse.json({ error: 'contract_not_found' }, { status: 404 });
      pdfUrl = String(c.pdf_url || '');
      clientEmail = String(c.client_email || '');
      clientName = String(c.client || c.client_name || 'Client');
      reference = String(c.reference || 'Contrat');
      clientId = c.client_id || null;
      plannerId = c.planner_id || null;
    } else {
      const snap = await adminDb.collection('devis').doc(docId).get();
      const d = snap.exists ? (snap.data() as any) : null;
      if (!d) return NextResponse.json({ error: 'devis_not_found' }, { status: 404 });
      pdfUrl = String(d.pdf_url || '');
      clientEmail = String(d.client_email || '');
      clientName = String(d.client || d.client_name || 'Client');
      reference = String(d.reference || 'Devis');
      clientId = d.client_id || null;
      plannerId = d.planner_id || null;
    }

    let clientUserId: string | null = null;
    if (clientId) {
      try {
        const clientSnap = await adminDb.collection('clients').doc(String(clientId)).get();
        const client = clientSnap.exists ? (clientSnap.data() as any) : null;
        clientUserId = client?.client_user_id || null;
      } catch {
        // ignore
      }
    }

    const plannerUid = String(plannerId || '').trim();
    if (!plannerUid) return NextResponse.json({ error: 'missing_planner_id' }, { status: 400 });

    // Only the planner or the linked client can initiate envelope creation.
    if (callerUid && callerUid !== plannerUid && callerUid !== String(clientUserId || '')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    let plannerEmail = '';
    let plannerName = 'Wedding Planner';
    try {
      const profileSnap = await adminDb.collection('profiles').doc(plannerUid).get();
      const p = profileSnap.exists ? (profileSnap.data() as any) : null;
      plannerEmail = String(p?.email || '').trim().toLowerCase();
      plannerName = String(p?.full_name || p?.displayName || plannerName);
    } catch {
      // ignore
    }

    if (!plannerEmail) {
      try {
        const u = await adminAuth.getUser(plannerUid);
        plannerEmail = String(u?.email || '').trim().toLowerCase();
        plannerName = String(u?.displayName || plannerName);
      } catch {
        // ignore
      }
    }

    if (!plannerEmail) return NextResponse.json({ error: 'missing_planner_email' }, { status: 400 });

    if (!pdfUrl) return NextResponse.json({ error: 'missing_pdf_url' }, { status: 400 });
    if (!clientEmail) return NextResponse.json({ error: 'missing_client_email' }, { status: 400 });

    const pdfBase64 = await fetchPdfAsBase64(pdfUrl);

    // Minimal tabs with fixed positions (page 1). We'll refine later if needed.
    const clientRecipientId = '1';
    const plannerRecipientId = '2';

    const envelopeDefinition = {
      emailSubject: `${docType === 'contract' ? 'Signature du contrat' : 'Signature du devis'} - ${reference}`,
      status: 'sent',
      documents: [
        {
          documentBase64: pdfBase64,
          name: `${reference}.pdf`,
          fileExtension: 'pdf',
          documentId: '1',
        },
      ],
      recipients: {
        signers: [
          {
            email: clientEmail,
            name: clientName,
            recipientId: clientRecipientId,
            routingOrder: '1',
            clientUserId: clientEmail,
          },
          {
            email: plannerEmail,
            name: plannerName,
            recipientId: plannerRecipientId,
            routingOrder: '1',
            clientUserId: plannerEmail,
          },
        ],
      },
    };

    const created = await docusignRequest<{ envelopeId: string; status: string }>({
      method: 'POST',
      path: `/v2.1/accounts/${env.accountId}/envelopes`,
      body: envelopeDefinition,
    });

    const envelopeId = String(created?.envelopeId || '');
    if (!envelopeId) return NextResponse.json({ error: 'missing_envelope_id' }, { status: 500 });

    const dsData = {
      envelope_id: envelopeId,
      status: created?.status || 'sent',
      doc_type: docType,
      doc_id: docId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      client_email: clientEmail,
      client_name: clientName,
      planner_email: plannerEmail,
      planner_uid: plannerUid,
      client_user_id: clientUserId,
      client_id: clientId,
    };

    await adminDb.collection('docusign_envelopes').doc(envelopeId).set(dsData, { merge: true });

    if (docType === 'contract') {
      await adminDb.collection('contracts').doc(docId).set(
        {
          docusign: {
            envelope_id: envelopeId,
            status: created?.status || 'sent',
            updated_at: new Date().toISOString(),
            client_email: clientEmail,
            planner_email: plannerEmail,
          },
        },
        { merge: true }
      );
    } else {
      await adminDb.collection('devis').doc(docId).set(
        {
          docusign: {
            envelope_id: envelopeId,
            status: created?.status || 'sent',
            updated_at: new Date().toISOString(),
            client_email: clientEmail,
            planner_email: plannerEmail,
          },
        },
        { merge: true }
      );
    }

    return NextResponse.json({ ok: true, envelopeId });
  } catch (e: any) {
    console.error('docusign create-envelope error:', e);
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
