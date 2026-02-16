import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { downloadSignedCombinedPdf, uploadPdfBufferToCloudinary } from '@/lib/docusign';

// Minimal webhook endpoint. In production you should validate DocuSign Connect signatures.
export async function POST(req: Request) {
  try {
    const bodyText = await req.text();

    // DocuSign Connect typically sends XML. Some configurations can send JSON.
    // We'll store raw payload for now.
    const receivedAt = new Date().toISOString();

    // Best-effort parse envelopeId from common JSON payloads
    let envelopeId: string | null = null;
    try {
      const json = JSON.parse(bodyText);
      envelopeId = json?.data?.envelopeId || json?.envelopeId || null;
    } catch {
      // ignore
    }

    await adminDb.collection('docusign_webhooks').add({ receivedAt, body: bodyText, envelopeId });

    if (envelopeId) {
      // If completed, download signed PDF + replace pdf_url
      // We don't strictly depend on event parsing here; this is best effort.
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
