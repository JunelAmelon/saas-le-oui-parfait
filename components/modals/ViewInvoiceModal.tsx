'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Invoice, Payment } from '@/types/invoice';
import { getPaymentsByInvoice } from '@/lib/invoice-helpers';
import { getDocument } from '@/lib/db';
import { Download, FileText, Calendar, Euro, User, CreditCard } from 'lucide-react';

interface ViewInvoiceModalProps {
  invoice: Invoice;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function ViewInvoiceModal({ invoice, open, onOpenChange, onUpdate }: ViewInvoiceModalProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [clientName, setClientName] = useState('');

  const dedupPayments = (items: Payment[]) => {
    const map = new Map<string, Payment>();
    items.forEach((p) => {
      const key = p.stripe_session_id
        ? `stripe:${p.stripe_session_id}`
        : `other:${p.method}:${p.amount}:${p.transfer_date || ''}:${p.transfer_reference || ''}:${p.proof_url || ''}`;
      if (!map.has(key)) map.set(key, p);
    });
    return Array.from(map.values());
  };

  useEffect(() => {
    if (open && invoice) {
      fetchData();
    }
  }, [open, invoice]);

  const fetchData = async () => {
    const [paymentsData, client] = await Promise.all([
      getPaymentsByInvoice(invoice.id),
      getDocument('clients', invoice.client_id),
    ]);
    
    setPayments(dedupPayments(paymentsData));
    setClientName((client as any)?.names || (client as any)?.name || 'Client inconnu');
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

  const getPaymentMethodLabel = (method: string) => {
    return method === 'stripe' ? 'Carte bancaire' : 'Virement bancaire';
  };

  const getPaymentStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: any }> = {
      pending: { label: 'En attente', variant: 'warning' },
      validated: { label: 'Validé', variant: 'success' },
      rejected: { label: 'Rejeté', variant: 'destructive' },
    };
    
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Facture {invoice.number}
          </DialogTitle>
          <DialogDescription>
            Détails de la facture
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Client</p>
              <p className="font-medium flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                {clientName}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-1">Statut</p>
              {getStatusBadge(invoice.status)}
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-1">Montant TTC</p>
              <p className="font-medium flex items-center gap-2">
                <Euro className="h-4 w-4 text-gray-400" />
                {formatAmount(invoice.amount_ttc)}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-1">Date d'échéance</p>
              <p className="font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                {formatDate(invoice.due_date)}
              </p>
            </div>

            <div className="col-span-2">
              <p className="text-sm text-gray-600 mb-1">Libellé</p>
              <p className="font-medium">{invoice.label}</p>
            </div>
          </div>

          {invoice.file_url && (
            <div>
              <Button
                variant="outline"
                onClick={() => window.open(invoice.file_url, '_blank')}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Télécharger la facture PDF
              </Button>
            </div>
          )}

          {invoice.bank_details && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <h3 className="font-medium mb-3">Coordonnées bancaires</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">IBAN:</span>{' '}
                  <span className="font-mono">{invoice.bank_details.iban}</span>
                </div>
                <div>
                  <span className="text-gray-600">BIC:</span>{' '}
                  <span className="font-mono">{invoice.bank_details.bic}</span>
                </div>
                <div>
                  <span className="text-gray-600">Titulaire:</span>{' '}
                  <span>{invoice.bank_details.account_holder}</span>
                </div>
              </div>
            </div>
          )}

          {payments.length > 0 && (
            <div>
              <h3 className="font-medium mb-3">Historique des paiements</h3>
              <div className="space-y-2">
                {payments.map((payment) => (
                  <div key={payment.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{formatAmount(payment.amount)}</span>
                      </div>
                      {getPaymentStatusBadge(payment.status)}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>Méthode: {getPaymentMethodLabel(payment.method)}</p>
                      {payment.transfer_date && (
                        <p>Date: {formatDate(payment.transfer_date)}</p>
                      )}
                      {payment.transfer_reference && (
                        <p>Référence: {payment.transfer_reference}</p>
                      )}
                      {payment.validated_at && (
                        <p>Validé le: {new Date(payment.validated_at.toDate()).toLocaleDateString('fr-FR')}</p>
                      )}
                      {payment.rejected_reason && (
                        <p className="text-red-600">Motif de rejet: {payment.rejected_reason}</p>
                      )}
                    </div>
                    {payment.proof_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(payment.proof_url, '_blank')}
                        className="mt-2"
                      >
                        Voir le justificatif
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
