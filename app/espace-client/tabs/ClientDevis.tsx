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
  draft: 'bg-[rgba(75,68,86,0.07)] text-[#4B4456]',
  sent: 'bg-[rgba(136,183,181,0.16)] text-[#6a9a98]',
  accepted: 'bg-[rgba(136,183,181,0.16)] text-[#6a9a98]',
  rejected: 'bg-[#F3E3E6] text-[#B98A96]',
  signed: 'bg-[rgba(136,183,181,0.16)] text-[#6a9a98]',
};

const statusLabel: Record<string, string> = {
  draft: 'Brouillon',
  sent: 'Envoyé',
  accepted: 'Accepté',
  rejected: 'Refusé',
  signed: 'Signé',
};

const parseDevisDate = (raw: any): string => {
  if (!raw) return '-';
  if (typeof raw?.toDate === 'function') {
    return raw.toDate().toLocaleDateString('fr-FR');
  }
  const s = String(raw);
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString('fr-FR');
  }
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const dd = m[1].padStart(2, '0');
    const mm = m[2].padStart(2, '0');
    const yyyy = m[3];
    const d2 = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
    if (!Number.isNaN(d2.getTime())) return d2.toLocaleDateString('fr-FR');
  }
  return '-';
};

export function ClientDevis({ clientId, clientEmail, variant = 'list' }: ClientDevisProps) {
  const router = useRouter();
  const [devis, setDevis] = useState<DevisData[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [signingId, setSigningId] = useState<string | null>(null);

  const syncedEnvelopeIdsRef = useRef<Set<string>>(new Set());

  const stampDevisPdfToFacture = async (params: { devisPdfUrl: string }): Promise<Blob> => {
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
      color: rgb(0.35, 0, 0.45),
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

          for (const item of toSync) {
            try {
              const res = await fetch('/api/docusign/envelope-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ envelope_id: item.envelopeId }),
              });
              if (!res.ok) continue;
              const data = await res.json();
              const remoteStatus = String(data?.status || '').trim().toLowerCase();
              if (remoteStatus === 'completed') {
                await updateDocument('devis', item.docId, {
                  status: 'signed',
                  'docusign.status': 'completed',
                  signed_at: new Date().toISOString(),
                });
                syncedEnvelopeIdsRef.current.add(item.envelopeId);
                setDevis((prev) =>
                  prev.map((d) =>
                    d.id === item.docId
                      ? { ...d, status: 'signed', docusign: { ...(d.docusign || {}), status: 'completed' } }
                      : d
                  )
                );
              }
            } catch (e) {
              console.warn('DocuSign sync item failed', e);
            }
          }
        } catch (e) {
          console.warn('DocuSign sync batch failed', e);
        }
      } catch (error) {
        console.error('Error fetching devis', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDevis();
  }, [clientId, clientEmail]);

  const handleAccept = async (id: string) => {
    setSavingId(id);
    try {
      await updateDocument('devis', id, { status: 'accepted' });
      setDevis((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'accepted' } : d)));
      toast.success('Devis accepté');
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de l\'acceptation');
    } finally {
      setSavingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setSavingId(id);
    try {
      await updateDocument('devis', id, { status: 'rejected' });
      setDevis((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'rejected' } : d)));
      toast.success('Devis refusé');
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors du refus');
    } finally {
      setSavingId(null);
    }
  };

  const handleSign = async (dv: DevisData) => {
    if (!dv?.id || !dv.pdf_url) return;
    setSigningId(dv.id);
    try {
      const res = await fetch('/api/docusign/send-envelope', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_email: clientEmail || '',
          client_name: dv.client_name || clientEmail || '',
          devis_id: dv.id,
          pdf_url: dv.pdf_url,
        }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) {
        throw new Error(data?.error || 'Erreur DocuSign');
      }
      const envelopeId = data?.envelope_id;
      if (envelopeId) {
        await updateDocument('devis', dv.id, {
          'docusign.envelope_id': envelopeId,
          'docusign.status': 'sent',
        });
      }
      if (data?.signing_url) {
        window.open(data.signing_url, '_blank');
      }
      setDevis((prev) =>
        prev.map((d) =>
          d.id === dv.id ? { ...d, docusign: { ...(d.docusign || {}), envelope_id: envelopeId, status: 'sent' } } : d
        )
      );
      toast.success('Demande de signature envoyée');
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Erreur lors de la signature');
    } finally {
      setSigningId(null);
    }
  };

  const handleConvertToInvoice = async (dv: DevisData) => {
    if (!dv.pdf_url || !dv.amount || !clientId) return;
    try {
      const blob = await stampDevisPdfToFacture({ devisPdfUrl: dv.pdf_url });
      const url = await uploadPdf(blob, `factures/${clientId}/${dv.id}.pdf`);
      const paymentData = {
        client_id: clientId,
        devis_id: dv.id,
        description: dv.reference || `Facture ${dv.id}`,
        amount: dv.amount,
        status: 'pending',
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        file_url: url,
        created_at: new Date().toISOString(),
      };
      await addDocument('payments', paymentData);
      toast.success('Facture créée et paiement ajouté');
      router.refresh();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Erreur lors de la conversion');
    }
  };

  const sortedDevis = useMemo(
    () => devis.slice().sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()),
    [devis]
  );

  if (loading) {
    return (
      <div className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] p-6">
        <div className="flex justify-center p-4">
          <Loader2 className="animate-spin h-5 w-5 text-[#88b7b5]" />
        </div>
      </div>
    );
  }

  if (devis.length === 0) {
    return (
      <div className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] p-6">
        <h3 className="text-[17px] font-semibold text-[#4B4456] mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-[#88b7b5]" />
          Devis
        </h3>
        <p className="text-sm text-[#9C97A3] text-center py-4">Aucun devis pour le moment.</p>
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <Card className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] shadow-none p-5 sm:p-6 overflow-hidden">
        <h3 className="text-[17px] font-semibold text-[#4B4456] mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-[#88b7b5]" />
          Devis
        </h3>
        <div className="overflow-x-auto -mx-5 sm:-mx-6 px-5 sm:px-6">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[rgba(75,68,86,0.06)] hover:bg-transparent">
                <TableHead className="text-[10px] tracking-[0.1em] uppercase text-[#9C97A3] font-semibold">Référence</TableHead>
                <TableHead className="text-[10px] tracking-[0.1em] uppercase text-[#9C97A3] font-semibold">Date</TableHead>
                <TableHead className="text-[10px] tracking-[0.1em] uppercase text-[#9C97A3] font-semibold">Statut</TableHead>
                <TableHead className="text-[10px] tracking-[0.1em] uppercase text-[#9C97A3] font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedDevis.map((dv) => {
                const statusKey = (dv.status || 'draft').toLowerCase();
                return (
                  <TableRow key={dv.id} className="border-b border-[rgba(75,68,86,0.06)] hover:bg-[#FAF9F7]">
                    <TableCell className="text-sm font-medium text-[#4B4456]">{dv.reference || dv.id}</TableCell>
                    <TableCell className="text-sm text-[#5A5A5A]">
                      {parseDevisDate(dv.created_at)}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${statusBadge[statusKey] || statusBadge.draft} text-[10.5px] hover:bg-transparent`}>
                        {statusLabel[statusKey] || statusLabel.draft}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {dv.pdf_url && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-[#5A5A5A] hover:text-[#4B4456] hover:bg-[rgba(75,68,86,0.07)]"
                              onClick={() => window.open(dv.pdf_url, '_blank')}
                              title="Voir"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-[#5A5A5A] hover:text-[#4B4456] hover:bg-[rgba(75,68,86,0.07)]"
                              onClick={() => window.open(dv.pdf_url, '_blank')}
                              title="Télécharger"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-[#5A5A5A] hover:text-[#4B4456] hover:bg-[rgba(75,68,86,0.07)]"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            {statusKey !== 'accepted' && statusKey !== 'signed' && (
                              <DropdownMenuItem onClick={() => void handleAccept(dv.id)}>
                                <CheckCircle className="mr-2 h-4 w-4" /> Accepter
                              </DropdownMenuItem>
                            )}
                            {statusKey !== 'rejected' && (
                              <DropdownMenuItem onClick={() => void handleReject(dv.id)}>
                                <XCircle className="mr-2 h-4 w-4" /> Refuser
                              </DropdownMenuItem>
                            )}
                            {dv.pdf_url && (
                              <DropdownMenuItem onClick={() => void handleConvertToInvoice(dv)}>
                                <FileText className="mr-2 h-4 w-4" /> Convertir en facture
                              </DropdownMenuItem>
                            )}
                            {statusKey !== 'signed' && dv.pdf_url && (
                              <DropdownMenuItem onClick={() => void handleSign(dv)} disabled={signingId === dv.id}>
                                <FileText className="mr-2 h-4 w-4" /> Signer en ligne
                              </DropdownMenuItem>
                            )}
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
      </Card>
    );
  }

  return (
    <Card className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] shadow-none p-5 sm:p-6">
      <h3 className="text-[17px] font-semibold text-[#4B4456] mb-4 flex items-center gap-2">
        <FileText className="h-5 w-5 text-[#88b7b5]" />
        Devis
      </h3>
      <div className="space-y-2.5">
        {sortedDevis.map((dv) => {
          const statusKey = (dv.status || 'draft').toLowerCase();
          return (
            <div
              key={dv.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#FAF9F7]"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[#4B4456] text-sm truncate">{dv.reference || dv.id}</p>
                <p className="text-xs text-[#9C97A3]">
                  {parseDevisDate(dv.created_at)}
                </p>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-3">
                <Badge className={`${statusBadge[statusKey] || statusBadge.draft} text-[10.5px] hover:bg-transparent`}>
                  {statusLabel[statusKey] || statusLabel.draft}
                </Badge>
                <div className="flex items-center gap-1">
                  {dv.pdf_url && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-[#5A5A5A] hover:text-[#4B4456] hover:bg-[rgba(75,68,86,0.07)]"
                      onClick={() => window.open(dv.pdf_url, '_blank')}
                      title="Voir"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-[#5A5A5A] hover:text-[#4B4456] hover:bg-[rgba(75,68,86,0.07)]"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      {statusKey !== 'accepted' && statusKey !== 'signed' && (
                        <DropdownMenuItem onClick={() => void handleAccept(dv.id)}>
                          <CheckCircle className="mr-2 h-4 w-4" /> Accepter
                        </DropdownMenuItem>
                      )}
                      {statusKey !== 'rejected' && (
                        <DropdownMenuItem onClick={() => void handleReject(dv.id)}>
                          <XCircle className="mr-2 h-4 w-4" /> Refuser
                        </DropdownMenuItem>
                      )}
                      {dv.pdf_url && (
                        <DropdownMenuItem onClick={() => void handleConvertToInvoice(dv)}>
                          <FileText className="mr-2 h-4 w-4" /> Convertir en facture
                        </DropdownMenuItem>
                      )}
                      {statusKey !== 'signed' && dv.pdf_url && (
                        <DropdownMenuItem onClick={() => void handleSign(dv)} disabled={signingId === dv.id}>
                          <FileText className="mr-2 h-4 w-4" /> Signer en ligne
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
