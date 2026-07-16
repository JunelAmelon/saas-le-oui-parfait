'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Payment } from '@/types/invoice';
import { getDocument } from '@/lib/db';
import { Loader2, Check, X, FileText, ExternalLink } from 'lucide-react';

interface ValidatePaymentModalProps {
  payment: Payment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ValidatePaymentModal({ payment, open, onOpenChange, onSuccess }: ValidatePaymentModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<'validate' | 'reject' | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [clientName, setClientName] = useState('');

  useEffect(() => {
    if (open && payment) {
      fetchData();
    }
  }, [open, payment]);

  const fetchData = async () => {
    const [invoice, client] = await Promise.all([
      getDocument('invoices', payment.invoice_id),
      getDocument('clients', payment.client_id),
    ]);
    
    setInvoiceNumber((invoice as any)?.number || '');
    setClientName((client as any)?.names || (client as any)?.name || 'Client inconnu');
  };

  const handleValidate = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const response = await fetch('/api/payments/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_id: payment.id,
          validated_by: user.uid,
        }),
      });

      if (!response.ok) {
        throw new Error('Validation failed');
      }

      toast({
        title: 'Succès',
        description: 'Paiement validé avec succès',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Validation error:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de valider le paiement',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!user || !rejectReason.trim()) {
      toast({
        title: 'Erreur',
        description: 'Veuillez indiquer un motif de rejet',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch('/api/payments/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_id: payment.id,
          reason: rejectReason,
        }),
      });

      if (!response.ok) {
        throw new Error('Rejection failed');
      }

      toast({
        title: 'Paiement rejeté',
        description: 'Le client sera notifié',
      });

      onSuccess();
      onOpenChange(false);
      setRejectReason('');
    } catch (error) {
      console.error('Rejection error:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de rejeter le paiement',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
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

  const formatTimestamp = (ts: any) => {
    const raw = ts?.toDate?.() ? ts.toDate() : ts;
    const d = raw instanceof Date ? raw : raw ? new Date(String(raw)) : null;
    if (!d || Number.isNaN(d.getTime())) return '-';
    return d.toLocaleString('fr-FR');
  };

  const isImage = (url: string) => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  };

  const isPdf = (url: string) => {
    return /\.(pdf)$/i.test(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Valider le paiement</DialogTitle>
          <DialogDescription>
            Vérifiez les informations avant de valider
          </DialogDescription>
        </DialogHeader>

        {action === null ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Facture</p>
                <p className="font-medium font-mono">{invoiceNumber}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">Client</p>
                <p className="font-medium">{clientName}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">Montant</p>
                <p className="font-medium text-lg">{formatAmount(payment.amount)}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">Date du virement</p>
                <p className="font-medium">{formatDate(payment.transfer_date)}</p>
              </div>

              <div className="col-span-2">
                <p className="text-sm text-gray-600 mb-1">Référence</p>
                <p className="font-medium font-mono">{payment.transfer_reference}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">Méthode</p>
                <p className="font-medium">{payment.method || '-'}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">Statut</p>
                <p className="font-medium">{payment.status || '-'}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">Source</p>
                <p className="font-medium">{payment.source || '-'}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">Déclaré le</p>
                <p className="font-medium">{formatTimestamp((payment as any).declared_at)}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">Validé le</p>
                <p className="font-medium">{formatTimestamp((payment as any).validated_at)}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">Validé par</p>
                <p className="font-medium font-mono">{payment.validated_by || '-'}</p>
              </div>

              {(payment.note || payment.rejected_reason) && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-600 mb-1">Message / note</p>
                  <p className="font-medium whitespace-pre-wrap">
                    {payment.note || payment.rejected_reason}
                  </p>
                </div>
              )}

              <div className="col-span-2">
                <p className="text-sm text-gray-600 mb-1">Identifiants</p>
                <p className="font-medium font-mono text-sm break-all">
                  paiement: {payment.id}
                  <br />
                  facture: {payment.invoice_id}
                  <br />
                  client: {payment.client_id}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-2">Justificatif de paiement</p>
              <div className="border rounded-lg p-4 bg-gray-50">
                {!payment.proof_url ? (
                  <div className="flex items-center justify-center py-8 text-sm text-gray-500">
                    Aucun justificatif joint
                  </div>
                ) : isImage(payment.proof_url) ? (
                  <div className="w-full">
                    <img
                      src={payment.proof_url}
                      alt="Justificatif"
                      className="w-full max-h-96 object-contain rounded-md bg-white"
                      loading="lazy"
                    />
                  </div>
                ) : isPdf(payment.proof_url) ? (
                  <div className="w-full">
                    <iframe
                      title="Justificatif PDF"
                      src={payment.proof_url}
                      className="w-full h-96 rounded-md bg-white"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mb-2" />
                  </div>
                )}

                {payment.proof_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(payment.proof_url, '_blank')}
                    className="w-full mt-3"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Ouvrir / Télécharger
                  </Button>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setAction('reject')}
                disabled={loading}
              >
                <X className="h-4 w-4 mr-2" />
                Rejeter
              </Button>
              <Button
                onClick={() => setAction('validate')}
                disabled={loading}
              >
                <Check className="h-4 w-4 mr-2" />
                Valider le paiement
              </Button>
            </DialogFooter>
          </div>
        ) : action === 'validate' ? (
          <div className="space-y-4">
            <p className="text-center text-lg">
              Êtes-vous sûr de vouloir valider ce paiement de <strong>{formatAmount(payment.amount)}</strong> ?
            </p>
            <p className="text-center text-sm text-gray-600">
              La facture sera marquée comme payée et le client sera notifié.
            </p>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setAction(null)}
                disabled={loading}
              >
                Annuler
              </Button>
              <Button
                onClick={handleValidate}
                disabled={loading}
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirmer la validation
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Motif du rejet *</Label>
              <Textarea
                id="reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ex: Référence incorrecte, montant erroné, justificatif illisible..."
                rows={4}
              />
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setAction(null);
                  setRejectReason('');
                }}
                disabled={loading}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={loading || !rejectReason.trim()}
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirmer le rejet
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
