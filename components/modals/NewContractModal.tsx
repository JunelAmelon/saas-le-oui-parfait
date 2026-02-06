'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

interface NewContractModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const clients = [
  { id: '1', name: 'Julie & Frédérick', email: 'julie.martin@email.com' },
  { id: '2', name: 'Sophie & Alexandre', email: 'sophie.dubois@email.com' },
  { id: '3', name: 'Emma & Thomas', email: 'emma.bernard@email.com' },
];

const contractTemplate = `CONTRAT DE PRESTATION DE SERVICES
WEDDING PLANNING

Entre les soussignés :

L'AGENCE "LE OUI PARFAIT"
Représentée par [Nom du représentant]
Adresse : [Adresse de l'agence]
SIRET : [Numéro SIRET]

Ci-après dénommée "Le Prestataire"

D'une part,

Et :

[NOM_CLIENT]
Adresse : [ADRESSE_CLIENT]
Email : [EMAIL_CLIENT]
Téléphone : [TELEPHONE_CLIENT]

Ci-après dénommé "Le Client"

D'autre part,

ARTICLE 1 - OBJET DU CONTRAT
Le présent contrat a pour objet la prestation de services de wedding planning pour l'organisation du mariage du Client prévu le [DATE_MARIAGE] au [LIEU_MARIAGE].

ARTICLE 2 - PRESTATIONS
Le Prestataire s'engage à fournir les prestations suivantes :
[PRESTATIONS]

ARTICLE 3 - MONTANT ET MODALITÉS DE PAIEMENT
Le montant total des prestations s'élève à [MONTANT_TOTAL] € TTC.

Modalités de paiement :
- Acompte de 30% à la signature : [MONTANT_ACOMPTE] €
- Solde avant le [DATE_SOLDE]

ARTICLE 4 - DURÉE DU CONTRAT
Le présent contrat prend effet à compter de sa signature et prendra fin après la réalisation complète de l'événement.

ARTICLE 5 - OBLIGATIONS DU PRESTATAIRE
Le Prestataire s'engage à :
- Respecter les délais convenus
- Fournir des prestations de qualité professionnelle
- Maintenir une communication régulière avec le Client

ARTICLE 6 - OBLIGATIONS DU CLIENT
Le Client s'engage à :
- Fournir toutes les informations nécessaires
- Respecter les échéances de paiement
- Valider les choix dans les délais impartis

ARTICLE 7 - ANNULATION
En cas d'annulation par le Client :
- Plus de 6 mois avant : remboursement de 70%
- Entre 3 et 6 mois : remboursement de 50%
- Moins de 3 mois : aucun remboursement

ARTICLE 8 - RESPONSABILITÉ
Le Prestataire ne pourra être tenu responsable des événements indépendants de sa volonté (force majeure, défaillance d'un prestataire tiers, etc.).

Fait à [VILLE], le [DATE_SIGNATURE]
En deux exemplaires originaux

Signature du Prestataire                    Signature du Client`;

export function NewContractModal({ isOpen, onClose }: NewContractModalProps) {
  const { toast } = useToast();
  const [selectedClient, setSelectedClient] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [services, setServices] = useState('');
  const [contractContent, setContractContent] = useState(contractTemplate);

  const generateContract = () => {
    if (!selectedClient || !eventDate || !eventLocation || !totalAmount) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs obligatoires',
        variant: 'destructive',
      });
      return;
    }

    const client = clients.find(c => c.id === selectedClient);
    if (!client) return;

    const acompte = (parseFloat(totalAmount) * 0.3).toFixed(2);
    const today = new Date().toLocaleDateString('fr-FR');
    
    let generated = contractTemplate
      .replace('[NOM_CLIENT]', client.name)
      .replace('[EMAIL_CLIENT]', client.email)
      .replace('[TELEPHONE_CLIENT]', '+33 6 XX XX XX XX')
      .replace('[ADRESSE_CLIENT]', 'À compléter')
      .replace('[DATE_MARIAGE]', new Date(eventDate).toLocaleDateString('fr-FR'))
      .replace('[LIEU_MARIAGE]', eventLocation)
      .replace('[PRESTATIONS]', services || 'À définir')
      .replace('[MONTANT_TOTAL]', parseFloat(totalAmount).toLocaleString())
      .replace('[MONTANT_ACOMPTE]', parseFloat(acompte).toLocaleString())
      .replace('[DATE_SOLDE]', new Date(eventDate).toLocaleDateString('fr-FR'))
      .replace('[VILLE]', 'Rennes')
      .replace('[DATE_SIGNATURE]', today);

    setContractContent(generated);
    
    toast({
      title: 'Contrat généré',
      description: 'Le contrat a été généré avec succès. Vous pouvez le modifier avant de l\'envoyer.',
    });
  };

  const handleSubmit = () => {
    const client = clients.find(c => c.id === selectedClient);
    
    toast({
      title: 'Contrat créé',
      description: `Contrat créé et envoyé à ${client?.name} (${client?.email})`,
    });
    
    onClose();
  };

  const selectedClientData = clients.find(c => c.id === selectedClient);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-brand-purple flex items-center gap-3">
            <Image 
              src="/logo-horizontal.png" 
              alt="Le Oui Parfait" 
              width={120} 
              height={40}
              className="object-contain"
            />
            Nouveau contrat
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
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
            
            <div>
              <Label htmlFor="eventDate">Date du mariage *</Label>
              <Input
                id="eventDate"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="eventLocation">Lieu de l'événement *</Label>
              <Input
                id="eventLocation"
                placeholder="Ex: Château d'Apigné, Rennes"
                value={eventLocation}
                onChange={(e) => setEventLocation(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="totalAmount">Montant total (€) *</Label>
              <Input
                id="totalAmount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
              />
              {totalAmount && (
                <p className="text-xs text-brand-gray mt-1">
                  Acompte 30%: {(parseFloat(totalAmount) * 0.3).toLocaleString()}€
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="services">Prestations incluses</Label>
              <Textarea
                id="services"
                value={services}
                onChange={(e) => setServices(e.target.value)}
                placeholder="Ex: Organisation complète, coordination le jour J, gestion des prestataires..."
                rows={3}
              />
            </div>

            <div className="md:col-span-2">
              <Button
                type="button"
                className="w-full bg-brand-turquoise hover:bg-brand-turquoise-hover"
                onClick={generateContract}
              >
                Générer le contrat avec ces informations
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="contract">Contrat (éditable)</Label>
            <Textarea
              id="contract"
              value={contractContent}
              onChange={(e) => setContractContent(e.target.value)}
              rows={20}
              className="font-mono text-xs"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
            onClick={handleSubmit}
            disabled={!selectedClient}
          >
            Créer et envoyer au client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
