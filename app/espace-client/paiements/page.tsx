'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClientDashboardLayout } from '@/components/layout/ClientDashboardLayout';
import { Input } from '@/components/ui/input';
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

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error || 'reconcile_error');
    }

    return (await res.json()) as any;
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-700">Payé</Badge>;
      case 'pending':
        return <Badge className="bg-orange-100 text-orange-700">En attente</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-800">Partiel</Badge>;
      case 'upcoming':
        return <Badge className="bg-blue-100 text-blue-700">À venir</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-700">En retard</Badge>;
      default:
        return null;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-orange-500" />;
      case 'partial':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'upcoming':
        return <Calendar className="h-5 w-5 text-blue-500" />;
      case 'overdue':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const progressPercentage = budgetSummary.total > 0 ? (budgetSummary.paid / budgetSummary.total) * 100 : 0;

  if (dataLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-12 w-12 text-brand-turquoise" />
      </div>
    );
  }

  return (
    <ClientDashboardLayout clientName={event?.couple_names || 'Client'} daysRemaining={daysRemaining}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-purple flex items-center gap-2 sm:gap-3">
              <Euro className="h-6 w-6 sm:h-8 sm:w-8 text-brand-turquoise" />
              Paiements
            </h1>
            <p className="text-sm sm:text-base text-brand-gray mt-1">
              Suivez votre budget et vos paiements
            </p>
          </div>
          <Button 
            className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2 w-full sm:w-auto"
            onClick={openPaymentModal}
          >
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Effectuer un paiement</span>
            <span className="sm:hidden">Payer</span>
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-brand-turquoise/10 to-white">
            <div className="flex items-center gap-3 mb-2">
              <Euro className="h-6 w-6 text-brand-turquoise" />
              <p className="text-sm text-brand-gray">Budget total</p>
            </div>
            <p className="text-2xl font-bold text-brand-purple">
              {budgetSummary.total.toLocaleString()} €
            </p>
          </Card>
          <Card className="p-6 shadow-xl border-0">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <p className="text-sm text-brand-gray">Déjà payé</p>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {budgetSummary.paid.toLocaleString()} €
            </p>
          </Card>
          <Card className="p-6 shadow-xl border-0">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="h-6 w-6 text-orange-500" />
              <p className="text-sm text-brand-gray">En attente</p>
            </div>
            <p className="text-2xl font-bold text-orange-600">
              {budgetSummary.pending.toLocaleString()} €
            </p>
          </Card>
          <Card className="p-6 shadow-xl border-0">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="h-6 w-6 text-blue-500" />
              <p className="text-sm text-brand-gray">Reste à payer</p>
            </div>
            <p className="text-2xl font-bold text-brand-purple">
              {budgetSummary.remaining.toLocaleString()} €
            </p>
          </Card>
        </div>

        <Card className="p-6 shadow-xl border-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-brand-purple">Avancement du budget</h2>
            <span className="text-sm font-medium text-brand-turquoise">
              {progressPercentage.toFixed(0)}% payé
            </span>
          </div>
          <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-turquoise to-green-500 transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-sm text-brand-gray">
            <span>0 €</span>
            <span>{budgetSummary.total.toLocaleString()} €</span>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6 shadow-xl border-0">
            <h2 className="text-xl font-bold text-brand-purple mb-6">
              Historique des paiements
            </h2>
            {historyPayments.length === 0 ? (
              <div className="text-center py-10 text-brand-gray">
                Aucun paiement à afficher pour l&apos;instant.
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {historyPaginated.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors gap-3"
                    >
                      <div className="flex items-center gap-3 sm:gap-4">
                        {getStatusIcon(payment.status)}
                        <div>
                          <h3 className="font-medium text-brand-purple text-sm sm:text-base">{payment.description}</h3>
                          <p className="text-xs sm:text-sm text-brand-gray">{payment.vendor}</p>
                          <p className="text-xs text-brand-gray mt-1">
                            {String(payment.status || '') === 'paid' || String(payment.status || '') === 'completed'
                              ? `Payé le ${payment.date || '-'}`
                              : `Échéance: ${payment.due_date || 'Non définie'}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 pl-8 sm:pl-0">
                        <div className="text-left sm:text-right">
                          <p className="text-base sm:text-lg font-bold text-brand-purple">
                            {payment.amount.toLocaleString()} €
                          </p>
                          {getStatusBadge(payment.status)}
                        </div>
                        {payment.invoice && (
                          <Button variant="ghost" size="icon" onClick={() => downloadInvoicePdf(payment)}>
                            <Download className="h-4 w-4 text-brand-turquoise" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {historyPayments.length > HISTORY_PER_PAGE && (
                  <div className="flex items-center justify-between mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                      disabled={historyPage === 1}
                    >
                      ← Précédent
                    </Button>
                    <span className="text-sm text-brand-gray">
                      Page {historyPage} sur {historyTotalPages}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setHistoryPage((p) => Math.min(historyTotalPages, p + 1))}
                      disabled={historyPage === historyTotalPages}
                    >
                      Suivant →
                    </Button>
                  </div>
                )}
              </>
            )}
          </Card>

          <Card className="p-6 shadow-xl border-0">
            <h2 className="text-xl font-bold text-brand-purple mb-6 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Prochains paiements
            </h2>
            {upcomingPayments.length === 0 ? (
              <div className="text-center py-10 text-brand-gray">
                Aucun paiement à venir pour l&apos;instant.
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {upcomingPaginated.map((payment) => (
                    <div
                      key={payment.id}
                      className="bg-white p-4 rounded-lg shadow-sm border border-gray-100"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-brand-purple">{payment.description}</p>
                          <p className="text-sm text-brand-gray">{payment.vendor}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-brand-purple">
                            {(Number(payment.amount_due ?? 0) > 0 ? Number(payment.amount_due) : payment.amount).toLocaleString()} €
                          </p>
                          {Number(payment.amount_due ?? 0) > 0 && (
                            <p className="text-xs text-brand-gray">
                              Reste à payer: {Number(payment.amount_due ?? 0).toLocaleString()} €
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <p className="text-xs text-gray-500">
                          Échéance: {payment.due_date ? new Date(payment.due_date).toLocaleDateString() : 'Non définie'}
                        </p>
                        <Button 
                          size="sm" 
                          className="bg-brand-turquoise hover:bg-brand-turquoise-hover text-xs"
                          onClick={() => handlePayClick(payment)}
                        >
                          Payer
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {upcomingPayments.length > UPCOMING_PER_PAGE && (
                  <div className="flex items-center justify-between mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setUpcomingPage((p) => Math.max(1, p - 1))}
                      disabled={upcomingPage === 1}
                    >
                      ← Précédent
                    </Button>
                    <span className="text-sm text-brand-gray">
                      Page {upcomingPage} sur {upcomingTotalPages}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setUpcomingPage((p) => Math.min(upcomingTotalPages, p + 1))}
                      disabled={upcomingPage === upcomingTotalPages}
                    >
                      Suivant →
                    </Button>
                  </div>
                )}
              </>
            )}
          </Card>
        </div>

        <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
          <DialogContent className="sm:max-w-md w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-brand-purple">Effectuer un paiement</DialogTitle>
              <DialogDescription>
                {selectedPayment 
                  ? `Paiement pour: ${selectedPayment.description}`
                  : 'Sélectionnez un mode de paiement'
                }
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {!selectedPayment && (
                <div className="space-y-2">
                  <Label>Choisir un paiement à venir</Label>
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
                      <SelectTrigger>
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
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="font-medium text-brand-purple">{selectedPayment.description}</p>
                  <p className="text-sm text-brand-gray">{selectedPayment.vendor}</p>
                  <p className="text-xl font-bold text-brand-turquoise mt-2">
                    {(Number(selectedPayment.amount_due ?? 0) > 0 ? Number(selectedPayment.amount_due) : selectedPayment.amount).toLocaleString()} €
                  </p>
                </div>
              )}
              <div className="p-4 bg-blue-50 rounded-lg text-sm">
                <p className="font-medium text-blue-700 mb-2">Coordonnées bancaires</p>
                {transferLoading ? (
                  <div className="flex items-center gap-2 text-blue-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Chargement...
                  </div>
                ) : transferInstructions ? (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-blue-600 break-all">IBAN: {transferInstructions.iban}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopy('iban', transferInstructions.iban)}
                        aria-label="Copier l'IBAN"
                      >
                        {copiedKey === 'iban' ? (
                          <CheckCircle className="h-4 w-4 text-green-700" />
                        ) : (
                          <Copy className="h-4 w-4 text-blue-700" />
                        )}
                      </Button>
                    </div>
                    {transferInstructions.bic && (
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-blue-600 break-all">BIC: {transferInstructions.bic}</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopy('bic', transferInstructions.bic as string)}
                          aria-label="Copier le BIC"
                        >
                          {copiedKey === 'bic' ? (
                            <CheckCircle className="h-4 w-4 text-green-700" />
                          ) : (
                            <Copy className="h-4 w-4 text-blue-700" />
                          )}
                        </Button>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-3 mt-2">
                      <p className="text-blue-600 break-all">Référence: {transferInstructions.reference}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopy('reference', transferInstructions.reference)}
                        aria-label="Copier la référence"
                      >
                        {copiedKey === 'reference' ? (
                          <CheckCircle className="h-4 w-4 text-green-700" />
                        ) : (
                          <Copy className="h-4 w-4 text-blue-700" />
                        )}
                      </Button>
                    </div>
                    <p className="text-blue-700 mt-3 font-medium">
                      Montant restant à régler : {Number(transferInstructions.amountDue || 0).toLocaleString('fr-FR')} €
                    </p>
                  </>
                ) : (
                  <p className="text-blue-600">Impossible de récupérer les coordonnées.</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsPaymentModalOpen(false)}>
                Annuler
              </Button>
              {selectedPayment?.invoice_id && (
                <Button
                  type="button"
                  className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
                  onClick={async () => {
                    setReconcileLoading(true);
                    try {
                      await reconcileInvoice(selectedPayment.invoice_id as string);
                      await refreshPayments();
                      setIsPaymentModalOpen(false);
                    } catch (e) {
                      console.error('Error reconciling payment:', e);
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

        <Dialog open={isSuccessModalOpen} onOpenChange={setIsSuccessModalOpen}>
          <DialogContent className="sm:max-w-md text-center">
            <div className="flex flex-col items-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <DialogTitle className="text-brand-purple text-xl">Paiement effectué !</DialogTitle>
              <DialogDescription className="mt-2">
                Votre paiement a été enregistré avec succès. Vous recevrez un email de confirmation.
              </DialogDescription>
            </div>
            <DialogFooter className="justify-center">
              <Button 
                className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
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
