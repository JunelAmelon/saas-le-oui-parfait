'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, Eye, Check, X, Loader2, AlertCircle, Download } from 'lucide-react';
import { Invoice, Payment } from '@/types/invoice';
import { getDocuments, getDocument } from '@/lib/db';
import { CreateInvoiceModal } from '@/components/modals/CreateInvoiceModal';
import { ViewInvoiceModal } from '@/components/modals/ViewInvoiceModal';
import { ValidatePaymentModal } from '@/components/modals/ValidatePaymentModal';
import { useToast } from '@/hooks/use-toast';

export default function FacturesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [pendingPayments, setPendingPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [filter, setFilter] = useState<'all' | 'sent' | 'payment_pending' | 'paid' | 'overdue'>('all');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: any }> = {
      draft: { label: 'Brouillon', variant: 'secondary' },
      sent: { label: 'Envoyée', variant: 'default' },
      payment_pending: { label: 'En attente', variant: 'warning' },
      paid: { label: 'Payée', variant: 'success' },
      overdue: { label: 'En retard', variant: 'destructive' },
      cancelled: { label: 'Annulée', variant: 'secondary' },
    };
    
    const config = variants[status] || variants.draft;
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
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
      <PageHeader
        title="Facturation"
        description="Gérez vos factures et validez les paiements"
      >
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle facture
        </Button>
      </PageHeader>

      {pendingPayments.length > 0 && (
        <Card className="p-6 mb-6 border-orange-200 bg-orange-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-orange-900 mb-2">
                {pendingPayments.length} paiement{pendingPayments.length > 1 ? 's' : ''} en attente de validation
              </h3>
              <div className="space-y-2">
                {pendingPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between bg-white p-3 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        Facture {payment.invoice_id.substring(0, 8)}...
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatAmount(payment.amount)} • {formatDate(payment.transfer_date)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setSelectedPayment(payment)}
                    >
                      Valider
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="flex gap-2 mb-6 flex-wrap">
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
          Envoyées
        </Button>
        <Button
          variant={filter === 'payment_pending' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('payment_pending')}
        >
          En attente
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
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Numéro</th>
              <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Client</th>
              <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Libellé</th>
              <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Montant</th>
              <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Échéance</th>
              <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Statut</th>
              <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>Aucune facture trouvée</p>
                </td>
              </tr>
            ) : (
              filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <span className="font-mono text-sm">{invoice.number}</span>
                  </td>
                  <td className="py-3 px-4">
                    <ClientName clientId={invoice.client_id} />
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm">{invoice.label}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-medium">{formatAmount(invoice.amount_ttc)}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm">{formatDate(invoice.due_date)}</span>
                  </td>
                  <td className="py-3 px-4">
                    {getStatusBadge(invoice.status)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedInvoice(invoice)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {invoice.file_url && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(invoice.file_url, '_blank')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
    getDocument('clients', clientId).then((client: any) => {
      if (client) {
        setName(client.names || client.name || 'Client inconnu');
      }
    });
  }, [clientId]);

  return <span className="text-sm">{name}</span>;
}
