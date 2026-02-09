'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Archive, Calendar, MapPin, Users, Euro, Eye, Loader2, ArchiveRestore } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getDocuments, updateDocument } from '@/lib/db';
import { toast } from 'sonner';
import Image from 'next/image';

interface ArchivedEvent {
  id: string;
  clientNames: string;
  eventDate: string;
  venue: string;
  location: string;
  guests: number;
  budget: number;
  status: string;
  imageUrl?: string;
}

export default function EventsArchivesPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<ArchivedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchArchivedEvents = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getDocuments('events', [
        { field: 'owner_id', operator: '==', value: user.uid },
        { field: 'status', operator: '==', value: 'archived' }
      ]);
      const mapped = data.map((d: any) => ({
        id: d.id,
        clientNames: d.client_names,
        eventDate: d.event_date,
        venue: d.venue,
        location: d.location,
        guests: d.guest_count,
        budget: d.budget,
        status: d.status,
        imageUrl: d.image_url,
      }));
      setEvents(mapped);
    } catch (e) {
      toast.error('Erreur lors du chargement des archives');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchivedEvents();
  }, [user]);

  const handleUnarchive = async (eventId: string) => {
    if (!confirm('Désarchiver cet événement ?')) return;
    try {
      await updateDocument('events', eventId, { status: 'completed' });
      toast.success('Événement désarchivé');
      fetchArchivedEvents();
    } catch {
      toast.error('Erreur lors de la désarchivage');
    }
  };

  const filteredEvents = events.filter(event =>
    event.clientNames.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-purple mb-2">
              Archives Événements
            </h1>
            <p className="text-sm sm:text-base text-brand-gray">
              Consultez vos événements passés
            </p>
          </div>
          <Badge className="bg-gray-100 text-gray-700 px-4 py-2 text-base">
            <Archive className="h-4 w-4 mr-2" />
            {events.length} événements archivés
          </Badge>
        </div>

        <Card className="p-4 shadow-xl border-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-gray" />
            <Input
              placeholder="Rechercher dans les archives..."
              className="pl-10 border-[#E5E5E5] focus-visible:ring-brand-turquoise"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </Card>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-brand-turquoise" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <Card className="p-12 text-center">
            <Archive className="h-16 w-16 text-brand-gray mx-auto mb-4" />
            <h3 className="text-xl font-bold text-brand-purple mb-2">
              {searchTerm ? 'Aucun résultat' : 'Aucun événement archivé'}
            </h3>
            <p className="text-brand-gray">
              {searchTerm ? 'Essayez avec d\'autres mots-clés' : 'Les événements archivés apparaissent ici'}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredEvents.map((event) => (
              <Card key={event.id} className="p-6 shadow-xl border-0 opacity-80 hover:opacity-100 transition-all hover:shadow-2xl">
                <div className="flex gap-4 mb-4">
                  <div className="w-24 h-24 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden border-2 border-[#E5E5E5]">
                    {event.imageUrl ? (
                      <Image
                        src={event.imageUrl}
                        alt={event.clientNames}
                        width={96}
                        height={96}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Archive className="h-10 w-10 text-brand-gray" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-bold text-brand-purple">
                        {event.clientNames}
                      </h3>
                      <Badge className="bg-gray-100 text-gray-700">
                        Archivé
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-brand-gray">
                        <Calendar className="h-4 w-4 text-brand-turquoise" />
                        <span>{event.eventDate}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-brand-gray">
                        <MapPin className="h-4 w-4 text-brand-turquoise" />
                        <span>{event.venue}, {event.location}</span>
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

                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2"
                    size="sm"
                  >
                    <Eye className="h-4 w-4" />
                    Détails
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnarchive(event.id)}
                  >
                    <ArchiveRestore className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
