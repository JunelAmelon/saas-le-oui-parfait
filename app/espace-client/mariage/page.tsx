'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClientDashboardLayout } from '@/components/layout/ClientDashboardLayout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useClientData } from '@/contexts/ClientDataContext';
import { calculateDaysRemaining } from '@/lib/client-helpers';
import { updateDocument } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';
import {
  Heart,
  Calendar,
  MapPin,
  Users,
  Clock,
  Palette,
  Music,
  Utensils,
  Camera,
  Edit,
  Save,
  Loader2,
} from 'lucide-react';
import { ColorPalette } from '@/components/wedding/ColorPalette';

export default function MariagePage() {
  const { client, event, loading: dataLoading } = useClientData();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const coupleNames = useMemo(() => {
    const n1 = client?.name || '';
    const n2 = client?.partner || '';
    return `${n1}${n1 && n2 ? ' & ' : ''}${n2}`.trim() || event?.couple_names || 'Client';
  }, [client?.name, client?.partner, event?.couple_names]);

  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [location, setLocation] = useState('');
  const [guestCount, setGuestCount] = useState<number>(0);
  const [budget, setBudget] = useState<number>(0);
  const [themeStyle, setThemeStyle] = useState('');
  const [themeDescription, setThemeDescription] = useState('');
  const [themeColors, setThemeColors] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const displayDate = event?.event_date || client?.event_date || '';
  const displayLocation = event?.location || client?.event_location || '';
  const displayGuests = event?.guest_count ?? (client as any)?.guests ?? 0;
  const displayBudget = event?.budget ?? (client as any)?.budget ?? 0;
  const daysRemaining = displayDate ? calculateDaysRemaining(displayDate) : 0;

  useEffect(() => {
    setEventDate((event?.event_date || client?.event_date || '') as string);
    setLocation((event?.location || client?.event_location || '') as string);
    setGuestCount((event?.guest_count ?? (client as any)?.guests ?? 0) as number);
    setBudget((event?.budget ?? (client as any)?.budget ?? 0) as number);
    setThemeStyle(event?.theme?.style || '');
    setThemeDescription(event?.theme?.description || '');
    setThemeColors(event?.theme?.colors || []);
    setNotes(event?.notes || '');
  }, [event, client]);

  if (dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-12 w-12 text-brand-turquoise" />
      </div>
    );
  }

  const handleColorChange = (colors: string[]) => {
    setThemeColors(colors);
  };

  const handleSave = async () => {
    if (!event?.id) {
      toast({
        title: 'Impossible de sauvegarder',
        description: "Votre wedding planner doit d'abord associer votre événement.",
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    try {
      await updateDocument('events', event.id, {
        event_date: eventDate,
        location: location,
        guest_count: guestCount,
        budget: budget,
        theme: {
          style: themeStyle,
          colors: themeColors,
          description: themeDescription,
        },
        notes: notes,
      });
      toast({
        title: 'Modifications enregistrées',
        description: 'Les informations de votre mariage ont été mises à jour',
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving wedding info:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder les modifications',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ClientDashboardLayout clientName={coupleNames} daysRemaining={daysRemaining}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-purple flex items-center gap-2 sm:gap-3">
              <Heart className="h-6 w-6 sm:h-8 sm:w-8 text-red-500 fill-red-500" />
              Mon Mariage
            </h1>
            <p className="text-sm sm:text-base text-brand-gray mt-1">
              Toutes les informations sur votre grand jour
            </p>
          </div>
          <Button
            onClick={() => {
              if (saving) return;
              if (isEditing) {
                void handleSave();
              } else {
                setIsEditing(true);
              }
            }}
            className={`w-full sm:w-auto ${isEditing ? 'bg-green-600 hover:bg-green-700' : 'bg-brand-turquoise hover:bg-brand-turquoise-hover'}`}
            disabled={saving}
          >
            {isEditing ? (
              <>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </>
            ) : (
              <>
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-6 shadow-xl border-0 lg:col-span-2">
            <h2 className="text-xl font-bold text-brand-purple mb-6 flex items-center gap-2">
              <Heart className="h-5 w-5 text-brand-turquoise" />
              Les Mariés
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-brand-gray">Partenaire 1</Label>
                {isEditing ? (
                  <Input 
                    value={client?.name || ''}
                    disabled
                    className="mt-1" 
                  />
                ) : (
                  <p className="text-lg font-medium text-brand-purple mt-1">
                    {client?.name || ''}
                  </p>
                )}
              </div>
              <div>
                <Label className="text-brand-gray">Partenaire 2</Label>
                {isEditing ? (
                  <Input 
                    value={client?.partner || ''}
                    disabled
                    className="mt-1" 
                  />
                ) : (
                  <p className="text-lg font-medium text-brand-purple mt-1">
                    {client?.partner || ''}
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-brand-turquoise/10 to-white">
            <h2 className="text-xl font-bold text-brand-purple mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-brand-turquoise" />
              Compte à rebours
            </h2>
            <div className="text-center">
              <p className="text-5xl font-bold text-brand-turquoise">
                J-{daysRemaining}
              </p>
              {isEditing ? (
                <>
                  <Input 
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="mt-2 text-center" 
                  />
                  <Input 
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    className="mt-1 text-center text-sm" 
                  />
                </>
              ) : (
                <>
                  <p className="text-brand-gray mt-2">
                    {eventDate ? new Date(eventDate).toLocaleDateString('fr-FR') : 'Date à définir'}
                  </p>
                  {eventTime ? <p className="text-sm text-brand-gray">à {eventTime}</p> : null}
                </>
              )}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 shadow-xl border-0">
            <h2 className="text-xl font-bold text-brand-purple mb-6 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-brand-turquoise" />
              Lieu de réception
            </h2>
            <div className="space-y-4">
              <div>
                <Label className="text-brand-gray">Nom du lieu</Label>
                {isEditing ? (
                  <Input 
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="mt-1" 
                  />
                ) : (
                  <p className="text-lg font-medium text-brand-purple mt-1">
                    {location || 'À définir'}
                  </p>
                )}
              </div>
              <div>
                <Label className="text-brand-gray">Adresse</Label>
                {isEditing ? (
                  <Input 
                    value={''}
                    disabled
                    className="mt-1" 
                  />
                ) : (
                  <p className="text-brand-purple mt-1">{''}</p>
                )}
              </div>
              <div>
                <Label className="text-brand-gray">Capacité</Label>
                {isEditing ? (
                  <Input 
                    type="number"
                    value={guestCount}
                    onChange={(e) => setGuestCount(parseInt(e.target.value) || 0)}
                    className="mt-1" 
                  />
                ) : (
                  <p className="text-brand-purple mt-1">{guestCount || 0} personnes</p>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-6 shadow-xl border-0">
            <h2 className="text-xl font-bold text-brand-purple mb-6 flex items-center gap-2">
              <Users className="h-5 w-5 text-brand-turquoise" />
              Invités
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                {isEditing ? (
                  <Input 
                    type="number"
                    value={guestCount}
                    onChange={(e) => setGuestCount(parseInt(e.target.value) || 0)}
                    className="text-center font-bold" 
                  />
                ) : (
                  <p className="text-3xl font-bold text-brand-purple">{guestCount || 0}</p>
                )}
                <p className="text-sm text-brand-gray mt-1">Invités</p>
              </div>
              <div className="text-center p-4 bg-brand-turquoise/10 rounded-lg">
                {isEditing ? (
                  <Input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(parseFloat(e.target.value) || 0)}
                    className="text-center font-bold"
                  />
                ) : (
                  <p className="text-3xl font-bold text-brand-purple">{(budget || 0).toLocaleString('fr-FR')} €</p>
                )}
                <p className="text-sm text-brand-gray mt-1">Budget</p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-6 shadow-xl border-0">
          <h2 className="text-xl font-bold text-brand-purple mb-6 flex items-center gap-2">
            <Palette className="h-5 w-5 text-brand-turquoise" />
            Thème & Décoration
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="text-brand-gray">Style</Label>
              {isEditing ? (
                <Input 
                  value={themeStyle}
                  onChange={(e) => setThemeStyle(e.target.value)}
                  className="mt-1" 
                />
              ) : (
                <p className="text-lg font-medium text-brand-purple mt-1">
                  {themeStyle || 'À définir'}
                </p>
              )}
              <div className="mt-4">
                <Label className="text-brand-gray">Palette de couleurs</Label>
                <div className="mt-2">
                  <ColorPalette 
                    selectedColors={themeColors}
                    onColorsChange={handleColorChange}
                    maxColors={6}
                  />
                </div>
              </div>
            </div>
            <div>
              <Label className="text-brand-gray">Description</Label>
              {isEditing ? (
                <Textarea 
                  value={themeDescription}
                  onChange={(e) => setThemeDescription(e.target.value)}
                  className="mt-1" 
                  rows={4} 
                />
              ) : (
                <p className="text-brand-purple mt-1">{themeDescription || ''}</p>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-6 shadow-xl border-0">
          <h2 className="text-xl font-bold text-brand-purple mb-6 flex items-center gap-2">
            <Clock className="h-5 w-5 text-brand-turquoise" />
            Notes & Déroulement
          </h2>
          {isEditing ? (
            <Textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1" 
              rows={4} 
            />
          ) : (
            <p className="text-brand-purple">{notes}</p>
          )}
        </Card>
      </div>
    </ClientDashboardLayout>
  );
}
