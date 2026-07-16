'use client';

import { useState } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { useClientData } from '@/contexts/ClientDataContext';
import { Invoice } from '@/types/invoice';
import { CreditCard, Building2, Loader2, Copy, CheckCircle, Upload } from 'lucide-react';

interface ClientPaymentModalProps {
  invoice: Invoice;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ClientPaymentModal({ invoice, open, onOpenChange, onSuccess }: ClientPaymentModalProps) {
  const { toast } = useToast();
  const { client, event } = useClientData();
  const [method, setMethod] = useState<'stripe' | 'transfer' | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  const [transferData, setTransferData] = useState({
    transfer_date: '',
    transfer_reference: invoice.number,
    proof_url: '',
  });

  const handleCopy = async (field: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      toast({
        title: 'Copié',
        description: 'Valeur copiée dans le presse-papier',
      });
    } catch (error) {
      console.error('Copy error:', error);
    }
  };

  const handleStripePayment = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          invoice: {
            id: invoice.id,
            number: invoice.number,
            label: invoice.label,
            amount_ttc: invoice.amount_ttc,
            client_id: invoice.client_id,
            planner_id: invoice.planner_id,
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Stripe payment error:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de créer la session de paiement',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload/proof', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const { url } = await response.json();
      setTransferData(prev => ({ ...prev, proof_url: url }));
      
      toast({
        title: 'Succès',
        description: 'Justificatif uploadé avec succès',
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Erreur',
        description: "Impossible d'uploader le justificatif",
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeclareTransfer = async () => {
    if (!transferData.transfer_date || !transferData.proof_url) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs et uploader un justificatif',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      
      const clientName = event?.couple_names || client?.name || 'Client';
      
      const response = await fetch('/api/payments/declare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: invoice.id,
          amount: invoice.amount_ttc,
          transfer_date: transferData.transfer_date,
          transfer_reference: transferData.transfer_reference,
          proof_url: transferData.proof_url,
          client_name: clientName,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to declare payment');
      }

      toast({
        title: 'Paiement déclaré',
        description: 'Votre paiement est en attente de validation',
      });

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Declare payment error:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de déclarer le paiement',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setMethod(null);
    setTransferData({
      transfer_date: '',
      transfer_reference: invoice.number,
      proof_url: '',
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetForm();
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payer la facture {invoice.number}</DialogTitle>
          <DialogDescription>
            Montant à payer : {formatAmount(invoice.amount_ttc)}
          </DialogDescription>
        </DialogHeader>

        {method === null ? (
          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-600 mb-4">Choisissez votre mode de paiement :</p>
            
            <button
              onClick={() => setMethod('stripe')}
              className="w-full p-6 border-2 border-gray-200 rounded-xl hover:border-brand-turquoise hover:bg-brand-turquoise/5 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-brand-turquoise/10 group-hover:bg-brand-turquoise flex items-center justify-center transition-colors">
                  <CreditCard className="h-6 w-6 text-brand-turquoise group-hover:text-white" />
                </div>
                <div className="text-left flex-1">
                  <h3 className="font-semibold text-lg mb-1">Payer par carte bancaire</h3>
                  <p className="text-sm text-gray-600">Paiement instantané et sécurisé via Stripe</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setMethod('transfer')}
              className="w-full p-6 border-2 border-gray-200 rounded-xl hover:border-brand-purple hover:bg-brand-purple/5 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-brand-purple/10 group-hover:bg-brand-purple flex items-center justify-center transition-colors">
                  <Building2 className="h-6 w-6 text-brand-purple group-hover:text-white" />
                </div>
                <div className="text-left flex-1">
                  <h3 className="font-semibold text-lg mb-1">Payer par virement bancaire</h3>
                  <p className="text-sm text-gray-600">Délai de traitement : 1 à 3 jours ouvrés</p>
                </div>
              </div>
            </button>
          </div>
        ) : method === 'stripe' ? (
          <div className="space-y-4 py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                Vous allez être redirigé vers la page de paiement sécurisée Stripe pour régler {formatAmount(invoice.amount_ttc)}.
              </p>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setMethod(null)} disabled={loading}>
                Retour
              </Button>
              <Button onClick={handleStripePayment} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Continuer vers Stripe
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="bg-gray-50 border rounded-lg p-4 space-y-3">
              <h3 className="font-semibold mb-2">Coordonnées bancaires</h3>
              
              {invoice.bank_details ? (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-xs text-gray-600">IBAN</p>
                      <p className="font-mono text-sm">{invoice.bank_details.iban}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCopy('iban', invoice.bank_details!.iban)}
                    >
                      {copiedField === 'iban' ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-xs text-gray-600">BIC</p>
                      <p className="font-mono text-sm">{invoice.bank_details.bic}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCopy('bic', invoice.bank_details!.bic)}
                    >
                      {copiedField === 'bic' ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-xs text-gray-600">Titulaire</p>
                      <p className="text-sm">{invoice.bank_details.account_holder}</p>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-600">Coordonnées bancaires non disponibles</p>
              )}

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex-1">
                  <p className="text-xs text-gray-600">Référence à indiquer</p>
                  <p className="font-mono text-sm font-semibold">{invoice.number}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleCopy('reference', invoice.number)}
                >
                  {copiedField === 'reference' ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold">Confirmer le virement</h3>
              
              <div>
                <Label htmlFor="transfer_date">Date du virement *</Label>
                <Input
                  id="transfer_date"
                  type="date"
                  value={transferData.transfer_date}
                  onChange={(e) => setTransferData(prev => ({ ...prev, transfer_date: e.target.value }))}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <Label htmlFor="transfer_reference">Référence utilisée</Label>
                <Input
                  id="transfer_reference"
                  value={transferData.transfer_reference}
                  onChange={(e) => setTransferData(prev => ({ ...prev, transfer_reference: e.target.value }))}
                  placeholder={invoice.number}
                />
              </div>

              <div>
                <Label htmlFor="proof">Justificatif de paiement *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="proof"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                  {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
                {transferData.proof_url && (
                  <p className="text-sm text-green-600 mt-1">✓ Justificatif uploadé</p>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setMethod(null)} disabled={loading}>
                Retour
              </Button>
              <Button
                onClick={handleDeclareTransfer}
                disabled={loading || !transferData.transfer_date || !transferData.proof_url}
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirmer le paiement
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
