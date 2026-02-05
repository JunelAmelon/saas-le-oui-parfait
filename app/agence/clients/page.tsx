'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Search, Plus, Heart, MapPin, Calendar, Euro, Phone, Mail, FileText, Image as ImageIcon, X, Users, CheckCircle, Clock, Edit, MessageSquare } from 'lucide-react';
import { useState } from 'react';

interface Client {
  id: string;
  names: string;
  photo: string | null;
  eventDate: string;
  eventLocation: string;
  budget: number;
  guests: number;
  phone: string;
  email: string;
  status: string;
}

const clientsDemo: Client[] = [
  {
    id: '1',
    names: 'Julie & Frédérick',
    photo: null,
    eventDate: '23/08/2024',
    eventLocation: 'Château d\'Apigné, Rennes',
    budget: 25000,
    guests: 120,
    phone: '+33 6 12 34 56 78',
    email: 'julie.martin@email.com',
    status: 'En cours',
  },
  {
    id: '2',
    names: 'Sophie & Alexandre',
    photo: null,
    eventDate: '15/06/2024',
    eventLocation: 'Domaine de la Pommeraye',
    budget: 32000,
    guests: 150,
    phone: '+33 6 98 76 54 32',
    email: 'sophie.dubois@email.com',
    status: 'En cours',
  },
  {
    id: '3',
    names: 'Emma & Thomas',
    photo: null,
    eventDate: '02/09/2024',
    eventLocation: 'Manoir de la Bourbansais',
    budget: 28000,
    guests: 100,
    phone: '+33 6 45 67 89 01',
    email: 'emma.bernard@email.com',
    status: 'Confirmé',
  },
];

export default function ClientFilesPage() {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleViewDetail = (client: Client) => {
    setSelectedClient(client);
    setIsDetailOpen(true);
  };

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setIsEditOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-brand-purple mb-2">
              Fiches Clients
            </h1>
            <p className="text-brand-gray">
              Gérez les dossiers complets de vos mariés
            </p>
          </div>
          <Button 
            className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2"
            onClick={() => setIsNewClientOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Nouvelle fiche client
          </Button>
        </div>

        <Card className="p-4 shadow-xl border-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-gray" />
            <Input
              placeholder="Rechercher un client..."
              className="pl-10 border-[#E5E5E5] focus-visible:ring-brand-turquoise"
            />
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-6">
          {clientsDemo.map((client) => (
            <Card key={client.id} className="p-6 shadow-xl border-0 hover:shadow-2xl transition-shadow">
              <div className="flex gap-6">
                <div className="flex-shrink-0">
                  <div className="w-32 h-32 rounded-lg bg-gray-100 flex items-center justify-center border-2 border-[#E5E5E5]">
                    <ImageIcon className="h-12 w-12 text-brand-gray" />
                  </div>
                </div>

                <div className="flex-1 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-brand-purple mb-1 flex items-center gap-2">
                        <Heart className="h-5 w-5 text-red-500 fill-red-500" />
                        {client.names}
                      </h3>
                      <Badge className="bg-brand-turquoise text-white">
                        {client.status}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-brand-gray uppercase tracking-label">
                        Budget
                      </p>
                      <p className="text-2xl font-bold text-brand-purple">
                        {client.budget.toLocaleString()} €
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 text-brand-gray">
                      <Calendar className="h-5 w-5 text-brand-turquoise" />
                      <div>
                        <p className="text-xs uppercase tracking-label">Date</p>
                        <p className="font-medium text-brand-purple">
                          {client.eventDate}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-brand-gray">
                      <MapPin className="h-5 w-5 text-brand-turquoise" />
                      <div>
                        <p className="text-xs uppercase tracking-label">Lieu</p>
                        <p className="font-medium text-brand-purple">
                          {client.eventLocation}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-brand-gray">
                      <Phone className="h-5 w-5 text-brand-turquoise" />
                      <div>
                        <p className="text-xs uppercase tracking-label">Téléphone</p>
                        <p className="font-medium text-brand-purple">
                          {client.phone}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-brand-gray">
                      <Mail className="h-5 w-5 text-brand-turquoise" />
                      <div>
                        <p className="text-xs uppercase tracking-label">Email</p>
                        <p className="font-medium text-brand-purple">
                          {client.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button 
                      className="flex-1 bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2"
                      onClick={() => handleViewDetail(client)}
                    >
                      <FileText className="h-4 w-4" />
                      Voir la fiche complète
                    </Button>
                    <Button
                      variant="outline"
                      className="border-2 border-brand-turquoise text-brand-gray hover:bg-brand-turquoise hover:text-white"
                      onClick={() => handleEdit(client)}
                    >
                      Modifier
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Modal Détail Client */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-brand-purple flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500 fill-red-500" />
              {selectedClient?.names}
            </DialogTitle>
            <DialogDescription>
              Fiche client complète
            </DialogDescription>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-6 py-4">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-brand-gray" />
                </div>
                <div>
                  <Badge className="bg-brand-turquoise text-white mb-2">
                    {selectedClient.status}
                  </Badge>
                  <p className="text-2xl font-bold text-brand-purple">
                    {selectedClient.budget.toLocaleString()} € de budget
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-brand-turquoise" />
                  <div>
                    <p className="text-xs text-brand-gray">Date</p>
                    <p className="font-medium text-brand-purple">{selectedClient.eventDate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-brand-turquoise" />
                  <div>
                    <p className="text-xs text-brand-gray">Lieu</p>
                    <p className="font-medium text-brand-purple">{selectedClient.eventLocation}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-brand-turquoise" />
                  <div>
                    <p className="text-xs text-brand-gray">Invités</p>
                    <p className="font-medium text-brand-purple">{selectedClient.guests} personnes</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Euro className="h-5 w-5 text-brand-turquoise" />
                  <div>
                    <p className="text-xs text-brand-gray">Budget</p>
                    <p className="font-medium text-brand-purple">{selectedClient.budget.toLocaleString()} €</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-brand-purple">Contact</h4>
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-brand-turquoise" />
                  <span>{selectedClient.phone}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-brand-turquoise" />
                  <span>{selectedClient.email}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Button variant="outline" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Message
                </Button>
                <Button variant="outline" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Documents
                </Button>
                <Button variant="outline" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  Planning
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Fermer
            </Button>
            <Button 
              className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2"
              onClick={() => {
                setIsDetailOpen(false);
                if (selectedClient) handleEdit(selectedClient);
              }}
            >
              <Edit className="h-4 w-4" />
              Modifier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Nouveau Client */}
      <Dialog open={isNewClientOpen} onOpenChange={setIsNewClientOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-brand-purple">Nouvelle fiche client</DialogTitle>
            <DialogDescription>
              Créez une nouvelle fiche pour vos mariés
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Partenaire 1</Label>
                <Input placeholder="Prénom Nom" className="mt-1" />
              </div>
              <div>
                <Label>Partenaire 2</Label>
                <Input placeholder="Prénom Nom" className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input type="email" placeholder="email@exemple.com" className="mt-1" />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input placeholder="+33 6 00 00 00 00" className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date de l'événement</Label>
                <Input type="date" className="mt-1" />
              </div>
              <div>
                <Label>Nombre d'invités</Label>
                <Input type="number" placeholder="100" className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Lieu de réception</Label>
              <Input placeholder="Nom du lieu, Ville" className="mt-1" />
            </div>
            <div>
              <Label>Budget estimé (€)</Label>
              <Input type="number" placeholder="25000" className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewClientOpen(false)}>
              Annuler
            </Button>
            <Button 
              className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
              onClick={() => setIsNewClientOpen(false)}
            >
              Créer la fiche
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Modifier Client */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-brand-purple">Modifier la fiche</DialogTitle>
            <DialogDescription>
              {selectedClient?.names}
            </DialogDescription>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-4 py-4">
              <div>
                <Label>Noms des mariés</Label>
                <Input defaultValue={selectedClient.names} className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input type="email" defaultValue={selectedClient.email} className="mt-1" />
                </div>
                <div>
                  <Label>Téléphone</Label>
                  <Input defaultValue={selectedClient.phone} className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date de l'événement</Label>
                  <Input defaultValue={selectedClient.eventDate} className="mt-1" />
                </div>
                <div>
                  <Label>Nombre d'invités</Label>
                  <Input type="number" defaultValue={selectedClient.guests} className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Lieu de réception</Label>
                <Input defaultValue={selectedClient.eventLocation} className="mt-1" />
              </div>
              <div>
                <Label>Budget (€)</Label>
                <Input type="number" defaultValue={selectedClient.budget} className="mt-1" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Annuler
            </Button>
            <Button 
              className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
              onClick={() => setIsEditOpen(false)}
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
