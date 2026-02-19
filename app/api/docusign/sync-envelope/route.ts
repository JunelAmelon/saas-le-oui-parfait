import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import {
  docusignRequest,
  downloadSignedCombinedPdf,
  getDocuSignEnv,
  uploadPdfBufferToCloudinary,
} from '@/lib/docusign';

export const runtime = 'nodejs';

type Body =
  | {
      docType: 'contract' | 'devis';
      docId: string;
    }
  | {
      envelopeId: string;
    };

function normalizeEmail(email: unknown) {
  return String(email || '').trim().toLowerCase();
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
    if (!token) return NextResponse.json({ error: 'missing_auth' }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(token);
    const callerUid = String(decoded?.uid || '').trim();
    if (!callerUid) return NextResponse.json({ error: 'missing_uid' }, { status: 401 });

    const body = (await req.json().catch(() => null)) as Body | null;
    if (!body) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

    const env = getDocuSignEnv();

    let envelopeId = '';
    let docType: 'contract' | 'devis' | null = null;
    let docId: string | null = null;

    if ('envelopeId' in body) {
      envelopeId = String(body.envelopeId || '').trim();
    } else {
      docType = body.docType;
      docId = String(body.docId || '').trim();
      if (!docType || !docId) return NextResponse.json({ error: 'missing_params' }, { status: 400 });

      const col = docType === 'contract' ? 'contracts' : 'devis';
      const docSnap = await adminDb.collection(col).doc(docId).get();
      const docData = docSnap.exists ? (docSnap.data() as any) : null;
      envelopeId = String(docData?.docusign?.envelope_id || '').trim();
      if (!envelopeId) return NextResponse.json({ error: 'missing_envelope_id' }, { status: 400 });
    }

    const metaSnap = await adminDb.collection('docusign_envelopes').doc(envelopeId).get();
    const meta = metaSnap.exists ? (metaSnap.data() as any) : null;

    // Fetch canonical envelope status from DocuSign
    const envelope = await docusignRequest<{ status?: string }>({
      method: 'GET',
      path: `/v2.1/accounts/${env.accountId}/envelopes/${envelopeId}`,
    });

    const envelopeStatus = String(envelope?.status || '').trim();
    const normalizedStatus = envelopeStatus.toLowerCase();
    const isCompleted = normalizedStatus === 'completed';

    // Fetch per-recipient statuses from DocuSign
    let recipientsPayload: any = undefined;
    try {
      const recipients = await docusignRequest<{ signers?: Array<{ email?: string; status?: string }> }>({
        method: 'GET',
        path: `/v2.1/accounts/${env.accountId}/envelopes/${envelopeId}/recipients`,
      });

      const clientEmail = normalizeEmail(meta?.client_email);
      const plannerEmail = normalizeEmail(meta?.planner_email);

      const signers = Array.isArray(recipients?.signers) ? recipients.signers : [];
      const signerStatusByEmail = new Map<string, string>();
      for (const s of signers) {
        const e = normalizeEmail(s?.email);
        if (!e) continue;
        signerStatusByEmail.set(e, String(s?.status || ''));
      }

      const clientRecipientStatus = clientEmail ? signerStatusByEmail.get(clientEmail) || '' : '';
      const plannerRecipientStatus = plannerEmail ? signerStatusByEmail.get(plannerEmail) || '' : '';

      recipientsPayload = {
        client: { email: clientEmail || undefined, status: clientRecipientStatus || undefined },
        planner: { email: plannerEmail || undefined, status: plannerRecipientStatus || undefined },
      };

      await adminDb
        .collection('docusign_envelopes')
        .doc(envelopeId)
        .set({ recipients: recipientsPayload, updated_at: new Date().toISOString() }, { merge: true });
    } catch (e) {
      console.warn('docusign sync-envelope: recipients fetch failed:', e);
    }

    // Store/update envelope meta
    await adminDb
      .collection('docusign_envelopes')
      .doc(envelopeId)
      .set({ status: envelopeStatus || undefined, updated_at: new Date().toISOString() }, { merge: true });

    // If we can identify the target doc, propagate status/recipients.
    // Prefer existing meta.doc_type/doc_id, fallback to request body.
    const targetDocType = (meta?.doc_type as 'contract' | 'devis' | undefined) || docType || undefined;
    const targetDocId = String(meta?.doc_id || docId || '').trim() || undefined;

    if (targetDocType && targetDocId) {
      const targetCollection = targetDocType === 'contract' ? 'contracts' : 'devis';
      await adminDb
        .collection(targetCollection)
        .doc(targetDocId)
        .set(
          {
            docusign: {
              envelope_id: envelopeId,
              status: envelopeStatus || undefined,
              updated_at: new Date().toISOString(),
              recipients: recipientsPayload,
            },
          },
          { merge: true }
        );
    }

    // If completed, download signed combined PDF and replace pdf_url (same behavior as webhook)
    let signedPdfUrl: string | null = null;
    if (isCompleted && targetDocType && targetDocId) {
      try {
        const signedPdf = await downloadSignedCombinedPdf(envelopeId);
        const uploadedUrl = await uploadPdfBufferToCloudinary({
          buffer: signedPdf,
          filename: `signed-${targetDocType}-${targetDocId}-${Date.now()}`,
        });
        signedPdfUrl = uploadedUrl;

        if (targetDocType === 'contract') {
          await adminDb.collection('contracts').doc(targetDocId).set(
            {
              pdf_url: uploadedUrl,
              status: 'signed',
              signed_at: new Date().toISOString(),
              docusign: {
                envelope_id: envelopeId,
                status: 'completed',
                updated_at: new Date().toISOString(),
                recipients: recipientsPayload,
                signed_pdf_url: uploadedUrl,
              },
            },
            { merge: true }
          );

          try {
            const docsSnap = await adminDb.collection('documents').where('contract_id', '==', targetDocId).get();
            await Promise.all(
              docsSnap.docs.map((d) =>
                d.ref.set(
                  {
                    file_url: uploadedUrl,
                    status: 'signed',
                    updated_at: new Date().toISOString(),
                  },
                  { merge: true }
                )
              )
            );
          } catch (e) {
            console.warn('docusign sync-envelope: unable to update documents for contract:', e);
          }
        } else {
          await adminDb.collection('devis').doc(targetDocId).set(
            {
              pdf_url: uploadedUrl,
              status: 'signed',
              signed_at: new Date().toISOString(),
              docusign: {
                envelope_id: envelopeId,
                status: 'completed',
                updated_at: new Date().toISOString(),
                recipients: recipientsPayload,
                signed_pdf_url: uploadedUrl,
              },
            },
            { merge: true }
          );

          try {
            const docsSnap = await adminDb.collection('documents').where('devis_id', '==', targetDocId).get();
            await Promise.all(
              docsSnap.docs.map((d) =>
                d.ref.set(
                  {
                    file_url: uploadedUrl,
                    status: 'signed',
                    updated_at: new Date().toISOString(),
                  },
                  { merge: true }
                )
              )
            );
          } catch (e) {
            console.warn('docusign sync-envelope: unable to update documents for devis:', e);
          }
        }

        await adminDb.collection('docusign_envelopes').doc(envelopeId).set(
          {
            status: 'completed',
            updated_at: new Date().toISOString(),
            signed_pdf_url: uploadedUrl,
          },
          { merge: true }
        );
      } catch (e) {
        console.warn('docusign sync-envelope: completed post-processing failed:', e);
      }
    }

    return NextResponse.json({
      ok: true,
      envelopeId,
      status: envelopeStatus || null,
      recipients: recipientsPayload || null,
      isCompleted,
      signedPdfUrl,
    });
  } catch (e: any) {
    console.error('docusign sync-envelope error:', e);
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
