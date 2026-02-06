'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ContractModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const clients = [
  'Julie & Frédérick',
  'Sophie & Alexandre',
  'Emma & Thomas',
  'Marie & Pierre',
];

const contractTypes = [
  { value: 'service_contract', label: 'Contrat de service' },
  { value: 'venue_contract', label: 'Contrat lieu' },
  { value: 'vendor_contract', label: 'Contrat prestataire' },
];

export function ContractModal({ isOpen, onClose }: ContractModalProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [client, setClient] = useState('');
  const [type, setType] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (!title || !client || !type || !amount) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs obligatoires',
        variant: 'destructive',
      });
      return;
    }

    const reference = `CONT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

    toast({
      title: 'Contrat créé',
      description: `Le contrat ${reference} a été créé avec succès`,
    });

    setTitle('');
    setClient('');
    setType('');
    setAmount('');
    setNotes('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-brand-purple flex items-center gap-2">
            <FileText className="h-5 w-5 text-brand-turquoise" />
            Nouveau contrat
          </DialogTitle>
          <DialogDescription>
            Créez un nouveau contrat pour vos clients ou prestataires
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>Titre du contrat *</Label>
            <Input
              placeholder="Ex: Contrat de prestation Wedding Planning"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Client *</Label>
              <Select value={client} onValueChange={setClient}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sélectionner un client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Type de contrat *</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {contractTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Montant (€) *</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Notes internes (optionnel)</Label>
            <Textarea
              placeholder="Conditions particulières, clauses spécifiques..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1"
              rows={4}
            />
          </div>

          <div className="p-4 bg-blue-50 rounded-lg text-sm text-blue-900">
            <p className="font-semibold mb-1">Étapes suivantes :</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Le contrat sera créé en statut "Brouillon"</li>
              <li>Vous pourrez le compléter et le personnaliser</li>
              <li>Une fois finalisé, vous pourrez l'envoyer au client</li>
              <li>Le client pourra le signer électroniquement</li>
            </ol>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
            onClick={handleSubmit}
          >
            Créer le contrat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
