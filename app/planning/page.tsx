'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  MapPin,
  Search,
  Plus,
  Loader2,
  CalendarDays,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getDocuments } from '@/lib/db';
import { toast } from 'sonner';

export default function PlanningPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const clientId = searchParams.get('clientId');
  
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [clientName, setClientName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    description: '',
    status: 'À venir'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const eventsPerPage = 10;

  useEffect(() => {
    if (user) {
      fetchEvents();
      if (clientId) {
        fetchClientInfo();
      }
    }
  }, [user, clientId]);

  const fetchClientInfo = async () => {
    if (!clientId) return;
    try {
      const clients = await getDocuments('clients', [
        { field: 'planner_id', operator: '==', value: user!.uid }
      ]);
      const client = clients.find((c: any) => c.id === clientId);
      if (client) {
        setClientName(client.partner ? `${client.name} & ${client.partner}` : client.name);
        setEventDate(client.event_date || '');
        setEventLocation(client.event_location || '');
      }
    } catch (e) {
      console.error('Error fetching client:', e);
    }
  };

  const fetchEvents = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const filters = [
        { field: 'planner_id', operator: '==', value: user.uid }
      ];
      
      if (clientId) {
        filters.push({ field: 'client_id', operator: '==', value: clientId });
      }

      const data = await getDocuments('events', filters);
      setEvents(data);
    } catch (e) {
      console.error('Error fetching events:', e);
      toast.error('Erreur lors du chargement du planning');
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter(event =>
    event.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredEvents.length / eventsPerPage);
  const startIndex = (currentPage - 1) * eventsPerPage;
  const paginatedEvents = filteredEvents.slice(startIndex, startIndex + eventsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleOpenEditModal = (event: any) => {
    setEditingEvent(event);
    setNewEvent({
      title: event.title || '',
      date: event.date || '',
      time: event.time || '',
      location: event.location || '',
      description: event.description || '',
      status: event.status || 'À venir'
    });
    setIsEventModalOpen(true);
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.date || !user) {
      toast.error('Veuillez remplir au moins le titre et la date');
      return;
    }

    setSaving(true);
    try {
      if (editingEvent) {
        // Mode édition
        const { updateDocument } = await import('@/lib/db');
        await updateDocument('events', editingEvent.id, {
          title: newEvent.title,
          date: newEvent.date,
          time: newEvent.time,
          location: newEvent.location,
          description: newEvent.description,
          status: newEvent.status,
        });
        toast.success('Événement modifié avec succès');
      } else {
        // Mode création
        const { addDocument } = await import('@/lib/db');
        const eventData = {
          planner_id: user.uid,
          client_id: clientId || null,
          title: newEvent.title,
          date: newEvent.date,
          time: newEvent.time,
          location: newEvent.location,
          description: newEvent.description,
          status: newEvent.status,
          created_at: new Date().toLocaleDateString('fr-FR'),
          created_timestamp: new Date()
        };
        await addDocument('events', eventData);
        toast.success('Événement créé avec succès');
      }
      
      setIsEventModalOpen(false);
      setEditingEvent(null);
      setNewEvent({
        title: '',
        date: '',
        time: '',
        location: '',
        description: '',
        status: 'À venir'
      });
      fetchEvents();
    } catch (e) {
      console.error('Error saving event:', e);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet événement ?')) return;
    
    try {
      const { deleteDocument } = await import('@/lib/db');
      await deleteDocument('events', eventId);
      toast.success('Événement supprimé');
      fetchEvents();
    } catch (e) {
      console.error('Error deleting event:', e);
      toast.error('Erreur lors de la suppression');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-brand-purple mb-2">
              Planning
            </h1>
            <p className="text-brand-gray">
              {clientId 
                ? 'Planning de l\'événement'
                : 'Gérez tous vos événements et rendez-vous'}
            </p>
          </div>
          <Button 
            className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2"
            onClick={() => setIsEventModalOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Nouvel événement
          </Button>
        </div>

        {clientId && eventDate && (
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-brand-beige to-white">
            <div className="flex items-center gap-4">
              <CalendarDays className="h-12 w-12 text-brand-turquoise" />
              <div className="flex-1">
                <h2 className="text-xl font-bold text-brand-purple mb-1">
                  Mariage de {clientName}
                </h2>
                <div className="flex flex-wrap gap-4 text-sm text-brand-gray">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(eventDate).toLocaleDateString('fr-FR', { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric' 
                    })}</span>
                  </div>
                  {eventLocation && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{eventLocation}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-4 shadow-xl border-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-gray" />
            <Input
              placeholder="Rechercher un événement..."
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
            <CalendarDays className="h-16 w-16 text-brand-gray mx-auto mb-4" />
            <h3 className="text-xl font-bold text-brand-purple mb-2">
              {searchTerm ? 'Aucun résultat' : 'Aucun événement'}
            </h3>
            <p className="text-brand-gray mb-6">
              {searchTerm 
                ? 'Essayez avec d\'autres mots-clés' 
                : clientName 
                  ? `Aucun événement planifié pour ${clientName}`
                  : 'Commencez par créer votre premier événement'}
            </p>
            {!searchTerm && (
              <Button 
                className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
                onClick={() => setIsEventModalOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" /> Créer un événement
              </Button>
            )}
          </Card>
        ) : (
          <>
            <Card className="shadow-xl border-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold text-brand-purple">Événement</TableHead>
                    <TableHead className="font-bold text-brand-purple">Date</TableHead>
                    <TableHead className="font-bold text-brand-purple">Heure</TableHead>
                    <TableHead className="font-bold text-brand-purple">Lieu</TableHead>
                    <TableHead className="font-bold text-brand-purple">Statut</TableHead>
                    <TableHead className="font-bold text-brand-purple text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEvents.map((event) => (
                    <TableRow key={event.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div>
                          <div className="font-medium text-brand-purple">{event.title || 'Événement sans titre'}</div>
                          {event.description && (
                            <div className="text-sm text-brand-gray mt-1 truncate max-w-xs" title={event.description}>
                              {event.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-brand-gray">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-brand-turquoise" />
                          {event.date ? new Date(event.date).toLocaleDateString('fr-FR') : 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell className="text-brand-gray">
                        {event.time ? (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-brand-turquoise" />
                            {event.time}
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-brand-gray">
                        {event.location ? (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-brand-turquoise" />
                            <span className="truncate max-w-[150px]" title={event.location}>
                              {event.location}
                            </span>
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-brand-turquoise text-white">
                          {event.status || 'À venir'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-brand-turquoise hover:text-brand-turquoise hover:bg-brand-turquoise/10"
                            onClick={() => handleOpenEditModal(event)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteEvent(event.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            {filteredEvents.length > eventsPerPage && (
              <Card className="p-4 shadow-xl border-0">
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Précédent
                  </Button>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-brand-gray">
                      Page {currentPage} sur {totalPages}
                    </span>
                    <span className="text-xs text-brand-gray">({filteredEvents.length} événement{filteredEvents.length > 1 ? 's' : ''})</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="gap-2"
                  >
                    Suivant
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            )}
          </>
        )}
      </div>

      <Dialog open={isEventModalOpen} onOpenChange={(open) => {
        setIsEventModalOpen(open);
        if (!open) {
          setEditingEvent(null);
          setNewEvent({
            title: '',
            date: '',
            time: '',
            location: '',
            description: '',
            status: 'À venir'
          });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-brand-purple">
              {editingEvent ? 'Modifier l\'événement' : 'Nouvel événement'}
            </DialogTitle>
            <DialogDescription>
              {editingEvent ? 'Modifier les informations de l\'événement' : `Ajouter un événement au planning ${clientName ? `de ${clientName}` : ''}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Titre *</Label>
              <Input
                value={newEvent.title}
                onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                placeholder="Ex: Réunion avec le traiteur"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Heure</Label>
                <Input
                  type="time"
                  value={newEvent.time}
                  onChange={(e) => setNewEvent({...newEvent, time: e.target.value})}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Lieu</Label>
              <Input
                value={newEvent.location}
                onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                placeholder="Ex: Restaurant Le Gourmet"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={newEvent.description}
                onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                placeholder="Détails de l'événement..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEventModalOpen(false)} disabled={saving}>
              Annuler
            </Button>
            <Button 
              className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
              onClick={handleCreateEvent}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {editingEvent ? 'Modification...' : 'Création...'}
                </>
              ) : (
                <>
                  {editingEvent ? <Edit className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  {editingEvent ? 'Modifier' : 'Créer'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
