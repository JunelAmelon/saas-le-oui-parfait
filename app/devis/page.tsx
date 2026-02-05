'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Search, FileText, Eye, Download, Send, Clock, CheckCircle, Euro, Calendar, Edit } from 'lucide-react';
import { useState } from 'react';

interface Devis {
  id: string;
  reference: string;
  client: string;
  date: string;
  montantHT: number;
  montantTTC: number;
  status: string;
  validUntil: string;
}

const devisDemo: Devis[] = [
  {
    id: '1',
    reference: 'DEVIS-2024-001',
    client: 'Sophie Martin & Thomas Dubois',
    date: '05/02/2024',
    montantHT: 28000,
    montantTTC: 33600,
    status: 'sent',
    validUntil: '05/03/2024',
  },
  {
    id: '2',
    reference: 'DEVIS-2024-002',
    client: 'Marie Laurent & Pierre Durand',
    date: '03/02/2024',
    montantHT: 38000,
    montantTTC: 45600,
    status: 'accepted',
    validUntil: '03/03/2024',
  },
  {
    id: '3',
    reference: 'DEVIS-2024-003',
    client: 'Emma Bernard & Lucas Moreau',
    date: '01/02/2024',
    montantHT: 22000,
    montantTTC: 26400,
    status: 'draft',
    validUntil: '01/03/2024',
  },
  {
    id: '4',
    reference: 'DEVIS-2024-004',
    client: 'Julie Martin',
    date: '28/01/2024',
    montantHT: 35000,
    montantTTC: 42000,
    status: 'rejected',
    validUntil: '28/02/2024',
  },
];

const statusConfig = {
  draft: {
    label: 'Brouillon',
    color: 'bg-gray-100 text-gray-700',
    icon: FileText,
  },
  sent: {
    label: 'Envoyé',
    color: 'bg-blue-100 text-blue-700',
    icon: Send,
  },
  accepted: {
    label: 'Accepté',
    color: 'bg-green-100 text-green-700',
    icon: CheckCircle,
  },
  rejected: {
    label: 'Refusé',
    color: 'bg-red-100 text-red-700',
    icon: Clock,
  },
};

export default function DevisPage() {
  const [selectedDevis, setSelectedDevis] = useState<Devis | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isNewDevisOpen, setIsNewDevisOpen] = useState(false);
  const [isSendOpen, setIsSendOpen] = useState(false);
  const [isDownloadSuccess, setIsDownloadSuccess] = useState(false);

  const handleViewDetail = (devis: Devis) => {
    setSelectedDevis(devis);
    setIsDetailOpen(true);
  };

  const handleSend = (devis: Devis) => {
    setSelectedDevis(devis);
    setIsSendOpen(true);
  };

  const handleDownload = (devis: Devis) => {
    setSelectedDevis(devis);
    setIsDownloadSuccess(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-purple mb-1 sm:mb-2">
              Devis
            </h1>
            <p className="text-sm sm:text-base text-brand-gray">
              Créez et gérez vos devis clients
            </p>
          </div>
          <Button 
            className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2 w-full sm:w-auto"
            onClick={() => setIsNewDevisOpen(true)}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nouveau devis</span>
            <span className="sm:hidden">Nouveau</span>
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-gray-50 to-white">
            <p className="text-sm text-brand-gray uppercase tracking-label mb-1">Brouillons</p>
            <p className="text-3xl font-bold text-brand-purple">
              {devisDemo.filter(d => d.status === 'draft').length}
            </p>
          </Card>
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-blue-50 to-white">
            <p className="text-sm text-brand-gray uppercase tracking-label mb-1">Envoyés</p>
            <p className="text-3xl font-bold text-brand-purple">
              {devisDemo.filter(d => d.status === 'sent').length}
            </p>
          </Card>
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-green-50 to-white">
            <p className="text-sm text-brand-gray uppercase tracking-label mb-1">Acceptés</p>
            <p className="text-3xl font-bold text-brand-purple">
              {devisDemo.filter(d => d.status === 'accepted').length}
            </p>
          </Card>
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-brand-beige to-white">
            <p className="text-sm text-brand-gray uppercase tracking-label mb-1">Total</p>
            <p className="text-3xl font-bold text-brand-purple">
              {devisDemo.reduce((acc, d) => acc + d.montantTTC, 0).toLocaleString()} €
            </p>
          </Card>
        </div>

        <Card className="p-4 shadow-xl border-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-gray" />
            <Input
              placeholder="Rechercher un devis..."
              className="pl-10 border-[#E5E5E5] focus-visible:ring-brand-turquoise"
            />
          </div>
        </Card>

        <div className="space-y-4">
          {devisDemo.map((devis) => {
            const config = statusConfig[devis.status as keyof typeof statusConfig];
            const StatusIcon = config.icon;

            return (
              <Card key={devis.id} className="p-6 shadow-xl border-0 hover:shadow-2xl transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="h-5 w-5 text-brand-turquoise" />
                      <h3 className="text-lg font-bold text-brand-purple">
                        {devis.reference}
                      </h3>
                    </div>
                    <p className="text-sm text-brand-gray mb-1">{devis.client}</p>
                    <p className="text-xs text-brand-gray">Créé le {devis.date}</p>
                  </div>
                  <Badge className={config.color}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {config.label}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 rounded-lg bg-gray-50">
                  <div>
                    <p className="text-xs text-brand-gray uppercase tracking-label mb-1">Montant HT</p>
                    <p className="text-lg font-bold text-brand-purple">
                      {devis.montantHT.toLocaleString()} €
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-brand-gray uppercase tracking-label mb-1">Montant TTC</p>
                    <p className="text-lg font-bold text-brand-purple">
                      {devis.montantTTC.toLocaleString()} €
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-brand-gray uppercase tracking-label mb-1">Valide jusqu'au</p>
                    <p className="text-sm font-medium text-brand-purple">{devis.validUntil}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2"
                    onClick={() => handleViewDetail(devis)}
                  >
                    <Eye className="h-3 w-3" />
                    Voir
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="border-2 border-brand-turquoise text-brand-gray hover:bg-brand-turquoise hover:text-white gap-2"
                    onClick={() => handleDownload(devis)}
                  >
                    <Download className="h-3 w-3" />
                    PDF
                  </Button>
                  {devis.status === 'draft' && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-2 border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white gap-2"
                      onClick={() => handleSend(devis)}
                    >
                      <Send className="h-3 w-3" />
                      Envoyer
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Modal Détail Devis */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-brand-purple flex items-center gap-2">
              <FileText className="h-5 w-5 text-brand-turquoise" />
              {selectedDevis?.reference}
            </DialogTitle>
            <DialogDescription>
              {selectedDevis?.client}
            </DialogDescription>
          </DialogHeader>
          {selectedDevis && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <Badge className={statusConfig[selectedDevis.status as keyof typeof statusConfig]?.color}>
                  {statusConfig[selectedDevis.status as keyof typeof statusConfig]?.label}
                </Badge>
                <p className="text-xs text-brand-gray">Créé le {selectedDevis.date}</p>
              </div>

              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-brand-gray">Montant HT</p>
                  <p className="text-xl font-bold text-brand-purple">{selectedDevis.montantHT.toLocaleString()} €</p>
                </div>
                <div>
                  <p className="text-xs text-brand-gray">Montant TTC</p>
                  <p className="text-xl font-bold text-brand-turquoise">{selectedDevis.montantTTC.toLocaleString()} €</p>
                </div>
                <div>
                  <p className="text-xs text-brand-gray">Valide jusqu'au</p>
                  <p className="text-lg font-medium text-brand-purple">{selectedDevis.validUntil}</p>
                </div>
              </div>

              <div className="p-4 bg-brand-beige/50 rounded-lg">
                <h4 className="font-medium text-brand-purple mb-2">Prestations incluses</h4>
                <ul className="text-sm text-brand-gray space-y-1">
                  <li>• Coordination jour J</li>
                  <li>• Gestion des prestataires</li>
                  <li>• Planning détaillé</li>
                  <li>• Suivi budget</li>
                </ul>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Fermer
            </Button>
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => {
                setIsDetailOpen(false);
                if (selectedDevis) handleDownload(selectedDevis);
              }}
            >
              <Download className="h-4 w-4" />
              Télécharger PDF
            </Button>
            <Button className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2">
              <Edit className="h-4 w-4" />
              Modifier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Nouveau Devis */}
      <Dialog open={isNewDevisOpen} onOpenChange={setIsNewDevisOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-brand-purple">Nouveau devis</DialogTitle>
            <DialogDescription>
              Créez un nouveau devis pour un client
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Client</Label>
              <Input placeholder="Nom du couple" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Montant HT (€)</Label>
                <Input type="number" placeholder="25000" className="mt-1" />
              </div>
              <div>
                <Label>TVA (%)</Label>
                <Input type="number" defaultValue="20" className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Date de validité</Label>
              <Input type="date" className="mt-1" />
            </div>
            <div>
              <Label>Description des prestations</Label>
              <Textarea placeholder="Détaillez les prestations incluses..." className="mt-1" rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewDevisOpen(false)}>
              Annuler
            </Button>
            <Button 
              className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
              onClick={() => setIsNewDevisOpen(false)}
            >
              Créer le devis
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Envoyer Devis */}
      <Dialog open={isSendOpen} onOpenChange={setIsSendOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-brand-purple">Envoyer le devis</DialogTitle>
            <DialogDescription>
              {selectedDevis?.reference} - {selectedDevis?.client}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Email du destinataire</Label>
              <Input type="email" placeholder="client@exemple.com" className="mt-1" />
            </div>
            <div>
              <Label>Message personnalisé (optionnel)</Label>
              <Textarea 
                placeholder="Ajoutez un message personnalisé..." 
                className="mt-1" 
                rows={3}
                defaultValue="Bonjour, veuillez trouver ci-joint notre devis pour votre mariage. N'hésitez pas à nous contacter pour toute question."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSendOpen(false)}>
              Annuler
            </Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 gap-2"
              onClick={() => setIsSendOpen(false)}
            >
              <Send className="h-4 w-4" />
              Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Téléchargement Succès */}
      <Dialog open={isDownloadSuccess} onOpenChange={setIsDownloadSuccess}>
        <DialogContent className="sm:max-w-md text-center">
          <div className="flex flex-col items-center py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <DialogTitle className="text-brand-purple text-xl">Téléchargement lancé !</DialogTitle>
            <DialogDescription className="mt-2">
              Le devis {selectedDevis?.reference} est en cours de téléchargement.
            </DialogDescription>
          </div>
          <DialogFooter className="justify-center">
            <Button 
              className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
              onClick={() => setIsDownloadSuccess(false)}
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
