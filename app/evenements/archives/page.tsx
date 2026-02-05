import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Archive, Calendar, MapPin, Users, Euro, Eye, Image as ImageIcon } from 'lucide-react';

const archivedEvents = [
  {
    id: '1',
    clientNames: 'Isabelle & Marc',
    eventDate: '15/07/2023',
    location: 'Manoir de Kermodest',
    guests: 130,
    budget: 28000,
    status: 'completed',
    photo: null,
  },
  {
    id: '2',
    clientNames: 'Claire & Julien',
    eventDate: '02/09/2023',
    location: 'Château de la Ballue',
    guests: 95,
    budget: 22000,
    status: 'completed',
    photo: null,
  },
  {
    id: '3',
    clientNames: 'Laura & Antoine',
    eventDate: '20/06/2023',
    location: 'Domaine de Cicé-Blossac',
    guests: 150,
    budget: 35000,
    status: 'completed',
    photo: null,
  },
  {
    id: '4',
    clientNames: 'Anaïs & Vincent',
    eventDate: '12/05/2023',
    location: 'Abbaye de Bon Repos',
    guests: 80,
    budget: 18000,
    status: 'cancelled',
    photo: null,
  },
];

export default function EventsArchivesPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-brand-purple mb-2">
              Archives Événements
            </h1>
            <p className="text-brand-gray">
              Consultez vos événements passés
            </p>
          </div>
          <Badge className="bg-gray-100 text-gray-700 px-4 py-2 text-base">
            <Archive className="h-4 w-4 mr-2" />
            {archivedEvents.length} événements archivés
          </Badge>
        </div>

        <Card className="p-4 shadow-xl border-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-gray" />
            <Input
              placeholder="Rechercher dans les archives..."
              className="pl-10 border-[#E5E5E5] focus-visible:ring-brand-turquoise"
            />
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {archivedEvents.map((event) => (
            <Card key={event.id} className="p-6 shadow-xl border-0 opacity-80 hover:opacity-100 transition-all hover:shadow-2xl">
              <div className="flex gap-4 mb-4">
                <div className="w-24 h-24 rounded-lg bg-gray-100 flex-shrink-0 flex items-center justify-center border-2 border-[#E5E5E5]">
                  <ImageIcon className="h-10 w-10 text-brand-gray" />
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-bold text-brand-purple">
                      {event.clientNames}
                    </h3>
                    {event.status === 'completed' ? (
                      <Badge className="bg-green-100 text-green-700">
                        Terminé
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-700">
                        Annulé
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-brand-gray">
                      <Calendar className="h-4 w-4 text-brand-turquoise" />
                      <span>{event.eventDate}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-brand-gray">
                      <MapPin className="h-4 w-4 text-brand-turquoise" />
                      <span>{event.location}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4 pt-4 border-t border-[#E5E5E5]">
                <div className="text-center p-3 rounded-lg bg-gray-50">
                  <Users className="h-5 w-5 text-brand-turquoise mx-auto mb-1" />
                  <p className="text-lg font-bold text-brand-purple">
                    {event.guests}
                  </p>
                  <p className="text-xs text-brand-gray">Invités</p>
                </div>

                <div className="text-center p-3 rounded-lg bg-gray-50">
                  <Euro className="h-5 w-5 text-brand-turquoise mx-auto mb-1" />
                  <p className="text-lg font-bold text-brand-purple">
                    {event.budget.toLocaleString()} €
                  </p>
                  <p className="text-xs text-brand-gray">Budget</p>
                </div>
              </div>

              <Button
                className="w-full bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2"
                size="sm"
              >
                <Eye className="h-4 w-4" />
                Voir les détails
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
