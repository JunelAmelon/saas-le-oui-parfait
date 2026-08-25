'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ClientDashboardLayout } from '@/components/layout/ClientDashboardLayout';
import { useClientData } from '@/contexts/ClientDataContext';
import { Invoice } from '@/types/invoice';
import { getDocuments, getDocument } from '@/lib/db';
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
  Users,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

function DownloadDocs({ invoice, small = false }: { invoice: Invoice; small?: boolean }) {
  const hasInvoice = !!invoice.file_url;
  const hasDevis = !!invoice.devis_url;

  if (!hasInvoice && !hasDevis) return null;

  const labelClass = small
    ? 'text-[9px] tracking-label uppercase text-gray-600 font-bold'
    : 'text-xs font-semibold';

  const buttonBody = (
    <>
      <div className="w-9 h-9 rounded-full bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center transition-colors">
        <Download className="w-4 h-4 text-gray-600" />
      </div>
      <span className={labelClass}>Documents</span>
    </>
  );

  if ((hasInvoice && !hasDevis) || (!hasInvoice && hasDevis)) {
    const url = hasInvoice ? invoice.file_url! : invoice.devis_url!;
    const label = hasInvoice ? 'Télécharger la facture' : 'Télécharger le devis';
    return (
      <button
        onClick={() => window.open(url, '_blank')}
        title={label}
        className="flex flex-col items-center gap-2 group"
      >
        {buttonBody}
      </button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex flex-col items-center gap-2 group outline-none">
          {buttonBody}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center">
        <DropdownMenuItem onClick={() => window.open(invoice.file_url!, '_blank')}>
          <FileText className="h-4 w-4 mr-2" />
          Facture
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => window.open(invoice.devis_url!, '_blank')}>
          <FileText className="h-4 w-4 mr-2" />
          Devis
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function PaiementsPage() {
  const { client, event, loading: dataLoading } = useClientData();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [vendorPayments, setVendorPayments] = useState<any[]>([]);
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
      const [invoicesData, vendorPaymentsData] = await Promise.all([
        getDocuments('invoices', [
          { field: 'client_id', operator: '==', value: client.id }
        ]),
        getDocuments('vendor_payments', [
          { field: 'client_id', operator: '==', value: client.id }
        ]).catch(() => []),
      ]);

      setInvoices((invoicesData as Invoice[]).sort((a: any, b: any) => {
        const aTime = a.created_at?.toMillis?.() || 0;
        const bTime = b.created_at?.toMillis?.() || 0;
        return bTime - aTime;
      }));

      // Enrich vendor payments with vendor name/logo if missing
      const rawVendorPayments = (vendorPaymentsData as any[])
        .filter((p) => p.status !== 'cancelled');

      // Build mapping: booking_id -> vendor_id via vendor_bookings
      const bookingIds = Array.from(new Set(
        rawVendorPayments
          .filter((p) => !p.vendor_name && p.booking_id)
          .map((p) => p.booking_id)
      ));

      const bookingToVendorMap: Record<string, { vendor_id: string; vendor_name: string; vendor_logo: string | null }> = {};
      if (bookingIds.length > 0) {
        try {
          const bookings = await getDocuments('vendor_bookings', [
            { field: 'client_id', operator: '==', value: client.id },
          ]).catch(() => []);
          for (const bk of (bookings as any[])) {
            if (bk.id && bk.vendor_id) {
              bookingToVendorMap[bk.id] = {
                vendor_id: bk.vendor_id,
                vendor_name: bk.client_names || '', // not the vendor name, will fetch separately
                vendor_logo: null,
              };
            }
          }
        } catch {
          // non-blocking
        }
      }

      // Collect all vendor IDs to fetch (from vendor_id directly or via booking)
      const vendorIdsToFetch = Array.from(new Set(
        rawVendorPayments.map((p) => {
          if (p.vendor_id) return p.vendor_id;
          if (p.booking_id && bookingToVendorMap[p.booking_id]) return bookingToVendorMap[p.booking_id].vendor_id;
          return null;
        }).filter(Boolean) as string[]
      ));

      // Fetch vendor documents
      const vendorDocsMap: Record<string, any> = {};
      await Promise.all(
        vendorIdsToFetch.map(async (vid) => {
          try {
            const vDoc = (await getDocument('vendors', vid)) as any;
            if (vDoc) vendorDocsMap[vid] = vDoc;
          } catch {
            // non-blocking
          }
        })
      );

      // Enrich payments
      const enrichedVendorPayments = rawVendorPayments.map((p) => {
        // Determine vendor_id: directly or via booking
        const vendorId = p.vendor_id || (p.booking_id && bookingToVendorMap[p.booking_id]?.vendor_id) || null;
        const vDoc = vendorId ? vendorDocsMap[vendorId] : null;
        const vendorName = vDoc?.contact_name || p.vendor_name || vDoc?.name || vDoc?.display_name || 'Prestataire';
        const vendorLogo = p.vendor_logo || vDoc?.logo || vDoc?.logo_url || vDoc?.logoUrl || vDoc?.logoURL || vDoc?.photo || null;
        return {
          ...p,
          vendor_id: vendorId || p.vendor_id,
          vendor_name: vendorName,
          vendor_logo: vendorLogo,
        };
      });

      // Sort by due_date (most recent first)
      const sortedVendorPayments = enrichedVendorPayments
        .sort((a, b) => String(b.due_date || b.paid_date || '').localeCompare(String(a.due_date || a.paid_date || '')));
      setVendorPayments(sortedVendorPayments);
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

  const isOverdue = (invoice: Invoice) => {
    if (!invoice.due_date || invoice.status === 'paid') return false;
    return new Date(invoice.due_date) < new Date();
  };

  // Factures à payer (sent, payment_pending, overdue)
  const unpaidInvoices = invoices.filter(inv =>
    ['sent', 'payment_pending', 'overdue'].includes(inv.status)
  );

  // Factures payées (paid)
  const paidInvoices = invoices.filter(inv => inv.status === 'paid' && (inv.amount_ttc ?? 0) > 0);

  // Acomptes prestataires à venir (non payés)
  const unpaidVendorPayments = vendorPayments.filter((p) => p.status !== 'paid');

  // Acomptes prestataires payés
  const paidVendorPayments = vendorPayments.filter((p) => p.status === 'paid');

  // Listes fusionnées pour l'affichage
  const allUpcomingPayments = [
    ...unpaidInvoices.map((inv) => ({
      id: inv.id,
      type: 'invoice' as const,
      label: inv.label || inv.number || 'Facture',
      number: inv.number,
      amount: inv.amount_ttc ?? 0,
      due_date: inv.due_date,
      status: inv.status,
      overdue: isOverdue(inv),
      invoice: inv,
    })),
    ...unpaidVendorPayments.map((p) => ({
      id: p.id,
      type: 'vendor' as const,
      label: p.label || 'Acompte',
      number: null,
      amount: Number(p.amount || 0),
      due_date: p.due_date,
      status: p.status,
      overdue: p.status === 'late' || (p.due_date && new Date(p.due_date) < new Date()),
      vendor_name: p.vendor_name || 'Prestataire',
      vendor_logo: p.vendor_logo || null,
      invoice: null,
    })),
  ].sort((a, b) => String(a.due_date || '').localeCompare(String(b.due_date || '')));

  const allPaidPayments = [
    ...paidInvoices.map((inv) => ({
      id: inv.id,
      type: 'invoice' as const,
      label: inv.label || inv.number || 'Facture',
      number: inv.number,
      amount: inv.amount_ttc ?? 0,
      paid_date: inv.paid_at,
      invoice: inv,
    })),
    ...paidVendorPayments.map((p) => ({
      id: p.id,
      type: 'vendor' as const,
      label: p.label || 'Acompte',
      number: null,
      amount: Number(p.amount || 0),
      paid_date: p.paid_date,
      vendor_name: p.vendor_name || 'Prestataire',
      vendor_logo: p.vendor_logo || null,
      method: p.method || '',
      invoice: null,
    })),
  ].sort((a, b) => String(b.paid_date || '').localeCompare(String(a.paid_date || '')));

  // Pagination
  const totalPages = Math.ceil(allPaidPayments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPaidPayments = allPaidPayments.slice(startIndex, startIndex + itemsPerPage);

  // Calculs budget — inclut les factures planner ET les acomptes prestataires
  const vendorPaidAmount = vendorPayments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const vendorUnpaidAmount = vendorPayments
    .filter((p) => p.status !== 'paid')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const totalBudget = invoices.reduce((sum, inv) => sum + (inv.amount_ttc ?? 0), 0) + vendorPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalPaid = paidInvoices.reduce((sum, inv) => sum + (inv.amount_ttc ?? 0), 0) + vendorPaidAmount;
  const totalUnpaid = unpaidInvoices.reduce((sum, inv) => sum + (inv.amount_ttc ?? 0), 0) + vendorUnpaidAmount;

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

        {/* PROCHAINS PAIEMENTS - LE OUI PARFAIT */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-baskerville text-xl text-brand-purple">Paiements Le Oui Parfait</h2>
            {unpaidInvoices.length > 0 && (
              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                {unpaidInvoices.length} à payer
              </Badge>
            )}
          </div>

          {unpaidInvoices.length === 0 ? (
            <Card className="p-6 text-center border border-brand-purple/8 rounded-3xl">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-brand-turquoise" />
              <p className="text-sm text-brand-gray">Tout est payé côté Le Oui Parfait.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {unpaidInvoices.map((inv) => {
                const overdue = isOverdue(inv);
                return (
                  <div key={inv.id} className="rounded-2xl overflow-hidden border border-brand-purple/8">
                    <div className={`flex items-center justify-between px-4 py-2.5 ${overdue ? 'bg-red-50' : 'bg-[#F1EADD]'}`}>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="h-4 w-4 shrink-0 text-brand-purple" />
                        <p className="text-xs font-semibold truncate text-brand-purple">
                          {inv.number} — {inv.label || inv.number || 'Facture'}
                        </p>
                      </div>
                      {getStatusBadge(overdue && inv.status !== 'payment_pending' ? 'overdue' : inv.status)}
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap divide-x divide-brand-purple/6 bg-white">
                      <MetricCell
                        icon={<Euro className="w-4 h-4 text-white" />}
                        label="Montant"
                        value={formatAmount(inv.amount_ttc ?? 0)}
                        accent="bg-brand-purple"
                      />
                      <MetricCell
                        icon={<Calendar className="w-4 h-4 text-white" />}
                        label="Échéance"
                        value={inv.due_date ? new Date(inv.due_date).toLocaleDateString('fr-FR') : '—'}
                        accent={overdue ? 'bg-[#B15C5C]' : 'bg-[#C9A96E]'}
                      />
                      <div className="flex-1 flex items-center justify-center px-3 py-4 min-w-0">
                        <button
                          onClick={() => handlePayClick(inv)}
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
                      <div className="flex-1 flex items-center justify-center px-3 py-4 min-w-0">
                        <DownloadDocs invoice={inv} small />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* PROCHAINS PAIEMENTS - PRESTATAIRES */}
        {unpaidVendorPayments.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-baskerville text-xl text-brand-purple">Paiements prestataires</h2>
              <Badge variant="outline" className="bg-[rgba(136,183,181,0.08)] text-brand-turquoise-hover border-brand-turquoise/20">
                {unpaidVendorPayments.length} à payer
              </Badge>
            </div>

            <div className="space-y-3">
              {unpaidVendorPayments.map((p) => {
                const overdue = p.status === 'late' || (p.due_date && new Date(p.due_date) < new Date());
                return (
                  <div key={p.id} className="rounded-2xl overflow-hidden border border-brand-purple/8">
                    <div className={`flex items-center justify-between px-4 py-2.5 ${overdue ? 'bg-red-50' : 'bg-[rgba(136,183,181,0.08)]'}`}>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Users className="h-4 w-4 shrink-0 text-brand-turquoise" />
                        <p className="text-xs font-semibold truncate text-brand-purple">
                          {p.vendor_name || 'Prestataire'} — {p.label || 'Acompte'}
                        </p>
                      </div>
                      {overdue
                        ? <Badge className="bg-[#B9847F]/15 text-[#B9847F] border-0 text-xs">Retard</Badge>
                        : <Badge className="bg-[#C9A96E]/15 text-[#C9A96E] border-0 text-xs">À venir</Badge>}
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap divide-x divide-brand-purple/6 bg-white">
                      <MetricCell
                        icon={<Euro className="w-4 h-4 text-white" />}
                        label="Montant"
                        value={formatAmount(Number(p.amount || 0))}
                        accent="bg-brand-purple"
                      />
                      <MetricCell
                        icon={<Calendar className="w-4 h-4 text-white" />}
                        label="Échéance"
                        value={p.due_date ? new Date(p.due_date).toLocaleDateString('fr-FR') : '—'}
                        accent={overdue ? 'bg-[#B15C5C]' : 'bg-[#C9A96E]'}
                      />
                      <div className="flex-1 flex items-center justify-center px-3 py-4 min-w-0">
                        <span className="text-xs text-brand-gray text-center">
                          Géré par votre<br />wedding planner
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* HISTORIQUE DES PAIEMENTS */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-baskerville text-xl text-brand-purple">Historique des paiements</h2>
            {allPaidPayments.length > 0 && (
              <span className="text-xs text-brand-gray">
                {allPaidPayments.length} paiement{allPaidPayments.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {allPaidPayments.length === 0 ? (
            <div className="text-center py-12 rounded-3xl border border-brand-purple/8 bg-white">
              <div className="w-14 h-14 rounded-full bg-brand-turquoise/10 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="h-6 w-6 text-brand-turquoise" />
              </div>
              <p className="text-sm text-brand-gray">Aucun paiement pour l&apos;instant.</p>
            </div>
          ) : (
            <Card className="overflow-hidden border border-brand-purple/8 rounded-[18px]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr className="bg-[#FAF9F7] border-b border-[rgba(75,68,86,0.06)]">
                      <th className="px-4 py-3.5 text-left text-[10px] font-semibold uppercase tracking-wide text-[#9C97A3]">Prestataire / Facture</th>
                      <th className="px-4 py-3.5 text-left text-[10px] font-semibold uppercase tracking-wide text-[#9C97A3]">Libellé</th>
                      <th className="px-4 py-3.5 text-left text-[10px] font-semibold uppercase tracking-wide text-[#9C97A3]">Date</th>
                      <th className="px-4 py-3.5 text-left text-[10px] font-semibold uppercase tracking-wide text-[#9C97A3]">Méthode</th>
                      <th className="px-4 py-3.5 text-right text-[10px] font-semibold uppercase tracking-wide text-[#9C97A3]">Montant</th>
                      <th className="px-4 py-3.5 text-center text-[10px] font-semibold uppercase tracking-wide text-[#9C97A3]">Statut</th>
                      <th className="px-4 py-3.5 text-center text-[10px] font-semibold uppercase tracking-wide text-[#9C97A3]">Doc</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allPaidPayments.map((item: any) => {
                      const isVendor = item.type === 'vendor';
                      const vendorInitials = (item.vendor_name || 'P').split(' ').map((x: string) => x[0]).slice(0, 2).join('').toUpperCase();
                      return (
                        <tr key={`${item.type}-${item.id}`} className="border-b border-[rgba(75,68,86,0.04)] hover:bg-[rgba(136,183,181,0.04)] transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                              {isVendor ? (
                                <div className="w-10 h-10 rounded-full bg-white border border-[rgba(75,68,86,0.08)] overflow-hidden shrink-0 flex items-center justify-center shadow-sm">
                                  {item.vendor_logo ? (
                                    <img src={item.vendor_logo} alt={item.vendor_name} className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-[11px] font-bold text-[#88b7b5]">{vendorInitials}</span>
                                  )}
                                </div>
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-[rgba(75,68,86,0.06)] flex items-center justify-center shrink-0">
                                  <FileText className="h-4 w-4 text-[#4B4456]" />
                                </div>
                              )}
                              <span className="text-[13px] font-semibold text-[#4B4456] whitespace-nowrap">
                                {isVendor ? (item.vendor_name || 'Prestataire') : (item.number || '—')}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="text-[12px] text-[#9C97A3]">{item.label || '—'}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5 text-[12px] text-[#9C97A3] whitespace-nowrap">
                              <Calendar className="h-3.5 w-3.5 text-[#88b7b5] shrink-0" />
                              {formatDate(item.paid_date)}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            {isVendor && item.method ? (
                              <span className="text-[11px] text-[#9C97A3] capitalize whitespace-nowrap">{item.method}</span>
                            ) : (
                              <span className="text-[11px] text-[#9C97A3]/40">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <span className="text-[15px] font-baskerville text-[#4B4456] whitespace-nowrap">
                              {formatAmount(item.amount || 0)}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-[rgba(136,183,181,0.15)] text-[#6a9a98]">
                              Payé
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            {!isVendor && item.invoice ? (
                              <DownloadDocs invoice={item.invoice} />
                            ) : (
                              <span className="text-[11px] text-[#9C97A3]/40">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
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
