'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Loader2, Eye, Download, CheckCircle, XCircle, MoreVertical } from 'lucide-react';
import { addDocument, updateDocument } from '@/lib/db';
import { DevisData, getClientDevis } from '@/lib/client-helpers';
import { uploadPdf } from '@/lib/storage';
import { auth } from '@/lib/firebase';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ClientDevisProps {
  clientId: string;
  clientEmail?: string;
  variant?: 'list' | 'table';
}

const statusBadge: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

export function ClientDevis({ clientId, clientEmail, variant = 'list' }: ClientDevisProps) {
  const router = useRouter();
  const [devis, setDevis] = useState<DevisData[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [signingId, setSigningId] = useState<string | null>(null);

  const syncedEnvelopeIdsRef = useRef<Set<string>>(new Set());

  const stampDevisPdfToFacture = async (params: {
    devisPdfUrl: string;
  }): Promise<Blob> => {
    const res = await fetch(params.devisPdfUrl);
    if (!res.ok) {
      throw new Error(`Unable to download devis PDF (${res.status})`);
    }
    const pdfBytes = await res.arrayBuffer();

    const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    if (!pages.length) {
      throw new Error('Devis PDF has no pages');
    }

    const page = pages[0];
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Overlay on the top-right title area used by our generated devis PDFs.
    // We hide the old label (DEVIS) by drawing a white rectangle, then write FACTURE.
    const rectW = 180;
    const rectH = 54;
    const rectX = width - 24 - rectW;
    const rectY = height - 24 - 62;

    page.drawRectangle({
      x: rectX,
      y: rectY,
      width: rectW,
      height: rectH,
      color: rgb(1, 1, 1),
      borderColor: rgb(1, 1, 1),
    });

    page.drawText('FACTURE', {
      x: rectX + 14,
      y: rectY + 26,
      size: 20,
      font,
      color: rgb(0.35, 0.0, 0.45),
    });

    const stampedBytes = await pdfDoc.save();
    const stampedArrayBuffer = Uint8Array.from(stampedBytes).buffer;
    return new Blob([stampedArrayBuffer], { type: 'application/pdf' });
  };

  useEffect(() => {
    async function fetchDevis() {
      try {
        setLoading(true);
        const items = await getClientDevis(clientId, clientEmail);
        setDevis(items);

        // Auto-sync DocuSign status (fallback without Connect)
        try {
          const idToken = await auth.currentUser?.getIdToken().catch(() => null);
          if (!idToken) return;

          const toSync = (items as any[])
            .map((dv) => ({
              docId: String(dv?.id || '').trim(),
              envelopeId: String(dv?.docusign?.envelope_id || '').trim(),
              status: String(dv?.docusign?.status || dv?.status || '').trim().toLowerCase(),
            }))
            .filter((x) => x.docId && x.envelopeId && x.status !== 'completed')
            .filter((x) => !syncedEnvelopeIdsRef.current.has(x.envelopeId));

          if (toSync.length === 0) return;
          toSync.forEach((x) => syncedEnvelopeIdsRef.current.add(x.envelopeId));

          await Promise.allSettled(
            toSync.slice(0, 3).map((x) =>
              fetch('/api/docusign/sync-envelope', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({ docType: 'devis', docId: x.docId }),
              })
            )
          );

          setTimeout(() => {
            fetchDevis();
          }, 800);
        } catch (e) {
          console.warn('DocuSign sync fallback failed (client devis):', e);
        }
      } catch (e) {
        console.error('Error fetching client devis:', e);
        setDevis([]);
      } finally {
        setLoading(false);
      }
    }

    if (clientId) {
      fetchDevis();
    }
  }, [clientId, clientEmail]);

  const isDocusignCompleted = (d: DevisData) => {
    const ds = String((d as any)?.docusign?.status || '').trim().toLowerCase();
    const st = String(d.status || '').trim().toLowerCase();
    return ds === 'completed' || st === 'signed';
  };

  const visibleDevis = useMemo(() => {
    return devis
      .filter((d) => d.status !== 'draft')
      .slice()
      .sort((a, b) => String(b.sent_at || b.date || '').localeCompare(String(a.sent_at || a.date || '')));
  }, [devis]);

  const openPdf = (d: DevisData) => {
    if (d.pdf_url) window.open(d.pdf_url, '_blank');
  };

  const downloadPdf = (d: DevisData) => {
    if (!d.pdf_url) return;
    const link = document.createElement('a');
    link.href = d.pdf_url;
    link.download = `${d.reference}.pdf`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const acceptDevis = async (d: DevisData) => {
    setSigningId(d.id);
    try {
      const idToken = await auth.currentUser?.getIdToken().catch(() => null);
      if (!idToken) {
        toast.error('Vous devez être connecté');
        return;
      }

      // Mark as accepted (business validation) before signature
      await updateDocument('devis', d.id, {
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      });

      // Create envelope if missing
      const existingEnvelopeId = String((d as any)?.docusign?.envelope_id || '').trim();
      let envelopeId = existingEnvelopeId;
      if (!envelopeId) {
        const createRes = await fetch('/api/docusign/create-envelope', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ docType: 'devis', docId: d.id }),
        });
        const createJson = await createRes.json().catch(() => null);
        if (!createRes.ok) {
          toast.error(createJson?.error || 'Impossible de préparer la signature');
          return;
        }
        envelopeId = String(createJson?.envelopeId || '');
      }

      if (!envelopeId) {
        toast.error('Envelope introuvable');
        return;
      }

      const viewRes = await fetch('/api/docusign/recipient-view', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ envelopeId, recipientRole: 'client' }),
      });
      const viewJson = await viewRes.json().catch(() => null);
      if (!viewRes.ok) {
        toast.error(viewJson?.error || 'Impossible d’ouvrir la signature');
        return;
      }

      const url = String(viewJson?.url || '').trim();
      if (!url) {
        toast.error('URL de signature introuvable');
        return;
      }

      setDevis((prev) => prev.map((x) => (x.id === d.id ? { ...x, status: 'accepted' } : x)));
      window.location.href = url;
    } catch (e) {
      console.error('Error accepting/signing devis:', e);
      toast.error('Erreur lors de la validation');
    } finally {
      setSigningId(null);
    }
  };

  const rejectDevis = async (d: DevisData) => {
    setSavingId(d.id);
    try {
      await updateDocument('devis', d.id, {
        status: 'rejected',
        rejected_at: new Date().toISOString(),
      });
      setDevis((prev) => prev.map((x) => (x.id === d.id ? { ...x, status: 'rejected' } : x)));
    } catch (e) {
      console.error('Error rejecting devis:', e);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Card className="p-6 shadow-xl border-0">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold text-brand-purple flex items-center gap-2">
            <FileText className="h-6 w-6 text-brand-turquoise" />
            Devis
          </h3>
          <p className="text-sm text-brand-gray">Consultez et validez vos devis</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-brand-turquoise" />
        </div>
      ) : visibleDevis.length === 0 ? (
        <div className="text-gray-500 italic text-center p-4">Aucun devis reçu pour le moment.</div>
      ) : (
        variant === 'table' ? (
          <div className="rounded-lg border border-gray-200 overflow-x-auto">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Référence</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleDevis.slice(0, 5).map((d) => {
                  const badgeClass = statusBadge[d.status] || 'bg-gray-100 text-gray-700';
                  const isBusy = savingId === d.id;
                  const isCompleted = isDocusignCompleted(d);
                  const dsRecipients: any = (d as any)?.docusign?.recipients || null;
                  const clientRecipientStatus = String(dsRecipients?.client?.status || '').toLowerCase();
                  const clientSigned = clientRecipientStatus === 'completed';
                  const canClientSign = d.status === 'sent' && !clientSigned && !isCompleted;

                  return (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium text-brand-purple">{d.reference}</TableCell>
                      <TableCell className="text-brand-gray">{String(d.date || '').trim() || '-'}</TableCell>
                      <TableCell>
                        <Badge className={badgeClass}>{d.status}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap w-[1%]">
                        <div className="flex items-center justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              {d.pdf_url ? (
                                <>
                                  <DropdownMenuItem onClick={() => openPdf(d)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Visualiser
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => downloadPdf(d)}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Télécharger
                                  </DropdownMenuItem>
                                </>
                              ) : null}

                              {canClientSign ? (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => void acceptDevis(d)}
                                    disabled={isBusy || signingId === d.id}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Valider &amp; signer
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => void rejectDevis(d)} disabled={isBusy}>
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Refuser
                                  </DropdownMenuItem>
                                </>
                              ) : null}

                              {d.status === 'accepted' && isCompleted ? (
                                <DropdownMenuItem onClick={() => router.push('/espace-client/paiements')}>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Paiement
                                </DropdownMenuItem>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleDevis.slice(0, 5).map((d) => {
              const badgeClass = statusBadge[d.status] || 'bg-gray-100 text-gray-700';
              const isBusy = savingId === d.id;
              const isCompleted = isDocusignCompleted(d);
              const dsRecipients: any = (d as any)?.docusign?.recipients || null;
              const clientRecipientStatus = String(dsRecipients?.client?.status || '').toLowerCase();
              const clientSigned = clientRecipientStatus === 'completed';
              const canClientSign = d.status === 'sent' && !clientSigned && !isCompleted;

              return (
                <div key={d.id} className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-brand-purple truncate">{d.reference}</p>
                      <p className="text-xs text-brand-gray">{d.date || ''}</p>
                    </div>
                    <Badge className={badgeClass}>{d.status}</Badge>
                  </div>

                  <div className="mt-3 flex items-center justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-9 w-9">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        {d.pdf_url ? (
                          <>
                            <DropdownMenuItem onClick={() => openPdf(d)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Visualiser
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => downloadPdf(d)}>
                              <Download className="h-4 w-4 mr-2" />
                              Télécharger
                            </DropdownMenuItem>
                          </>
                        ) : null}

                        {canClientSign ? (
                          <>
                            <DropdownMenuItem onClick={() => void acceptDevis(d)} disabled={isBusy || signingId === d.id}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Valider &amp; signer
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void rejectDevis(d)} disabled={isBusy}>
                              <XCircle className="h-4 w-4 mr-2" />
                              Refuser
                            </DropdownMenuItem>
                          </>
                        ) : null}

                        {d.status === 'accepted' && isCompleted ? (
                          <DropdownMenuItem onClick={() => router.push('/espace-client/paiements')}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Paiement
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </Card>
  );
}
