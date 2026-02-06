'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const clients = [
  { id: '1', name: 'Julie & Frédérick', email: 'julie.martin@email.com' },
  { id: '2', name: 'Sophie & Alexandre', email: 'sophie.dubois@email.com' },
  { id: '3', name: 'Emma & Thomas', email: 'emma.bernard@email.com' },
];

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
  const [selectedClient, setSelectedClient] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (!selectedClient || !amount || !paymentMethod) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs obligatoires',
        variant: 'destructive',
      });
      return;
    }

    const clientName = clients.find(c => c.id === selectedClient)?.name;
    
    toast({
      title: 'Paiement enregistré',
      description: `Paiement de ${parseFloat(amount).toLocaleString()}€ enregistré pour ${clientName}`,
    });
    
    // Reset form
    setSelectedClient('');
    setAmount('');
    setPaymentMethod('');
    setReference('');
    setNotes('');
    
    onClose();
  };

  const selectedClientData = clients.find(c => c.id === selectedClient);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-brand-purple">Enregistrer un paiement</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="client">Client *</Label>
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un client..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedClientData && (
              <p className="text-xs text-brand-gray mt-1">Email: {selectedClientData.email}</p>
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
          >
            Enregistrer le paiement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
