'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Loader2, Eye, Download, CheckCircle, XCircle } from 'lucide-react';
import { addDocument, updateDocument } from '@/lib/db';
import { DevisData, getClientDevis } from '@/lib/client-helpers';
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

  useEffect(() => {
    async function fetchDevis() {
      try {
        setLoading(true);
        const items = await getClientDevis(clientId, clientEmail);
        setDevis(items);
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
    setSavingId(d.id);
    try {
      await updateDocument('devis', d.id, {
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      });

      // Créer une facture/paiement à régler côté client
      const montantTTC = Number(d.montant_ttc ?? 0);
      await addDocument('invoices', {
        planner_id: d.planner_id,
        client_id: clientId,
        reference: `FACT-${d.reference}`,
        client: d.client || '',
        client_email: d.client_email || clientEmail || '',
        date: new Date().toLocaleDateString('fr-FR'),
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR'),
        montant_ht: Number(d.montant_ht ?? 0),
        montant_ttc: montantTTC,
        paid: 0,
        status: 'pending',
        type: 'invoice',
        source: 'devis',
        devis_id: d.id,
        created_at: new Date(),
      });

      setDevis((prev) => prev.map((x) => (x.id === d.id ? { ...x, status: 'accepted' } : x)));
      router.push('/espace-client/paiements');
    } catch (e) {
      console.error('Error accepting devis:', e);
    } finally {
      setSavingId(null);
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

                  return (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium text-brand-purple">{d.reference}</TableCell>
                      <TableCell className="text-brand-gray">{String(d.date || '').trim() || '-'}</TableCell>
                      <TableCell>
                        <Badge className={badgeClass}>{d.status}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap w-[1%]">
                        <div className="flex items-center justify-end gap-1 whitespace-nowrap flex-nowrap">
                          {d.pdf_url ? (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-brand-turquoise hover:text-brand-turquoise-hover h-8 w-8"
                                onClick={() => openPdf(d)}
                                title="Visualiser"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-brand-turquoise hover:text-brand-turquoise-hover h-8 w-8"
                                onClick={() => downloadPdf(d)}
                                title="Télécharger"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </>
                          ) : null}

                          {d.status === 'sent' ? (
                            <>
                              <Button
                                size="icon"
                                className="sm:hidden bg-green-600 hover:bg-green-700 h-8 w-8"
                                onClick={() => void acceptDevis(d)}
                                disabled={isBusy}
                                title="Valider"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                className="hidden sm:inline-flex bg-green-600 hover:bg-green-700 gap-2"
                                onClick={() => void acceptDevis(d)}
                                disabled={isBusy}
                              >
                                <CheckCircle className="h-4 w-4" />
                                Valider
                              </Button>

                              <Button
                                size="icon"
                                variant="outline"
                                className="sm:hidden border-red-500 text-red-600 hover:bg-red-500 hover:text-white h-8 w-8"
                                onClick={() => void rejectDevis(d)}
                                disabled={isBusy}
                                title="Refuser"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="hidden sm:inline-flex border-red-500 text-red-600 hover:bg-red-500 hover:text-white gap-2"
                                onClick={() => void rejectDevis(d)}
                                disabled={isBusy}
                              >
                                <XCircle className="h-4 w-4" />
                                Refuser
                              </Button>
                            </>
                          ) : null}

                          {d.status === 'accepted' ? (
                            <Button
                              size="sm"
                              className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
                              onClick={() => router.push('/espace-client/paiements')}
                            >
                              <span className="sm:hidden">€</span>
                              <span className="hidden sm:inline">Paiement</span>
                            </Button>
                          ) : null}
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

              return (
                <div key={d.id} className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-brand-purple truncate">{d.reference}</p>
                      <p className="text-xs text-brand-gray">{d.date || ''}</p>
                    </div>
                    <Badge className={badgeClass}>{d.status}</Badge>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {d.pdf_url ? (
                      <>
                        <Button size="sm" variant="outline" className="gap-2" onClick={() => openPdf(d)}>
                          <Eye className="h-4 w-4" />
                          Visualiser
                        </Button>
                        <Button size="sm" variant="outline" className="gap-2" onClick={() => downloadPdf(d)}>
                          <Download className="h-4 w-4" />
                          Télécharger
                        </Button>
                      </>
                    ) : null}

                    {d.status === 'sent' ? (
                      <>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 gap-2"
                          onClick={() => void acceptDevis(d)}
                          disabled={isBusy}
                        >
                          <CheckCircle className="h-4 w-4" />
                          Valider
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-500 text-red-600 hover:bg-red-500 hover:text-white gap-2"
                          onClick={() => void rejectDevis(d)}
                          disabled={isBusy}
                        >
                          <XCircle className="h-4 w-4" />
                          Refuser
                        </Button>
                      </>
                    ) : null}

                    {d.status === 'accepted' ? (
                      <Button
                        size="sm"
                        className="bg-brand-turquoise hover:bg-brand-turquoise-hover ml-auto"
                        onClick={() => router.push('/espace-client/paiements')}
                      >
                        Passer au paiement
                      </Button>
                    ) : null}
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
