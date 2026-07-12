'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClientDashboardLayout } from '@/components/layout/ClientDashboardLayout';
import { Label } from '@/components/ui/label';
import { useClientData } from '@/contexts/ClientDataContext';
import { getClientPayments, getClientBudgetSummary, calculateDaysRemaining, PaymentData } from '@/lib/client-helpers';
import { auth } from '@/lib/firebase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Euro,
  CreditCard,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  TrendingUp,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Copy,
} from 'lucide-react';

import { toast } from 'sonner';

type TransferInstructions = {
  iban: string;
  bic: string | null;
  bankAccountName: string | null;
  reference: string;
  amountDue: number;
  currency: string;
};

// Palette de statuts cohérente avec la nouvelle DA (dashboard / documents)
const statusStyles: Record<string, { bg: string; text: string; solid: string; label: string }> = {
  paid: { bg: 'bg-brand-turquoise/15', text: 'text-brand-turquoise-hover', solid: 'bg-brand-turquoise', label: 'Payé' },
  completed: { bg: 'bg-brand-turquoise/15', text: 'text-brand-turquoise-hover', solid: 'bg-brand-turquoise', label: 'Payé' },
  pending: { bg: 'bg-[#F1EADD]', text: 'text-[#C9A96E]', solid: 'bg-[#C9A96E]', label: 'En attente' },
  partial: { bg: 'bg-[#F3E3E6]', text: 'text-[#B98A96]', solid: 'bg-[#B98A96]', label: 'Partiel' },
  upcoming: { bg: 'bg-brand-purple/10', text: 'text-brand-purple', solid: 'bg-brand-purple', label: 'À venir' },
  overdue: { bg: 'bg-[#F5DEDE]', text: 'text-[#B15C5C]', solid: 'bg-[#B15C5C]', label: 'En retard' },
};

const stStyle = (status: string) => statusStyles[status] || statusStyles.pending;

export default function PaiementsPage() {
  const { client, event, loading: dataLoading } = useClientData();
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [budgetSummary, setBudgetSummary] = useState({ total: 0, paid: 0, pending: 0, remaining: 0 });
  const [loading, setLoading] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentData | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [transferInstructions, setTransferInstructions] = useState<TransferInstructions | null>(null);
  const [transferLoading, setTransferLoading] = useState(false);
  const [reconcileLoading, setReconcileLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);

  const getVisiblePages = (current: number, total: number) => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = new Set<number>();
    pages.add(1);
    pages.add(total);
    for (let i = current - 1; i <= current + 1; i++) {
      if (i > 1 && i < total) pages.add(i);
    }
    return Array.from(pages.values()).sort((a, b) => a - b);
  };

  const PaginationBar = (props: {
    currentPage: number;
    totalPages: number;
    onChange: (next: number) => void;
  }) => {
    const { currentPage, totalPages, onChange } = props;
    if (totalPages <= 1) return null;

    const pages = getVisiblePages(currentPage, totalPages);

    return (
      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          aria-label="Page précédente"
          className="w-8 h-8 rounded-full border border-brand-purple/15 flex items-center justify-center text-brand-purple disabled:opacity-30 hover:bg-brand-purple/5 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-1">
          <span className="text-xs text-brand-gray sm:hidden">
            Page {currentPage} / {totalPages}
          </span>

          <div className="hidden sm:flex items-center gap-1">
            {pages.map((p, idx) => {
              const prev = pages[idx - 1];
              const showEllipsis = idx > 0 && prev !== undefined && p - prev > 1;
              return (
                <div key={p} className="flex items-center gap-1">
                  {showEllipsis ? <span className="px-1 text-sm text-brand-gray">…</span> : null}
                  <button
                    type="button"
                    onClick={() => onChange(p)}
                    className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                      p === currentPage
                        ? 'bg-brand-turquoise text-white'
                        : 'text-brand-purple hover:bg-brand-purple/8'
                    }`}
                  >
                    {p}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          aria-label="Page suivante"
          className="w-8 h-8 rounded-full border border-brand-purple/15 flex items-center justify-center text-brand-purple disabled:opacity-30 hover:bg-brand-purple/5 transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    );
  };

  const copyToClipboard = async (value: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return;
      }
    } catch {
      // ignore
    }

    try {
      const el = document.createElement('textarea');
      el.value = value;
      el.style.position = 'fixed';
      el.style.top = '0';
      el.style.left = '0';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.focus();
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    } catch {
      // ignore
    }
  };

  const handleCopy = async (key: string, value: string) => {
    await copyToClipboard(value);
    setCopiedKey(key);
    window.setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 1500);
  };

  useEffect(() => {
    async function fetchPayments() {
      if (client?.id) {
        try {
          const paymentsList = await getClientPayments(client.id);
          setPayments(paymentsList);
          const summary = await getClientBudgetSummary(client.id);
          setBudgetSummary(summary);
        } catch (error) {
          console.error('Error fetching payments:', error);
        } finally {
          setLoading(false);
        }
      }
    }
    if (!dataLoading && client) {
      fetchPayments();
    }
  }, [client, dataLoading]);

  const refreshPayments = async () => {
    if (!client?.id) return;
    const paymentsList = await getClientPayments(client.id);
    setPayments(paymentsList);
    const summary = await getClientBudgetSummary(client.id);
    setBudgetSummary(summary);
  };

  const parseCreatedAtMs = (v: any) => {
    if (!v) return 0;
    const dt = (v as any)?.toDate?.() || new Date(v);
    const ms = dt instanceof Date ? dt.getTime() : new Date(dt).getTime();
    return Number.isFinite(ms) ? ms : 0;
  };

  const sortedPayments = payments
    .slice()
    .sort((a, b) => parseCreatedAtMs(b.created_at) - parseCreatedAtMs(a.created_at));

  const upcomingPayments = sortedPayments.filter((p) => {
    const st = String(p.status || 'pending');
    const due = Number(p.amount_due ?? 0) || 0;
    if (st === 'paid' || st === 'completed') return false;
    if (st === 'partial') return due > 0;
    return st === 'pending' || st === 'overdue';
  });

  const historyPayments = sortedPayments;

  useEffect(() => {
    setUpcomingPage(1);
    setHistoryPage(1);
  }, [payments.length]);

  const UPCOMING_PER_PAGE = 3;
  const HISTORY_PER_PAGE = 4;
  const upcomingTotalPages = Math.max(1, Math.ceil(upcomingPayments.length / UPCOMING_PER_PAGE));
  const historyTotalPages = Math.max(1, Math.ceil(historyPayments.length / HISTORY_PER_PAGE));

  const upcomingPaginated = upcomingPayments.slice(
    (upcomingPage - 1) * UPCOMING_PER_PAGE,
    (upcomingPage - 1) * UPCOMING_PER_PAGE + UPCOMING_PER_PAGE
  );
  const historyPaginated = historyPayments.slice(
    (historyPage - 1) * HISTORY_PER_PAGE,
    (historyPage - 1) * HISTORY_PER_PAGE + HISTORY_PER_PAGE
  );
  const daysRemaining = event ? calculateDaysRemaining(event.event_date) : 0;

  const handlePayClick = (payment: PaymentData) => {
    setSelectedPayment(payment);
    setIsPaymentModalOpen(true);
    setTransferInstructions(null);
  };

  const downloadInvoicePdf = (p: PaymentData) => {
    const url = (p as any)?.pdf_url as string | undefined;
    if (!url) {
      toast.error('Aucun PDF disponible');
      return;
    }
    const link = document.createElement('a');
    link.href = url;
    link.download = `${p.description || 'facture'}.pdf`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openPaymentModal = () => {
    setIsPaymentModalOpen(true);
    if (upcomingPayments.length === 1) {
      setSelectedPayment(upcomingPayments[0]);
    } else {
      setSelectedPayment(null);
    }
    setTransferInstructions(null);
  };

  const handleConfirmPayment = () => {
    setIsPaymentModalOpen(false);
    setIsSuccessModalOpen(true);
  };

  const fetchTransferInstructions = async (invoiceId: string) => {
    const idToken = await auth.currentUser?.getIdToken().catch(() => null);
    if (!idToken) throw new Error('missing_auth');

    const res = await fetch('/api/qonto/transfer-instructions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ invoiceId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error || 'transfer_instructions_error');
    }

    const data = await res.json();
    return data as { ok: true } & TransferInstructions;
  };

  const reconcileInvoice = async (invoiceId: string) => {
    const idToken = await auth.currentUser?.getIdToken().catch(() => null);
    if (!idToken) throw new Error('missing_auth');

    const res = await fetch('/api/qonto/reconcile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ invoiceId }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(String(data?.error || 'error'));
    }

    return data as any;
  };

  useEffect(() => {
    async function run() {
      if (!isPaymentModalOpen) return;
      if (!selectedPayment?.invoice_id) return;

      setTransferLoading(true);
      try {
        const data = await fetchTransferInstructions(selectedPayment.invoice_id);
        setTransferInstructions({
          iban: data.iban,
          bic: data.bic,
          bankAccountName: data.bankAccountName,
          reference: data.reference,
          amountDue: data.amountDue,
          currency: data.currency,
        });
      } catch (e) {
        console.error('Error fetching transfer instructions:', e);
        setTransferInstructions(null);
      } finally {
        setTransferLoading(false);
      }
    }

    run();
  }, [isPaymentModalOpen, selectedPayment?.invoice_id]);

  const getStatusIcon = (status: string, className: string) => {
    switch (status) {
      case 'paid':
      case 'completed':
        return <CheckCircle className={className} />;
      case 'pending':
        return <Clock className={className} />;
      case 'partial':
        return <AlertCircle className={className} />;
      case 'upcoming':
        return <Calendar className={className} />;
      case 'overdue':
        return <AlertCircle className={className} />;
      default:
        return <Clock className={className} />;
    }
  };

  const progressPercentage = budgetSummary.total > 0 ? (budgetSummary.paid / budgetSummary.total) * 100 : 0;

  if (dataLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-beige">
        <Loader2 className="animate-spin h-8 w-8 text-brand-turquoise" />
      </div>
    );
  }

  return (
    <ClientDashboardLayout clientName={event?.couple_names || 'Client'} daysRemaining={daysRemaining}>
      <div className="space-y-6">

        {/* ---------- HERO ---------- */}
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
                Suivi de votre budget
              </h1>
              <p className="text-brand-beige/60 text-sm">
                {progressPercentage.toFixed(0)}% de votre budget déjà réglé
              </p>
            </div>

            <button
              onClick={openPaymentModal}
              className="inline-flex items-center gap-3 bg-[#2E2937] hover:bg-[#221f2a] text-white text-sm font-semibold pl-5 pr-1.5 py-1.5 rounded-full transition-colors shrink-0"
            >
              Effectuer un paiement
              <span className="w-8 h-8 rounded-full bg-brand-turquoise flex items-center justify-center">
                <CreditCard className="w-3.5 h-3.5 text-white" />
              </span>
            </button>
          </div>
        </div>

        {/* ---------- PILLS BUDGET ---------- */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center gap-3 bg-white rounded-2xl border border-brand-purple/8 shadow-sm p-4">
            <div className="w-10 h-10 rounded-xl bg-brand-purple/8 flex items-center justify-center shrink-0">
              <Euro className="w-4.5 h-4.5 text-brand-purple" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] tracking-label uppercase text-brand-gray mb-0.5">Budget total</p>
              <p className="font-baskerville text-lg text-brand-purple truncate">
                {budgetSummary.total.toLocaleString()} €
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white rounded-2xl border border-brand-purple/8 shadow-sm p-4">
            <div className="w-10 h-10 rounded-xl bg-brand-turquoise/15 flex items-center justify-center shrink-0">
              <CheckCircle className="w-4.5 h-4.5 text-brand-turquoise-hover" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] tracking-label uppercase text-brand-gray mb-0.5">Déjà payé</p>
              <p className="font-baskerville text-lg text-brand-turquoise-hover truncate">
                {budgetSummary.paid.toLocaleString()} €
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white rounded-2xl border border-brand-purple/8 shadow-sm p-4">
            <div className="w-10 h-10 rounded-xl bg-[#F1EADD] flex items-center justify-center shrink-0">
              <Clock className="w-4.5 h-4.5 text-[#C9A96E]" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] tracking-label uppercase text-brand-gray mb-0.5">En attente</p>
              <p className="font-baskerville text-lg text-[#C9A96E] truncate">
                {budgetSummary.pending.toLocaleString()} €
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white rounded-2xl border border-brand-purple/8 shadow-sm p-4">
            <div className="w-10 h-10 rounded-xl bg-[#F3E3E6] flex items-center justify-center shrink-0">
              <TrendingUp className="w-4.5 h-4.5 text-[#B98A96]" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] tracking-label uppercase text-brand-gray mb-0.5">Reste à payer</p>
              <p className="font-baskerville text-lg text-brand-purple truncate">
                {budgetSummary.remaining.toLocaleString()} €
              </p>
            </div>
          </div>
        </div>

        {/* ---------- AVANCEMENT DU BUDGET ---------- */}
        <Card className="p-6 sm:p-8 border border-brand-purple/8 shadow-sm rounded-3xl bg-white">
          <div className="flex items-center justify-between gap-4 mb-1">
            <h2 className="font-baskerville text-xl text-brand-purple">Avancement du budget</h2>
            <span className="text-sm font-semibold text-brand-turquoise-hover">
              {progressPercentage.toFixed(0)}% payé
            </span>
          </div>
          <div className="w-10 h-px bg-brand-turquoise mb-6" />
          <div className="w-full h-3 bg-brand-beige rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-turquoise transition-all duration-500 rounded-full"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-brand-gray">
            <span>0 €</span>
            <span>{budgetSummary.total.toLocaleString()} €</span>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ---------- HISTORIQUE ---------- */}
          <Card className="lg:col-span-2 p-6 sm:p-8 border border-brand-purple/8 shadow-sm rounded-3xl bg-white">
            <h2 className="font-baskerville text-xl text-brand-purple mb-1">Historique des paiements</h2>
            <div className="w-10 h-px bg-brand-turquoise mb-6" />

            {historyPayments.length === 0 ? (
              <div className="text-center py-10 text-brand-gray text-sm">
                Aucun paiement à afficher pour l&apos;instant.
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {historyPaginated.map((payment) => {
                    const st = String(payment.status || 'pending');
                    const style = stStyle(st);
                    return (
                      <div
                        key={payment.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-brand-beige/60 hover:bg-brand-beige transition-colors gap-3"
                      >
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${style.bg}`}>
                            {getStatusIcon(st, `h-4.5 w-4.5 ${style.text}`)}
                          </div>
                          <div>
                            <h3 className="font-medium text-brand-purple text-sm">{payment.description}</h3>
                            <p className="text-xs text-brand-gray">{payment.vendor}</p>
                            <p className="text-[11px] text-brand-gray/70 mt-1">
                              {st === 'paid' || st === 'completed'
                                ? `Payé le ${payment.date || '-'}`
                                : `Échéance: ${payment.due_date || 'Non définie'}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-3 pl-13 sm:pl-0">
                          <div className="text-left sm:text-right">
                            <p className="text-base font-baskerville text-brand-purple">
                              {payment.amount.toLocaleString()} €
                            </p>
                            <span className={`inline-block mt-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                              {style.label}
                            </span>
                          </div>
                          {payment.invoice && (
                            <button
                              onClick={() => downloadInvoicePdf(payment)}
                              className="w-8 h-8 rounded-full flex items-center justify-center text-brand-gray hover:bg-white hover:text-brand-turquoise-hover transition-colors"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {historyPayments.length > HISTORY_PER_PAGE && (
                  <PaginationBar
                    currentPage={historyPage}
                    totalPages={historyTotalPages}
                    onChange={(next) => setHistoryPage(next)}
                  />
                )}
              </>
            )}
          </Card>

          {/* ---------- PROCHAINS PAIEMENTS ---------- */}
          <Card className="p-6 sm:p-8 border border-brand-purple/8 shadow-sm rounded-3xl bg-white">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="font-baskerville text-xl text-brand-purple">Prochains paiements</h2>
            </div>
            <div className="w-10 h-px bg-[#C9A96E] mb-6" />

            {upcomingPayments.length === 0 ? (
              <div className="text-center py-10 text-brand-gray text-sm">
                Aucun paiement à venir pour l&apos;instant.
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {upcomingPaginated.map((payment) => {
                    const st = String(payment.status || 'pending');
                    const style = stStyle(st);
                    return (
                      <div
                        key={payment.id}
                        className="bg-white p-4 rounded-2xl border border-brand-purple/8 relative overflow-hidden"
                      >
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${style.solid}`} />
                        <div className="flex items-start justify-between pl-2">
                          <div className="min-w-0">
                            <p className="font-medium text-brand-purple text-sm truncate">{payment.description}</p>
                            <p className="text-xs text-brand-gray">{payment.vendor}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-baskerville text-brand-purple">
                              {(Number(payment.amount_due ?? 0) > 0 ? Number(payment.amount_due) : payment.amount).toLocaleString()} €
                            </p>
                            {Number(payment.amount_due ?? 0) > 0 && (
                              <p className="text-[10px] text-brand-gray">
                                Reste: {Number(payment.amount_due ?? 0).toLocaleString()} €
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3 pl-2">
                          <p className="text-[11px] text-brand-gray">
                            Échéance: {payment.due_date ? new Date(payment.due_date).toLocaleDateString() : 'Non définie'}
                          </p>
                          <button
                            onClick={() => handlePayClick(payment)}
                            className="text-[11px] font-semibold uppercase tracking-wide text-white bg-brand-turquoise hover:bg-brand-turquoise-hover px-3.5 py-1.5 rounded-full transition-colors"
                          >
                            Payer
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {upcomingPayments.length > UPCOMING_PER_PAGE && (
                  <PaginationBar
                    currentPage={upcomingPage}
                    totalPages={upcomingTotalPages}
                    onChange={(next) => setUpcomingPage(next)}
                  />
                )}
              </>
            )}
          </Card>
        </div>

        {/* ---------- MODAL PAIEMENT ---------- */}
        <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
          <DialogContent className="sm:max-w-md w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto rounded-3xl">
            <DialogHeader>
              <DialogTitle className="font-baskerville text-2xl text-brand-purple">Effectuer un paiement</DialogTitle>
              <DialogDescription>
                {selectedPayment
                  ? `Paiement pour: ${selectedPayment.description}`
                  : 'Sélectionnez un mode de paiement'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {!selectedPayment && (
                <div className="space-y-2">
                  <Label className="text-[10px] tracking-label uppercase text-brand-gray">Choisir un paiement à venir</Label>
                  {upcomingPayments.length === 0 ? (
                    <div className="text-sm text-brand-gray">
                      Aucun paiement à venir à sélectionner.
                    </div>
                  ) : (
                    <Select
                      value={''}
                      onValueChange={(v) => {
                        const found = upcomingPayments.find((p) => p.id === v);
                        if (found) setSelectedPayment(found);
                      }}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Sélectionner un paiement..." />
                      </SelectTrigger>
                      <SelectContent>
                        {upcomingPayments.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
              {selectedPayment && (
                <div className="p-4 bg-brand-beige rounded-2xl">
                  <p className="font-medium text-brand-purple">{selectedPayment.description}</p>
                  <p className="text-sm text-brand-gray">{selectedPayment.vendor}</p>
                  <p className="text-xl font-baskerville text-brand-turquoise-hover mt-2">
                    {(Number(selectedPayment.amount_due ?? 0) > 0 ? Number(selectedPayment.amount_due) : selectedPayment.amount).toLocaleString()} €
                  </p>
                </div>
              )}
              <div className="p-4 bg-brand-purple/6 rounded-2xl text-sm">
                <p className="font-semibold text-brand-purple mb-2">Coordonnées bancaires</p>
                {transferLoading ? (
                  <div className="flex items-center gap-2 text-brand-purple/70">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Chargement...
                  </div>
                ) : transferInstructions ? (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-brand-gray break-all">IBAN: {transferInstructions.iban}</p>
                      <button
                        type="button"
                        onClick={() => handleCopy('iban', transferInstructions.iban)}
                        aria-label="Copier l'IBAN"
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 hover:bg-white transition-colors"
                      >
                        {copiedKey === 'iban' ? (
                          <CheckCircle className="h-4 w-4 text-brand-turquoise-hover" />
                        ) : (
                          <Copy className="h-4 w-4 text-brand-purple" />
                        )}
                      </button>
                    </div>
                    {transferInstructions.bic && (
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-brand-gray break-all">BIC: {transferInstructions.bic}</p>
                        <button
                          type="button"
                          onClick={() => handleCopy('bic', transferInstructions.bic as string)}
                          aria-label="Copier le BIC"
                          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 hover:bg-white transition-colors"
                        >
                          {copiedKey === 'bic' ? (
                            <CheckCircle className="h-4 w-4 text-brand-turquoise-hover" />
                          ) : (
                            <Copy className="h-4 w-4 text-brand-purple" />
                          )}
                        </button>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-3 mt-2">
                      <p className="text-brand-gray break-all">Référence: {transferInstructions.reference}</p>
                      <button
                        type="button"
                        onClick={() => handleCopy('reference', transferInstructions.reference)}
                        aria-label="Copier la référence"
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 hover:bg-white transition-colors"
                      >
                        {copiedKey === 'reference' ? (
                          <CheckCircle className="h-4 w-4 text-brand-turquoise-hover" />
                        ) : (
                          <Copy className="h-4 w-4 text-brand-purple" />
                        )}
                      </button>
                    </div>
                    <p className="text-brand-purple mt-3 font-semibold">
                      Montant restant à régler : {Number(transferInstructions.amountDue || 0).toLocaleString('fr-FR')} €
                    </p>
                  </>
                ) : (
                  <p className="text-brand-gray">Impossible de récupérer les coordonnées.</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" className="rounded-full" onClick={() => setIsPaymentModalOpen(false)}>
                Annuler
              </Button>
              {selectedPayment?.invoice_id && (
                <Button
                  type="button"
                  className="bg-brand-turquoise hover:bg-brand-turquoise-hover rounded-full"
                  onClick={async () => {
                    setReconcileLoading(true);
                    try {
                      const result = await reconcileInvoice(selectedPayment.invoice_id as string);
                      if (result?.message === 'transaction_not_completed_yet') {
                        toast.info('Paiement en cours', {
                          description:
                            "Votre paiement est détecté mais n'est pas encore finalisé. Réessaie dans quelques minutes.",
                        });
                      } else if (!result?.matched) {
                        toast.info('Rien à vérifier pour le moment', {
                          description:
                            "Aucun paiement n'a été enregistré pour cette facture. Si vous venez de payer, attendez quelques minutes.",
                        });
                      }
                      await refreshPayments();
                      setIsPaymentModalOpen(false);
                    } catch (e) {
                      console.error('Error reconciling payment:', e);
                      toast.error("Impossible de vérifier le paiement pour le moment");
                    } finally {
                      setReconcileLoading(false);
                    }
                  }}
                  disabled={reconcileLoading}
                >
                  {reconcileLoading ? 'Vérification...' : 'Vérifier le paiement'}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ---------- SUCCÈS ---------- */}
        <Dialog open={isSuccessModalOpen} onOpenChange={setIsSuccessModalOpen}>
          <DialogContent className="sm:max-w-md text-center rounded-3xl">
            <div className="flex flex-col items-center py-6">
              <div className="w-16 h-16 bg-brand-turquoise/15 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-7 w-7 text-brand-turquoise-hover" />
              </div>
              <DialogTitle className="font-baskerville text-brand-purple text-xl">Paiement effectué !</DialogTitle>
              <DialogDescription className="mt-2">
                Votre paiement a été enregistré avec succès. Vous recevrez un email de confirmation.
              </DialogDescription>
            </div>
            <DialogFooter className="justify-center">
              <Button
                className="bg-brand-turquoise hover:bg-brand-turquoise-hover rounded-full"
                onClick={() => setIsSuccessModalOpen(false)}
              >
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ClientDashboardLayout>
  );
}