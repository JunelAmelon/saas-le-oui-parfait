'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  FileText,
  Eye,
  Loader2,
  Clock,
  Download,
  Trash2,
  BadgeCheck,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Invoice, Payment } from '@/types/invoice';
import { deleteDocument, getDocuments, getDocument } from '@/lib/db';
import { CreateInvoiceModal } from '@/components/modals/CreateInvoiceModal';
import { ViewInvoiceModal } from '@/components/modals/ViewInvoiceModal';
import { ValidatePaymentModal } from '@/components/modals/ValidatePaymentModal';
import { useToast } from '@/hooks/use-toast';

const ITEMS_PER_PAGE = 5;
const PENDING_PER_PAGE = 3;

export default function FacturesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [pendingPayments, setPendingPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [filter, setFilter] = useState<'all' | 'sent' | 'payment_pending' | 'paid' | 'overdue' | 'draft' | 'cancelled'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pendingPage, setPendingPage] = useState(1);

  const handleDeleteInvoice = async (invoice: Invoice) => {
    if (!invoice?.id) return;
    const ok = confirm('Supprimer définitivement cette facture ? Cette action est irréversible.');
    if (!ok) return;

    try {
      await deleteDocument('invoices', invoice.id);

      const relatedPayments = await getDocuments('payments', [
        { field: 'invoice_id', operator: '==', value: invoice.id },
      ]);
      await Promise.all((relatedPayments as any[]).map((p) => deleteDocument('payments', p.id)));

      toast({
        title: 'Supprimée',
        description: 'La facture a été supprimée définitivement.',
      });

      await fetchData();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer la facture',
        variant: 'destructive',
      });
    }
  };

  const handleMarkInvoicePaid = async (invoice: Invoice) => {
    if (!user?.uid || !invoice?.id) return;
    if (invoice.status === 'paid') return;

    const ok = confirm('Marquer cette facture comme payée ? (Validation manuelle virement)');
    if (!ok) return;

    try {
      const response = await fetch('/api/invoices/mark-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: invoice.id,
          validated_by: user.uid,
          method: 'bank_transfer',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark invoice paid');
      }

      toast({
        title: 'Facture payée',
        description: 'La facture a été marquée comme payée.',
      });

      await fetchData();
    } catch (error) {
      console.error('Error marking invoice paid:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de marquer la facture comme payée',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // Revenir en page 1 à chaque changement de filtre
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  const fetchData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const invoicesData = await getDocuments('invoices', [
        { field: 'planner_id', operator: '==', value: user.uid }
      ]);

      const paymentsData = await getDocuments('payments', [
        { field: 'planner_id', operator: '==', value: user.uid },
        { field: 'status', operator: '==', value: 'pending' }
      ]);

      setInvoices((invoicesData as Invoice[]).sort((a: any, b: any) => {
        const aTime = a.created_at?.toMillis?.() || 0;
        const bTime = b.created_at?.toMillis?.() || 0;
        return bTime - aTime;
      }));

      setPendingPayments(paymentsData as Payment[]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les factures',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    if (filter === 'all') return true;
    return inv.status === filter;
  });

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedInvoices = useMemo(
    () => filteredInvoices.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE),
    [filteredInvoices, safePage]
  );

  const pendingTotalPages = Math.max(1, Math.ceil(pendingPayments.length / PENDING_PER_PAGE));
  const safePendingPage = Math.min(pendingPage, pendingTotalPages);
  const paginatedPendingPayments = useMemo(
    () => pendingPayments.slice((safePendingPage - 1) * PENDING_PER_PAGE, safePendingPage * PENDING_PER_PAGE),
    [pendingPayments, safePendingPage]
  );

  const rangeStart = filteredInvoices.length === 0 ? 0 : (safePage - 1) * ITEMS_PER_PAGE + 1;
  const rangeEnd = Math.min(safePage * ITEMS_PER_PAGE, filteredInvoices.length);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
      draft: { label: 'Brouillon', variant: 'secondary' },
      sent: { label: 'Validée', variant: 'default' },
      payment_pending: { label: 'Non payée', variant: 'outline', className: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-50' },
      paid: { label: 'Payée', variant: 'outline', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50' },
      overdue: { label: 'En retard', variant: 'destructive' },
      cancelled: { label: 'Annulée', variant: 'secondary' },
    };

    const config = variants[status] || variants.draft;
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR');
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-brand-turquoise" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Facturation"
          description="Gérez vos factures et validez les paiements"
        >
          <Button onClick={() => setShowCreateModal(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle facture
          </Button>
        </PageHeader>

        <div className="flex gap-2 flex-wrap mt-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            Toutes
          </Button>
          <Button
            variant={filter === 'sent' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('sent')}
          >
            Validées
          </Button>
          <Button
            variant={filter === 'payment_pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('payment_pending')}
          >
            Non payées
          </Button>
          <Button
            variant={filter === 'paid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('paid')}
          >
            Payées
          </Button>
          <Button
            variant={filter === 'overdue' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('overdue')}
          >
            En retard
          </Button>
          <Button
            variant={filter === 'draft' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('draft')}
          >
            Brouillons
          </Button>
          <Button
            variant={filter === 'cancelled' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('cancelled')}
          >
            Annulées
          </Button>
        </div>

        <Card className="overflow-hidden border-gray-200 shadow-sm p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200">
                  <th className="text-left py-3.5 px-5 font-semibold text-xs uppercase tracking-wide text-gray-500">Numéro</th>
                  <th className="text-left py-3.5 px-5 font-semibold text-xs uppercase tracking-wide text-gray-500">Client</th>
                  <th className="text-left py-3.5 px-5 font-semibold text-xs uppercase tracking-wide text-gray-500">Libellé</th>
                  <th className="text-left py-3.5 px-5 font-semibold text-xs uppercase tracking-wide text-gray-500">Montant</th>
                  <th className="text-left py-3.5 px-5 font-semibold text-xs uppercase tracking-wide text-gray-500">Échéance</th>
                  <th className="text-left py-3.5 px-5 font-semibold text-xs uppercase tracking-wide text-gray-500">Statut</th>
                  <th className="text-right py-3.5 px-5 font-semibold text-xs uppercase tracking-wide text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-gray-500">
                      <FileText className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm">Aucune facture trouvée</p>
                    </td>
                  </tr>
                ) : (
                  paginatedInvoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50/70 transition-colors"
                    >
                      <td className="py-4 px-5">
                        <span className="font-mono text-sm text-gray-700">{invoice.number}</span>
                      </td>
                      <td className="py-4 px-5">
                        <ClientName clientId={invoice.client_id} />
                      </td>
                      <td className="py-4 px-5">
                        <span className="text-sm text-gray-600">{invoice.label}</span>
                      </td>
                      <td className="py-4 px-5">
                        <span className="font-semibold text-sm text-gray-900">{formatAmount(invoice.amount_ttc)}</span>
                      </td>
                      <td className="py-4 px-5">
                        <span className="text-sm text-gray-600">{formatDate(invoice.due_date)}</span>
                      </td>
                      <td className="py-4 px-5">
                        {getStatusBadge(invoice.status)}
                      </td>
                      <td className="py-4 px-5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Actions">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem onClick={() => setSelectedInvoice(invoice)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Voir la facture
                            </DropdownMenuItem>

                            {invoice.status !== 'paid' && (
                              <DropdownMenuItem onClick={() => handleMarkInvoicePaid(invoice)}>
                                <BadgeCheck className="mr-2 h-4 w-4 text-emerald-600" />
                                Marquer comme payée
                              </DropdownMenuItem>
                            )}

                            {invoice.file_url && (
                              <DropdownMenuItem onClick={() => window.open(invoice.file_url!, '_blank')}>
                                <Download className="mr-2 h-4 w-4" />
                                Télécharger
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />

                            <DropdownMenuItem onClick={() => handleDeleteInvoice(invoice)} className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {filteredInvoices.length > 0 && (
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 bg-gray-50/50">
              <p className="text-sm text-gray-500">
                Affichage <span className="font-medium text-gray-700">{rangeStart}-{rangeEnd}</span> sur{' '}
                <span className="font-medium text-gray-700">{filteredInvoices.length}</span> facture{filteredInvoices.length > 1 ? 's' : ''}
              </p>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                  .reduce<number[]>((acc, p) => {
                    if (acc.length && p - acc[acc.length - 1] > 1) acc.push(-1);
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, idx) =>
                    p === -1 ? (
                      <span key={`ellipsis-${idx}`} className="px-2 text-sm text-gray-400">
                        …
                      </span>
                    ) : (
                      <Button
                        key={p}
                        variant={p === safePage ? 'default' : 'outline'}
                        size="sm"
                        className="w-8 px-0"
                        onClick={() => setCurrentPage(p)}
                      >
                        {p}
                      </Button>
                    )
                  )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Paiements en attente de validation — cartes cliquables, sous le tableau */}
        {pendingPayments.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-800">Paiements en attente de validation</h3>
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-100 px-1.5 text-xs font-medium text-amber-700">
                {pendingPayments.length}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {paginatedPendingPayments.map((payment) => (
                <button
                  key={payment.id}
                  type="button"
                  onClick={() => setSelectedPayment(payment)}
                  className="group flex w-full flex-col rounded-2xl bg-white p-5 shadow-[0_4px_20px_-6px_rgba(0,0,0,0.08)] transition-all duration-200 hover:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.14)] hover:-translate-y-0.5 text-left border border-gray-100"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 text-gray-500">
                      <Clock className="h-5 w-5" />
                    </div>
                    <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-50">
                      En attente
                    </Badge>
                  </div>

                  <div className="mt-4">
                    <p className="font-mono text-xs text-gray-400">
                      Facture {payment.invoice_id.substring(0, 8)}...
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-gray-900">
                      {formatAmount(payment.amount)}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Virement du {formatDate(payment.transfer_date)}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      Paiement en attente
                    </span>
                    <ChevronRight className="h-4 w-4 text-gray-300 transition-colors group-hover:text-gray-500" />
                  </div>
                </button>
              ))}
            </div>
            {pendingPayments.length > PENDING_PER_PAGE && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-gray-500">
                  Page {safePendingPage} / {pendingTotalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPendingPage((p) => Math.max(1, p - 1))}
                    disabled={safePendingPage <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPendingPage((p) => Math.min(pendingTotalPages, p + 1))}
                    disabled={safePendingPage >= pendingTotalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <CreateInvoiceModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={fetchData}
      />

      {selectedInvoice && (
        <ViewInvoiceModal
          invoice={selectedInvoice}
          open={!!selectedInvoice}
          onOpenChange={(open) => !open && setSelectedInvoice(null)}
          onUpdate={fetchData}
        />
      )}

      {selectedPayment && (
        <ValidatePaymentModal
          payment={selectedPayment}
          open={!!selectedPayment}
          onOpenChange={(open) => !open && setSelectedPayment(null)}
          onSuccess={fetchData}
        />
      )}
    </DashboardLayout>
  );
}

function ClientName({ clientId }: { clientId: string }) {
  const [name, setName] = useState('...');

  useEffect(() => {
    if (!clientId) {
      setName('Client inconnu');
      return;
    }

    getDocument('clients', clientId).then((client: any) => {
      if (client) {
        setName(client.names || client.name || 'Client inconnu');
      }
    });
  }, [clientId]);

  return <span className="text-sm">{name}</span>;
}