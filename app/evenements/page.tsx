'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Calendar as CalendarIcon, MapPin, Users as UsersIcon, Euro, Edit, FileText, Clock, CheckCircle } from 'lucide-react';
import { useState } from 'react';

interface Event {
  id: string;
  reference: string;
  clientNames: string;
  date: string;
  venue: string;
  location: string;
  guestCount: number;
  budget: number;
  spent: number;
  status: string;
}

const events: Event[] = [
  {
    id: '1',
    reference: 'J-380',
    clientNames: 'Julie & Frédérick',
    date: '23/08/2024',
    venue: 'Château d\'Apigné',
    location: 'Rennes',
    guestCount: 120,
    budget: 25000,
    spent: 23500,
    status: 'in_progress',
  },
  {
    id: '2',
    reference: 'J-425',
    clientNames: 'Sophie & Alexandre',
    date: '15/06/2024',
    venue: 'Domaine de la Roche',
    location: 'Nantes',
    guestCount: 150,
    budget: 35000,
    spent: 32000,
    status: 'in_progress',
  },
  {
    id: '3',
    reference: 'J-502',
    clientNames: 'Marie & Thomas',
    date: '22/09/2024',
    venue: 'Manoir de Kernault',
    location: 'Vannes',
    guestCount: 100,
    budget: 28000,
    spent: 15000,
    status: 'confirmed',
  },
];

const statusConfig = {
  confirmed: { label: 'Confirmé', className: 'bg-blue-500' },
  in_progress: { label: 'En cours', className: 'bg-brand-turquoise' },
  completed: { label: 'Terminé', className: 'bg-green-500' },
  cancelled: { label: 'Annulé', className: 'bg-red-500' },
};

export default function EventsPage() {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isNewEventOpen, setIsNewEventOpen] = useState(false);

  const handleViewDetail = (event: Event) => {
    setSelectedEvent(event);
    setIsDetailOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-brand-purple mb-2">
              Événements
            </h1>
            <p className="text-brand-gray">
              Gérez tous vos mariages et événements
            </p>
          </div>
          <Button 
            className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2"
            onClick={() => setIsNewEventOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Nouvel événement
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => {
            const config = statusConfig[event.status as keyof typeof statusConfig];
            const budgetPercentage = (event.spent / event.budget) * 100;

            return (
              <Card key={event.id} className="p-6 shadow-xl border-0 hover:shadow-2xl transition-shadow">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-brand-purple font-baskerville mb-1">
                      {event.clientNames}
                    </h3>
                    <p className="text-sm text-brand-gray">{event.reference}</p>
                  </div>
                  <Badge
                    className={`${config.className} hover:${config.className} text-white border-0`}
                  >
                    {config.label}
                  </Badge>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-sm text-brand-gray">
                    <CalendarIcon className="h-4 w-4" />
                    <span>{event.date}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-brand-gray">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {event.venue}, {event.location}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-brand-gray">
                    <UsersIcon className="h-4 w-4" />
                    <span>{event.guestCount} invités</span>
                  </div>
                </div>

                <div className="rounded-lg bg-brand-beige p-3">
                  <div className="mb-2 flex items-center justify-between text-xs text-brand-gray">
                    <span>Budget utilisé</span>
                    <span className="font-medium">{budgetPercentage.toFixed(0)}%</span>
                  </div>
                  <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full bg-brand-turquoise transition-all"
                      style={{ width: `${budgetPercentage}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-brand-purple">
                      {event.spent.toLocaleString('fr-FR')} €
                    </span>
                    <span className="text-brand-gray">
                      / {event.budget.toLocaleString('fr-FR')} €
                    </span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="mt-4 w-full border-2 border-brand-turquoise text-brand-turquoise hover:bg-brand-turquoise hover:text-white"
                  onClick={() => handleViewDetail(event)}
                >
                  Voir les détails
                </Button>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Modal Détail Événement */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-brand-purple flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-brand-turquoise" />
              {selectedEvent?.clientNames}
            </DialogTitle>
            <DialogDescription>
              Référence: {selectedEvent?.reference}
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-6 py-4">
              <div className="flex items-center justify-between">
                <Badge className={`${statusConfig[selectedEvent.status as keyof typeof statusConfig]?.className} text-white`}>
                  {statusConfig[selectedEvent.status as keyof typeof statusConfig]?.label}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CalendarIcon className="h-5 w-5 text-brand-turquoise" />
                  <div>
                    <p className="text-xs text-brand-gray">Date</p>
                    <p className="font-medium text-brand-purple">{selectedEvent.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-brand-turquoise" />
                  <div>
                    <p className="text-xs text-brand-gray">Lieu</p>
                    <p className="font-medium text-brand-purple">{selectedEvent.venue}, {selectedEvent.location}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <UsersIcon className="h-5 w-5 text-brand-turquoise" />
                  <div>
                    <p className="text-xs text-brand-gray">Invités</p>
                    <p className="font-medium text-brand-purple">{selectedEvent.guestCount} personnes</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Euro className="h-5 w-5 text-brand-turquoise" />
                  <div>
                    <p className="text-xs text-brand-gray">Budget</p>
                    <p className="font-medium text-brand-purple">{selectedEvent.budget.toLocaleString()} €</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-brand-beige rounded-lg">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-brand-gray">Budget utilisé</span>
                  <span className="font-medium text-brand-purple">
                    {((selectedEvent.spent / selectedEvent.budget) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="h-3 bg-white rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-brand-turquoise"
                    style={{ width: `${(selectedEvent.spent / selectedEvent.budget) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-sm">
                  <span className="font-medium text-brand-purple">{selectedEvent.spent.toLocaleString()} €</span>
                  <span className="text-brand-gray">/ {selectedEvent.budget.toLocaleString()} €</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Button variant="outline" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Documents
                </Button>
                <Button variant="outline" className="gap-2">
                  <Clock className="h-4 w-4" />
                  Planning
                </Button>
                <Button variant="outline" className="gap-2">
                  <UsersIcon className="h-4 w-4" />
                  Prestataires
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Fermer
            </Button>
            <Button className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2">
              <Edit className="h-4 w-4" />
              Modifier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Nouvel Événement */}
      <Dialog open={isNewEventOpen} onOpenChange={setIsNewEventOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-brand-purple">Nouvel événement</DialogTitle>
            <DialogDescription>
              Créez un nouveau mariage ou événement
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Noms des mariés</Label>
              <Input placeholder="Julie & Frédérick" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date de l'événement</Label>
                <Input type="date" className="mt-1" />
              </div>
              <div>
                <Label>Nombre d'invités</Label>
                <Input type="number" placeholder="120" className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Lieu</Label>
                <Input placeholder="Château d'Apigné" className="mt-1" />
              </div>
              <div>
                <Label>Ville</Label>
                <Input placeholder="Rennes" className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Budget total (€)</Label>
              <Input type="number" placeholder="25000" className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewEventOpen(false)}>
              Annuler
            </Button>
            <Button 
              className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
              onClick={() => setIsNewEventOpen(false)}
            >
              Créer l'événement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
