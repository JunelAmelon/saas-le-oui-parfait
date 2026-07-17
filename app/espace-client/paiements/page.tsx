'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ClientDashboardLayout } from '@/components/layout/ClientDashboardLayout';
import { useClientData } from '@/contexts/ClientDataContext';
import { Invoice } from '@/types/invoice';
import { getDocuments } from '@/lib/db';
import { ClientPaymentModal } from '@/components/modals/ClientPaymentModal';
import {
  Euro,
  CreditCard,
  CheckCircle,
  Clock,
  Calendar,
  FileText,
  Loader2,
  Download,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function PaiementsPage() {
  const { client, event, loading: dataLoading } = useClientData();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showChooseInvoiceModal, setShowChooseInvoiceModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const success = searchParams.get('success') === 'true';
    const sessionId = searchParams.get('session_id');

    if (success) {
      toast({
        title: 'Paiement réussi',
        description: 'Votre paiement a été traité avec succès',
      });
    }
    if (success && sessionId) {
      void (async () => {
        try {
          await fetch('/api/stripe/verify-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId }),
          });
        } catch (e) {
          console.warn('Unable to verify Stripe session:', e);
        } finally {
          await fetchInvoices();
          router.replace('/espace-client/paiements');
        }
      })();
    }
  }, [searchParams, toast, router]);

  useEffect(() => {
    if (client?.id && !dataLoading) {
      fetchInvoices();
    }
  }, [client, dataLoading]);

  const fetchInvoices = async () => {
    if (!client?.id) return;
    
    try {
      setLoading(true);
      const invoicesData = await getDocuments('invoices', [
        { field: 'client_id', operator: '==', value: client.id }
      ]);
      
      setInvoices((invoicesData as Invoice[]).sort((a: any, b: any) => {
        const aTime = a.created_at?.toMillis?.() || 0;
        const bTime = b.created_at?.toMillis?.() || 0;
        return bTime - aTime;
      }));
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les factures',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Factures à payer (sent, payment_pending, overdue)
  const unpaidInvoices = invoices.filter(inv => 
    ['sent', 'payment_pending', 'overdue'].includes(inv.status)
  );

  // Factures payées (paid)
  const paidInvoices = invoices.filter(inv => inv.status === 'paid' && (inv.amount_ttc ?? 0) > 0);

  // Pagination
  const totalPages = Math.ceil(paidInvoices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedInvoices = paidInvoices.slice(startIndex, startIndex + itemsPerPage);

  // Calculs budget
  const totalBudget = invoices.reduce((sum, inv) => sum + (inv.amount_ttc ?? 0), 0);
  const totalPaid = paidInvoices.reduce((sum, inv) => sum + (inv.amount_ttc ?? 0), 0);
  const totalUnpaid = unpaidInvoices.reduce((sum, inv) => sum + (inv.amount_ttc ?? 0), 0);

  const progressPercentage = totalBudget > 0 ? (totalPaid / totalBudget) * 100 : 0;

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    if (typeof timestamp === 'string') return new Date(timestamp).toLocaleDateString('fr-FR');
    if (timestamp.toDate) return timestamp.toDate().toLocaleDateString('fr-FR');
    return '-';
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; bg: string; text: string }> = {
      sent: { label: 'À payer', bg: 'bg-[#F1EADD]', text: 'text-[#C9A96E]' },
      payment_pending: { label: 'Non payée', bg: 'bg-red-100', text: 'text-red-700' },
      paid: { label: 'Payée', bg: 'bg-brand-turquoise/15', text: 'text-brand-turquoise-hover' },
      overdue: { label: 'En retard', bg: 'bg-[#F5DEDE]', text: 'text-[#B15C5C]' },
    };
    
    const config = variants[status] || variants.sent;
    return (
      <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const isOverdue = (invoice: Invoice) => {
    if (!invoice.due_date || invoice.status === 'paid') return false;
    return new Date(invoice.due_date) < new Date();
  };

  const handlePayClick = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowPaymentModal(true);
  };

  const handleHeroPayClick = () => {
    if (unpaidInvoices.length === 0) {
      toast({
        title: 'Aucune facture à payer',
        description: 'Toutes vos factures sont déjà réglées.',
      });
      return;
    }

    if (unpaidInvoices.length === 1) {
      handlePayClick(unpaidInvoices[0]);
      return;
    }

    setShowChooseInvoiceModal(true);
  };

  const daysRemaining = event?.event_date ? 
    Math.ceil((new Date(event.event_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;

  if (dataLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-beige">
        <Loader2 className="animate-spin h-8 w-8 text-brand-turquoise" />
      </div>
    );
  }

  const MetricCell = ({
    icon,
    label,
    value,
    accent,
  }: {
    icon: React.ReactNode;
    label: string;
    value: React.ReactNode;
    accent: string;
  }) => (
    <div className="flex-1 flex flex-col items-center text-center px-3 py-4 min-w-0">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center mb-2 ${accent}`}>
        {icon}
      </div>
      <p className="text-[9px] tracking-label uppercase text-brand-gray mb-1 leading-tight">{label}</p>
      <div className="text-sm font-baskerville text-brand-purple truncate w-full">{value}</div>
    </div>
  );

  return (
    <ClientDashboardLayout clientName={event?.couple_names || 'Client'} daysRemaining={daysRemaining}>
      <div className="space-y-6">
        {/* HERO */}
        <div className="relative overflow-hidden rounded-3xl bg-brand-purple px-7 py-9 sm:px-10 sm:py-11">
          <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full bg-brand-turquoise/10 blur-3xl pointer-events-none" />
          <svg
            className="absolute right-6 top-1/2 -translate-y-1/2 opacity-[0.12] pointer-events-none hidden sm:block"
            width="140" height="140" viewBox="0 0 100 100" fill="none"
          >
            <path d="M50 5 L56 44 L95 50 L56 56 L50 95 L44 56 L5 50 L44 44 Z" fill="white" />
          </svg>

          <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <span className="inline-block text-[10px] tracking-label uppercase text-brand-purple bg-white/90 px-3 py-1.5 rounded-full mb-4">
                Paiements
              </span>
              <h1 className="font-baskerville text-3xl sm:text-4xl text-brand-beige mb-2">
                Suivi de vos factures
              </h1>
              <p className="text-brand-beige/60 text-sm">
                {progressPercentage.toFixed(0)}% de votre budget réglé
              </p>
            </div>

            <button
              onClick={handleHeroPayClick}
              className="inline-flex items-center justify-between gap-2.5 w-full sm:w-auto bg-[#2E2937] text-white text-[13px] font-semibold pl-5 pr-2.5 py-2.5 rounded-full hover:bg-[#1f1c26] transition-colors"
            >
              <span className="inline-flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Effectuer un paiement
              </span>
              <span className="w-6 h-6 rounded-full bg-brand-turquoise flex items-center justify-center shrink-0">
                <ChevronRight className="w-3 h-3 text-[#4B4456]" />
              </span>
            </button>
          </div>
        </div>

        {/* VUE D'ENSEMBLE DU BUDGET */}
        <div className="rounded-3xl overflow-hidden border border-brand-purple/8">
          <div className="flex items-center justify-between px-5 py-3 bg-brand-purple/8">
            <p className="text-xs font-bold uppercase tracking-wide text-brand-purple">Vue d&apos;ensemble du budget</p>
            <span className="text-[10px] font-semibold text-brand-turquoise-hover">
              {progressPercentage.toFixed(0)}% payé
            </span>
          </div>
          <div className="flex divide-x divide-brand-purple/6 bg-white flex-wrap sm:flex-nowrap">
            <MetricCell
              icon={<Euro className="w-4 h-4 text-white" />}
              label="Budget total"
              value={formatAmount(totalBudget)}
              accent="bg-brand-purple"
            />
            <MetricCell
              icon={<CheckCircle className="w-4 h-4 text-white" />}
              label="Déjà payé"
              value={formatAmount(totalPaid)}
              accent="bg-brand-turquoise"
            />
            <MetricCell
              icon={<Clock className="w-4 h-4 text-white" />}
              label="Reste à payer"
              value={formatAmount(totalUnpaid)}
              accent="bg-[#C9A96E]"
            />
          </div>
          <div className="px-5 pb-5 pt-1 bg-white">
            <div className="w-full h-2.5 bg-brand-beige rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-turquoise transition-all duration-500 rounded-full"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* PROCHAINS PAIEMENTS */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-baskerville text-xl text-brand-purple">Prochains paiements</h2>
            {unpaidInvoices.length > 0 && (
              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                {unpaidInvoices.length} facture{unpaidInvoices.length > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          
          {unpaidInvoices.length === 0 ? (
            <Card className="p-8 text-center border border-brand-purple/8 rounded-3xl">
              <CheckCircle className="h-12 w-12 mx-auto mb-3 text-brand-turquoise" />
              <p className="text-sm text-brand-gray">Toutes vos factures sont payées !</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {unpaidInvoices.map((invoice) => {
                const overdueStatus = isOverdue(invoice);
                return (
                  <div key={invoice.id} className="rounded-2xl overflow-hidden border border-brand-purple/8">
                    <div className={`flex items-center justify-between px-4 py-2.5 ${
                      invoice.status === 'payment_pending' ? 'bg-red-50' :
                      overdueStatus ? 'bg-red-50' : 'bg-[#F1EADD]'
                    }`}>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="h-4 w-4 shrink-0 text-brand-purple" />
                        <p className="text-xs font-semibold truncate text-brand-purple">
                          {invoice.number} — {invoice.label}
                        </p>
                      </div>
                      {getStatusBadge(overdueStatus && invoice.status !== 'payment_pending' ? 'overdue' : invoice.status)}
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap divide-x divide-brand-purple/6 bg-white">
                      <MetricCell
                        icon={<Euro className="w-4 h-4 text-white" />}
                        label="Montant"
                        value={formatAmount(invoice.amount_ttc)}
                        accent="bg-brand-purple"
                      />
                      <MetricCell
                        icon={<Calendar className="w-4 h-4 text-white" />}
                        label="Échéance"
                        value={formatDate(invoice.due_date)}
                        accent={overdueStatus ? 'bg-[#B15C5C]' : 'bg-[#C9A96E]'}
                      />
                      <div className="flex-1 flex items-center justify-center px-3 py-4 min-w-0">
                        <button
                          onClick={() => handlePayClick(invoice)}
                          className="flex flex-col items-center gap-2 group"
                        >
                          <div className="w-9 h-9 rounded-full bg-brand-turquoise group-hover:bg-brand-turquoise-hover flex items-center justify-center transition-colors">
                            <CreditCard className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-[9px] tracking-label uppercase text-brand-turquoise-hover font-bold">
                            Payer
                          </span>
                        </button>
                      </div>
                      {invoice.file_url && (
                        <div className="flex-1 flex items-center justify-center px-3 py-4 min-w-0">
                          <button
                            onClick={() => window.open(invoice.file_url, '_blank')}
                            className="flex flex-col items-center gap-2 group"
                          >
                            <div className="w-9 h-9 rounded-full bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center transition-colors">
                              <Download className="w-4 h-4 text-gray-600" />
                            </div>
                            <span className="text-[9px] tracking-label uppercase text-gray-600 font-bold">
                              PDF
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* HISTORIQUE DES PAIEMENTS (Factures payées) */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-baskerville text-xl text-brand-purple">Historique des paiements</h2>
            {paidInvoices.length > 0 && (
              <span className="text-xs text-brand-gray">
                {paidInvoices.length} facture{paidInvoices.length > 1 ? 's' : ''} payée{paidInvoices.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {paidInvoices.length === 0 ? (
            <div className="text-center py-12 rounded-3xl border border-brand-purple/8 bg-white">
              <div className="w-14 h-14 rounded-full bg-brand-turquoise/10 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="h-6 w-6 text-brand-turquoise" />
              </div>
              <p className="text-sm text-brand-gray">Aucune facture payée pour l&apos;instant.</p>
            </div>
          ) : (
            <>
              <Card className="overflow-hidden border border-brand-purple/8 rounded-3xl">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-brand-purple/10 bg-brand-purple/5">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-label text-brand-purple">
                          Description
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-label text-brand-purple">
                          Date
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-label text-brand-purple">
                          Montant
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-label text-brand-purple">
                          Statut
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-label text-brand-purple">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedInvoices.map((invoice) => (
                        <tr key={invoice.id} className="border-b border-brand-purple/8 hover:bg-brand-purple/5 transition-colors">
                          <td className="px-4 py-4">
                            <div>
                              <p className="font-mono text-sm font-semibold text-brand-purple">{invoice.number}</p>
                              <p className="text-xs text-brand-gray mt-0.5">{invoice.label}</p>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2 text-sm text-brand-gray">
                              <Calendar className="h-4 w-4 text-brand-turquoise" />
                              {formatDate(invoice.paid_at)}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className="text-base font-baskerville text-brand-purple">
                              {formatAmount(invoice.amount_ttc || 0)}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-brand-turquoise/15 text-brand-turquoise-hover">
                              Payée
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            {invoice.file_url && (
                              <button
                                onClick={() => window.open(invoice.file_url, '_blank')}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-turquoise-hover hover:text-brand-turquoise transition-colors"
                              >
                                <Download className="h-4 w-4" />
                                Télécharger
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Pagination */}
              {paidInvoices.length > itemsPerPage && (
                <Card className="p-4 border border-brand-purple/8 rounded-3xl mt-4">
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="gap-2"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Précédent
                    </Button>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-brand-gray">
                        Page {currentPage} sur {totalPages}
                      </span>
                      <span className="text-xs text-brand-gray">({paidInvoices.length} facture{paidInvoices.length > 1 ? 's' : ''})</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="gap-2"
                    >
                      Suivant
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </div>

      {selectedInvoice && (
        <ClientPaymentModal
          invoice={selectedInvoice}
          open={showPaymentModal}
          onOpenChange={setShowPaymentModal}
          onSuccess={fetchInvoices}
        />
      )}

      <Dialog open={showChooseInvoiceModal} onOpenChange={setShowChooseInvoiceModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Choisir une facture à payer</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            {unpaidInvoices.map((inv) => (
              <button
                key={inv.id}
                type="button"
                onClick={() => {
                  setShowChooseInvoiceModal(false);
                  handlePayClick(inv);
                }}
                className="w-full text-left rounded-xl border border-brand-purple/10 bg-white hover:bg-[#FAF9F7] transition-colors px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-brand-purple truncate">
                      {inv.number} — {inv.label}
                    </div>
                    <div className="text-xs text-brand-gray mt-0.5">
                      {formatAmount(inv.amount_ttc ?? 0)}
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-brand-turquoise-hover shrink-0">Payer →</span>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </ClientDashboardLayout>
  );
}
