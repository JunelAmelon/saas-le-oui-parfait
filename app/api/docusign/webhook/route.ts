import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { docusignRequest, getDocuSignEnv, downloadSignedCombinedPdf, uploadPdfBufferToCloudinary } from '@/lib/docusign';

export const runtime = 'nodejs';

// Minimal webhook endpoint. In production you should validate DocuSign Connect signatures.
export async function POST(req: Request) {
  try {
    const bodyText = await req.text();

    // DocuSign Connect typically sends XML. Some configurations can send JSON.
    // We'll store raw payload for now.
    const receivedAt = new Date().toISOString();

    // Best-effort parse envelopeId / status from common JSON payloads
    let envelopeId: string | null = null;
    let envelopeStatus: string | null = null;
    try {
      const json = JSON.parse(bodyText);
      envelopeId = json?.data?.envelopeId || json?.envelopeId || json?.envelopeIdHeader || null;
      envelopeStatus =
        json?.data?.envelopeSummary?.status ||
        json?.envelopeSummary?.status ||
        json?.status ||
        json?.event ||
        null;
    } catch {
      // ignore
    }

    await adminDb.collection('docusign_webhooks').add({ receivedAt, body: bodyText, envelopeId, envelopeStatus });

    let normalizedStatus = String(envelopeStatus || '').trim().toLowerCase();
    let isCompleted = normalizedStatus === 'completed' || normalizedStatus === 'complete' || normalizedStatus === 'envelope-completed';

    if (envelopeId) {
      // DocuSign Connect may send XML, so we can't always trust status in the payload.
      // Fetch the envelope status from DocuSign to avoid marking documents as signed too early.
      try {
        const env = getDocuSignEnv();
        const envelope = await docusignRequest<{ status?: string }>({
          method: 'GET',
          path: `/v2.1/accounts/${env.accountId}/envelopes/${envelopeId}`,
        });
        const apiStatus = String(envelope?.status || '').trim();
        if (apiStatus) {
          envelopeStatus = envelopeStatus || apiStatus;
          normalizedStatus = apiStatus.toLowerCase();
          isCompleted = normalizedStatus === 'completed';
        }
      } catch (e) {
        // If DocuSign API is unavailable, fall back to payload-derived status.
        console.warn('Unable to fetch envelope status from DocuSign:', e);
      }

      // Persist per-recipient status (so UI can know if admin/client already signed)
      try {
        const env = getDocuSignEnv();
        const recipients = await docusignRequest<{ signers?: Array<{ email?: string; status?: string }> }>({
          method: 'GET',
          path: `/v2.1/accounts/${env.accountId}/envelopes/${envelopeId}/recipients`,
        });

        const metaSnap = await adminDb.collection('docusign_envelopes').doc(envelopeId).get();
        const meta = metaSnap.exists ? (metaSnap.data() as any) : null;

        const clientEmail = String(meta?.client_email || '').trim().toLowerCase();
        const plannerEmail = String(meta?.planner_email || '').trim().toLowerCase();

        const signers = Array.isArray(recipients?.signers) ? recipients.signers : [];
        const signerStatusByEmail = new Map<string, string>();
        for (const s of signers) {
          const e = String(s?.email || '').trim().toLowerCase();
          if (!e) continue;
          signerStatusByEmail.set(e, String(s?.status || ''));
        }

        const clientRecipientStatus = clientEmail ? signerStatusByEmail.get(clientEmail) || '' : '';
        const plannerRecipientStatus = plannerEmail ? signerStatusByEmail.get(plannerEmail) || '' : '';

        const recipientsPayload = {
          client: { email: clientEmail || undefined, status: clientRecipientStatus || undefined },
          planner: { email: plannerEmail || undefined, status: plannerRecipientStatus || undefined },
        };

        await adminDb
          .collection('docusign_envelopes')
          .doc(envelopeId)
          .set({ recipients: recipientsPayload, updated_at: new Date().toISOString() }, { merge: true });

        if (meta?.doc_type && meta?.doc_id) {
          const targetCollection = meta.doc_type === 'contract' ? 'contracts' : 'devis';
          await adminDb
            .collection(targetCollection)
            .doc(String(meta.doc_id))
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
      } catch (e) {
        console.warn('Unable to update per-recipient statuses from DocuSign:', e);
      }

      try {
        await adminDb.collection('docusign_envelopes').doc(envelopeId).set(
          {
            status: envelopeStatus || undefined,
            updated_at: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (e) {
        console.warn('Unable to update docusign_envelopes status:', e);
      }

      // If completed, download signed PDF + replace pdf_url
      // We don't strictly depend on event parsing here; this is best effort.
      if (!isCompleted) {
        return NextResponse.json({ ok: true });
      }

      try {
        const metaSnap = await adminDb.collection('docusign_envelopes').doc(envelopeId).get();
        const meta = metaSnap.exists ? (metaSnap.data() as any) : null;
        if (meta?.doc_type && meta?.doc_id) {
          const signedPdf = await downloadSignedCombinedPdf(envelopeId);
          const signedUrl = await uploadPdfBufferToCloudinary({
            buffer: signedPdf,
            filename: `signed-${meta.doc_type}-${meta.doc_id}-${Date.now()}`,
          });

          if (meta.doc_type === 'contract') {
            await adminDb.collection('contracts').doc(meta.doc_id).set(
              {
                pdf_url: signedUrl,
                status: 'signed',
                signed_at: new Date().toISOString(),
                docusign: {
                  envelope_id: envelopeId,
                  status: 'completed',
                  updated_at: new Date().toISOString(),
                  signed_pdf_url: signedUrl,
                },
              },
              { merge: true }
            );

            try {
              const docsSnap = await adminDb
                .collection('documents')
                .where('contract_id', '==', meta.doc_id)
                .get();
              await Promise.all(
                docsSnap.docs.map((d) =>
                  d.ref.set(
                    {
                      file_url: signedUrl,
                      status: 'signed',
                      updated_at: new Date().toISOString(),
                    },
                    { merge: true }
                  )
                )
              );
            } catch (e) {
              console.warn('Unable to update documents for contract:', e);
            }
          } else {
            await adminDb.collection('devis').doc(meta.doc_id).set(
              {
                pdf_url: signedUrl,
                status: 'signed',
                signed_at: new Date().toISOString(),
                docusign: {
                  envelope_id: envelopeId,
                  status: 'completed',
                  updated_at: new Date().toISOString(),
                  signed_pdf_url: signedUrl,
                },
              },
              { merge: true }
            );

            // Create invoice for the signed devis (idempotent)
            try {
              const existingInvoiceSnap = await adminDb
                .collection('invoices')
                .where('devis_id', '==', String(meta.doc_id))
                .limit(1)
                .get();
              if (existingInvoiceSnap.empty) {
                const devisSnap = await adminDb.collection('devis').doc(String(meta.doc_id)).get();
                const devisData = devisSnap.exists ? (devisSnap.data() as any) : null;
                const ref = String(devisData?.reference || 'Devis').trim();
                const invoiceRef = `FACT-${ref.replace(/^DEVIS[-\s]*/i, '').replace(/^DEV[-\s]*/i, '').trim() || String(meta.doc_id)}`;
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
                  pdf_url: signedUrl,
                  source: 'devis',
                  devis_id: String(meta.doc_id),
                  created_at: new Date(),
                });
              }
            } catch (e) {
              console.warn('Unable to create invoice for signed devis:', e);
            }

            try {
              const docsSnap = await adminDb
                .collection('documents')
                .where('devis_id', '==', meta.doc_id)
                .get();
              await Promise.all(
                docsSnap.docs.map((d) =>
                  d.ref.set(
                    {
                      file_url: signedUrl,
                      status: 'signed',
                      updated_at: new Date().toISOString(),
                    },
                    { merge: true }
                  )
                )
              );
            } catch (e) {
              console.warn('Unable to update documents for devis:', e);
            }
          }

          await adminDb.collection('docusign_envelopes').doc(envelopeId).set(
            { status: 'completed', updated_at: new Date().toISOString(), signed_pdf_url: signedUrl },
            { merge: true }
          );
        }
      } catch (e) {
        console.warn('docusign webhook post-processing error:', e);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('docusign webhook error:', e);
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
