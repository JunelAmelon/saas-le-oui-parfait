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

      // Business rule: a devis is considered "accepted" only once the client has completed their signature.
      // We do not wait for the full envelope to be completed (planner may sign after).
      if (targetDocType === 'devis') {
        const clientRecipientStatus = String(recipientsPayload?.client?.status || '').toLowerCase();
        const clientSigned = clientRecipientStatus === 'completed';
        if (clientSigned) {
          try {
            const devisSnap = await adminDb.collection('devis').doc(targetDocId).get();
            const devisData = devisSnap.exists ? (devisSnap.data() as any) : null;
            const currentStatus = String(devisData?.status || '').toLowerCase();
            if (currentStatus !== 'signed' && currentStatus !== 'completed') {
              const acceptedAtExisting = devisData?.accepted_at;
              await adminDb.collection('devis').doc(targetDocId).set(
                {
                  status: 'accepted',
                  accepted_at: acceptedAtExisting || new Date().toISOString(),
                },
                { merge: true }
              );
            }
          } catch (e) {
            console.warn('docusign sync-envelope: unable to mark devis accepted after client signature:', e);
          }
        }
      }
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

          // Create invoice for the signed devis (idempotent)
          try {
            const existingInvoiceSnap = await adminDb
              .collection('invoices')
              .where('devis_id', '==', targetDocId)
              .limit(1)
              .get();
            if (existingInvoiceSnap.empty) {
              const devisSnap = await adminDb.collection('devis').doc(targetDocId).get();
              const devisData = devisSnap.exists ? (devisSnap.data() as any) : null;
              const ref = String(devisData?.reference || 'Devis').trim();
              const invoiceRef = `FACT-${ref.replace(/^DEVIS[-\s]*/i, '').replace(/^DEV[-\s]*/i, '').trim() || targetDocId}`;
              const invoiceDate = new Date().toLocaleDateString('fr-FR');
              const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR');

              await adminDb.collection('invoices').add({
                planner_id: devisData?.planner_id || meta?.planner_uid || null,
                client_id: devisData?.client_id || meta?.client_id || null,
                reference: invoiceRef,
                client: devisData?.client || devisData?.client_name || '',
                client_email: devisData?.client_email || meta?.client_email || '',
                date: invoiceDate,
                due_date: dueDate,
                montant_ht: Number(devisData?.montant_ht ?? 0) || 0,
                montant_ttc: Number(devisData?.montant_ttc ?? 0) || 0,
                paid: 0,
                status: 'pending',
                type: 'invoice',
                pdf_url: uploadedUrl,
                source: 'devis',
                devis_id: targetDocId,
                created_at: new Date(),
              });
            }
          } catch (e) {
            console.warn('docusign sync-envelope: unable to create invoice for signed devis:', e);
          }

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
