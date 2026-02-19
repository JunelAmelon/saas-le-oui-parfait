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
import { Plus, Calendar as CalendarIcon, MapPin, Users as UsersIcon, Euro, Edit, FileText, Clock, CheckCircle, Loader2, Archive, Image as ImageIcon, PartyPopper } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getDocuments, addDocument, updateDocument } from '@/lib/db';
import { toast } from 'sonner';
import { serverTimestamp } from 'firebase/firestore';
import { uploadFile } from '@/lib/storage';
import Image from 'next/image';

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
  status: 'confirmed' | 'in_progress' | 'completed' | 'archived';
  imageUrl?: string;
}


const statusConfig = {
  confirmed: { label: 'Confirmé', className: 'bg-blue-500' },
  in_progress: { label: 'En cours', className: 'bg-brand-turquoise' },
  completed: { label: 'Terminé', className: 'bg-green-500' },
  archived: { label: 'Archivé', className: 'bg-gray-500' },
};

export default function EventsPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isNewEventOpen, setIsNewEventOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    clientNames: '',
    date: '',
    venue: '',
    location: '',
    guestCount: '',
    budget: '',
    spent: '0',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  // Fetch events
  const fetchEvents = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Récupérer tous les événements de l'utilisateur et filtrer côté client
      const data = await getDocuments('events', [
        { field: 'owner_id', operator: '==', value: user.uid }
      ]);
      const mapped = data
        .filter((d: any) => d.status !== 'archived') // Filtrer les archivés côté client
        .map((d: any) => ({
          id: d.id,
          reference: d.reference,
          clientNames: d.client_names,
          date: d.event_date,
          venue: d.venue,
          location: d.location,
          guestCount: d.guest_count,
          budget: d.budget,
          spent: d.spent || 0,
          status: d.status,
          imageUrl: d.image_url,
        }));
      setEvents(mapped);
    } catch (e) {
      console.error('Error fetching events:', e);
      toast.error('Erreur lors du chargement des événements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [user]);

  const handleViewDetail = (event: Event) => {
    setSelectedEvent(event);
    setIsDetailOpen(true);
  };

  const handleEdit = (event: Event) => {
    setSelectedEvent(event);
    setIsEditMode(true);
    setFormData({
      clientNames: event.clientNames,
      date: event.date,
      venue: event.venue,
      location: event.location,
      guestCount: event.guestCount.toString(),
      budget: event.budget.toString(),
      spent: event.spent.toString(),
    });
    setImagePreview(event.imageUrl || '');
    setIsNewEventOpen(true);
  };

  const handleArchive = async (eventId: string) => {
    if (!confirm('Archiver cet événement ?')) return;
    try {
      await updateDocument('events', eventId, { status: 'archived' });
      toast.success('Événement archivé');
      fetchEvents();
    } catch {
      toast.error('Erreur lors de l\'archivage');
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!formData.clientNames || !formData.date || !formData.venue || !formData.location || !formData.guestCount || !formData.budget) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setUploading(true);
    try {
      let imageUrl = isEditMode && selectedEvent ? selectedEvent.imageUrl : '';
      
      if (imageFile) {
        imageUrl = await uploadFile(imageFile, `events/${user.uid}/${Date.now()}_${imageFile.name}`);
      }

      const eventData = {
        client_names: formData.clientNames,
        event_date: formData.date,
        venue: formData.venue,
        location: formData.location,
        guest_count: parseInt(formData.guestCount),
        budget: parseFloat(formData.budget),
        spent: parseFloat(formData.spent),
        status: 'confirmed',
        image_url: imageUrl,
      };

      if (isEditMode && selectedEvent) {
        await updateDocument('events', selectedEvent.id, eventData);
        toast.success('Événement modifié');
      } else {
        const eventDate = new Date(formData.date);
        const today = new Date();
        const daysUntil = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        await addDocument('events', {
          ...eventData,
          reference: `J-${daysUntil}`,
          owner_id: user.uid,
          created_at: serverTimestamp(),
        });
        toast.success('Événement créé');
      }

      setIsNewEventOpen(false);
      resetForm();
      fetchEvents();
    } catch (e) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      clientNames: '',
      date: '',
      venue: '',
      location: '',
      guestCount: '',
      budget: '',
      spent: '0',
    });
    setImageFile(null);
    setImagePreview('');
    setIsEditMode(false);
    setSelectedEvent(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-purple mb-1 sm:mb-2">
              Événements
            </h1>
            <p className="text-sm sm:text-base text-brand-gray">
              Gérez tous vos mariages et événements
            </p>
          </div>
          <Button 
            className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2 w-full sm:w-auto"
            onClick={() => {
              resetForm();
              setIsNewEventOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nouvel événement</span>
            <span className="sm:hidden">Nouveau</span>
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-brand-turquoise" />
          </div>
        ) : events.length === 0 ? (
          <div className="flex items-center justify-center min-h-[500px]">
            <Card className="p-12 shadow-xl border-2 border-dashed border-brand-purple/30 bg-gradient-to-br from-white to-brand-purple/5">
              <div className="flex flex-col items-center justify-center text-center space-y-6 max-w-md">
                <div className="relative">
                  <div className="absolute inset-0 bg-brand-turquoise/20 blur-3xl rounded-full"></div>
                  <PartyPopper className="h-24 w-24 text-brand-turquoise relative" strokeWidth={1.5} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-brand-purple">
                    Aucun événement pour le moment
                  </h2>
                  <p className="text-brand-gray text-sm leading-relaxed">
                    Commencez à organiser vos mariages et événements en créant votre premier événement
                  </p>
                </div>
                <Button onClick={() => setIsNewEventOpen(true)} className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2 px-8 py-6 text-base">
                  <Plus className="h-5 w-5" /> Créer le premier événement
                </Button>
              </div>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {events.map((event) => {
            const config = statusConfig[event.status as keyof typeof statusConfig];
            const budgetPercentage = (event.spent / event.budget) * 100;

              return (
                <Card key={event.id} className="overflow-hidden shadow-xl border-0 hover:shadow-2xl transition-shadow">
                  {event.imageUrl && (
                    <div className="relative h-48 w-full">
                      <Image
                        src={event.imageUrl}
                        alt={event.clientNames}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="p-6">
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

                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        className="flex-1 border-2 border-brand-turquoise text-brand-turquoise hover:bg-brand-turquoise hover:text-white"
                        onClick={() => handleViewDetail(event)}
                      >
                        Détails
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEdit(event)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleArchive(event.id)}
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Détail Événement */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
      <Dialog open={isNewEventOpen} onOpenChange={(open) => {
        if (!open) resetForm();
        setIsNewEventOpen(open);
      }}>
        <DialogContent className="sm:max-w-lg w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-brand-purple">
              {isEditMode ? 'Modifier l\'événement' : 'Nouvel événement'}
            </DialogTitle>
            <DialogDescription>
              {isEditMode ? 'Modifiez les informations de l\'événement' : 'Créez un nouveau mariage ou événement'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Image Upload */}
            <div>
              <Label>Photo de l&apos;événement</Label>
              <div className="mt-2">
                {imagePreview ? (
                  <div className="relative w-full h-48 rounded-lg overflow-hidden border-2 border-brand-turquoise/30">
                    <Image
                      src={imagePreview}
                      alt="Preview"
                      fill
                      className="object-cover"
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview('');
                      }}
                    >
                      Supprimer
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-brand-purple/30 rounded-lg cursor-pointer hover:bg-brand-beige/20 transition-colors">
                    <ImageIcon className="h-12 w-12 text-brand-gray mb-2" />
                    <span className="text-sm text-brand-gray">Cliquez pour ajouter une photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </label>
                )}
              </div>
            </div>

            <div>
              <Label>Noms des mariés *</Label>
              <Input 
                placeholder="Julie & Frédérick" 
                className="mt-1"
                value={formData.clientNames}
                onChange={(e) => setFormData({...formData, clientNames: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Date de l&apos;événement *</Label>
                <Input 
                  type="date" 
                  className="mt-1"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                />
              </div>
              <div>
                <Label>Nombre d&apos;invités *</Label>
                <Input 
                  type="number" 
                  placeholder="120" 
                  className="mt-1"
                  value={formData.guestCount}
                  onChange={(e) => setFormData({...formData, guestCount: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Lieu *</Label>
                <Input 
                  placeholder="Château d'Apigné" 
                  className="mt-1"
                  value={formData.venue}
                  onChange={(e) => setFormData({...formData, venue: e.target.value})}
                />
              </div>
              <div>
                <Label>Ville *</Label>
                <Input 
                  placeholder="Rennes" 
                  className="mt-1"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Budget total (€) *</Label>
                <Input 
                  type="number" 
                  placeholder="25000" 
                  className="mt-1"
                  value={formData.budget}
                  onChange={(e) => setFormData({...formData, budget: e.target.value})}
                />
              </div>
              <div>
                <Label>Montant dépensé (€)</Label>
                <Input 
                  type="number" 
                  placeholder="0" 
                  className="mt-1"
                  value={formData.spent}
                  onChange={(e) => setFormData({...formData, spent: e.target.value})}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              resetForm();
              setIsNewEventOpen(false);
            }}>
              Annuler
            </Button>
            <Button 
              className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
              onClick={handleSubmit}
              disabled={uploading}
            >
              {uploading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enregistrement...</>
              ) : isEditMode ? (
                'Modifier'
              ) : (
                'Créer l\'événement'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
