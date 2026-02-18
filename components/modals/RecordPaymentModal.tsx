'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { updateDocument } from '@/lib/db';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices?: {
    id: string;
    reference?: string;
    client?: string;
    montantTTC?: number;
    paid?: number;
  }[];
  defaultInvoiceId?: string | null;
}

const paymentMethods = [
  'Virement bancaire',
  'Carte bancaire',
  'Chèque',
  'Espèces',
  'PayPal',
  'Autre',
];

export function RecordPaymentModal({ isOpen, onClose }: RecordPaymentModalProps) {
  const { toast } = useToast();
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = () => {
    if (!selectedInvoiceId || !amount || !paymentMethod) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs obligatoires',
        variant: 'destructive',
      });
      return;
    }

    const run = async () => {
      const invoices = (propsInvoices || []) as any[];
      const inv = invoices.find((i) => i.id === selectedInvoiceId);
      const montantTTC = Number(inv?.montantTTC ?? 0);
      const alreadyPaid = Number(inv?.paid ?? 0);
      const added = Number(amount);
      if (!Number.isFinite(added) || added <= 0) {
        toast({
          title: 'Erreur',
          description: 'Montant invalide',
          variant: 'destructive',
        });
        return;
      }

      setSubmitting(true);
      try {
        const newPaidRaw = alreadyPaid + added;
        const newPaid = montantTTC > 0 ? Math.min(newPaidRaw, montantTTC) : newPaidRaw;
        const status = montantTTC > 0 && newPaid >= montantTTC ? 'paid' : 'partial';

        await updateDocument('invoices', selectedInvoiceId, {
          paid: newPaid,
          status,
          paid_at: paymentDate,
          method: paymentMethod,
          payment_reference: reference || null,
          payment_notes: notes || null,
          updated_at: new Date().toISOString(),
        });

        toast({
          title: 'Paiement enregistré',
          description: `Paiement de ${added.toLocaleString()}€ enregistré`,
        });

        setSelectedInvoiceId('');
        setAmount('');
        setPaymentMethod('');
        setReference('');
        setNotes('');
        onClose();
      } catch (e) {
        console.error('Error recording payment:', e);
        toast({
          title: 'Erreur',
          description: 'Impossible d\'enregistrer le paiement',
          variant: 'destructive',
        });
      } finally {
        setSubmitting(false);
      }
    };

    run();
  };

  const propsInvoices = (arguments[0] as any)?.invoices as RecordPaymentModalProps['invoices'] | undefined;
  const defaultInvoiceId = (arguments[0] as any)?.defaultInvoiceId as RecordPaymentModalProps['defaultInvoiceId'] | undefined;
  const invoices = propsInvoices || [];
  const selectedInvoice = invoices.find((i) => i.id === selectedInvoiceId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-brand-purple">Enregistrer un paiement</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="invoice">Facture *</Label>
            <Select
              value={selectedInvoiceId || (defaultInvoiceId || '')}
              onValueChange={(v) => {
                setSelectedInvoiceId(v);
                const inv = invoices.find((i) => i.id === v);
                const montantTTC = Number(inv?.montantTTC ?? 0);
                const alreadyPaid = Number(inv?.paid ?? 0);
                const restant = Math.max(0, montantTTC - alreadyPaid);
                if (restant > 0) setAmount(String(restant));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une facture..." />
              </SelectTrigger>
              <SelectContent>
                {invoices.map((inv) => (
                  <SelectItem key={inv.id} value={inv.id}>
                    {(inv.reference || inv.id) + (inv.client ? ` — ${inv.client}` : '')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedInvoice && (
              <p className="text-xs text-brand-gray mt-1">
                Total: {Number(selectedInvoice.montantTTC ?? 0).toLocaleString()}€ • Déjà payé: {Number(selectedInvoice.paid ?? 0).toLocaleString()}€
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">Montant (€) *</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="paymentDate">Date du paiement *</Label>
              <Input
                id="paymentDate"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="paymentMethod">Méthode de paiement *</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((method) => (
                  <SelectItem key={method} value={method}>
                    {method}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="reference">Référence / N° de transaction</Label>
            <Input
              id="reference"
              placeholder="Ex: CHQ-2024-001, VIRT-123456"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Informations complémentaires..."
              rows={3}
            />
          </div>

          {amount && (
            <div className="bg-brand-beige/20 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-brand-gray">Montant à enregistrer</span>
                <span className="text-2xl font-bold text-brand-turquoise">
                  {parseFloat(amount).toLocaleString()} €
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Enregistrement...' : 'Enregistrer le paiement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
