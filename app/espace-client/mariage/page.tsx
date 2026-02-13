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
import { addDocument } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';
import {
  Calendar,
  MapPin,
  Users,
  Palette,
  Clock,
  Loader2,
} from 'lucide-react';
import { ColorPalette } from '@/components/wedding/ColorPalette';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function MariagePage() {
  const { client, event, loading: dataLoading } = useClientData();
  const { toast } = useToast();
  const [requestOpen, setRequestOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [requestNote, setRequestNote] = useState('');

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

  const openRequest = () => {
    setRequestNote('');
    setRequestOpen(true);
  };

  const submitRequest = async () => {
    if (!client?.id) {
      toast({
        title: 'Impossible d’envoyer la demande',
        description: "Votre profil client n'est pas disponible.",
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    try {
      await addDocument('change_requests', {
        type: 'wedding_info',
        status: 'pending',
        client_id: client.id,
        event_id: event?.id || '',
        planner_id: (client as any)?.planner_id || event?.planner_id || '',
        note: requestNote || '',
        requested_changes: {
          event_date: eventDate,
          location,
          guest_count: guestCount,
          budget,
          theme: {
            style: themeStyle,
            colors: themeColors,
            description: themeDescription,
          },
          notes,
        },
        created_at: new Date().toISOString(),
      });

      toast({
        title: 'Demande envoyée',
        description: 'Votre wedding planner va étudier votre demande.',
      });
      setRequestOpen(false);
    } catch (error) {
      console.error('Error submitting change request:', error);
      toast({
        title: 'Erreur',
        description: "Impossible d'envoyer la demande",
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <ClientDashboardLayout clientName={coupleNames} daysRemaining={daysRemaining}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-purple">Mon mariage</h1>
            <p className="text-sm sm:text-base text-brand-gray mt-1">
              Informations, thème et notes
            </p>
          </div>
          <Button
            onClick={openRequest}
            className="w-full sm:w-auto bg-brand-turquoise hover:bg-brand-turquoise-hover"
            disabled={sending}
          >
            Demander une modification
          </Button>
        </div>

        <Card className="p-6 shadow-xl border-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs text-brand-gray uppercase tracking-label">Couple</p>
              <p className="text-2xl font-bold text-brand-purple">{coupleNames}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-brand-turquoise/15 text-brand-turquoise">J-{daysRemaining}</Badge>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-gray-50">
              <div className="flex items-center gap-2 text-brand-gray text-sm">
                <Calendar className="h-4 w-4 text-brand-turquoise" />
                Date
              </div>
              <div className="mt-2">
                <p className="font-medium text-brand-purple">
                  {eventDate ? new Date(eventDate).toLocaleDateString('fr-FR') : 'À définir'}
                </p>
                {eventTime ? <p className="text-sm text-brand-gray">{eventTime}</p> : null}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-gray-50">
              <div className="flex items-center gap-2 text-brand-gray text-sm">
                <MapPin className="h-4 w-4 text-brand-turquoise" />
                Lieu
              </div>
              <p className="mt-2 font-medium text-brand-purple">{location || 'À définir'}</p>
            </div>

            <div className="p-4 rounded-lg bg-gray-50">
              <div className="flex items-center gap-2 text-brand-gray text-sm">
                <Users className="h-4 w-4 text-brand-turquoise" />
                Invités
              </div>
              <p className="mt-2 font-medium text-brand-purple">{guestCount || 0}</p>
            </div>

            <div className="p-4 rounded-lg bg-gray-50">
              <div className="flex items-center gap-2 text-brand-gray text-sm">
                <span className="h-4 w-4 inline-flex items-center justify-center text-brand-turquoise">€</span>
                Budget
              </div>
              <p className="mt-2 font-medium text-brand-purple">{(budget || 0).toLocaleString('fr-FR')} €</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 shadow-xl border-0">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-brand-purple">Thème & décoration</h2>
              <p className="text-sm text-brand-gray">Style, palette et description</p>
            </div>
            <Palette className="h-5 w-5 text-brand-turquoise" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label className="text-brand-gray">Style</Label>
                <p className="mt-1 font-medium text-brand-purple">{themeStyle || '—'}</p>
              </div>

              <div>
                <Label className="text-brand-gray">Palette de couleurs</Label>
                <div className="mt-2">
                  <div className="flex gap-2 flex-wrap">
                    {(themeColors || []).length > 0 ? (
                      themeColors.map((c) => (
                        <div
                          key={c}
                          className="w-8 h-8 rounded-full border border-white shadow"
                          style={{ backgroundColor: c }}
                        />
                      ))
                    ) : (
                      <p className="text-sm text-brand-purple">—</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-brand-gray">Description</Label>
              <p className="mt-1 text-brand-purple whitespace-pre-wrap">{themeDescription || '—'}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 shadow-xl border-0">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-brand-purple">Notes</h2>
              <p className="text-sm text-brand-gray">Informations complémentaires</p>
            </div>
            <Clock className="h-5 w-5 text-brand-turquoise" />
          </div>
          <p className="text-brand-purple whitespace-pre-wrap">{notes || '—'}</p>
        </Card>

        <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Demander une modification</DialogTitle>
              <DialogDescription>
                Proposez les changements souhaités. Votre wedding planner validera (ou ajustera) avant application.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Heure (optionnel)</Label>
                  <Input value={eventTime} onChange={(e) => setEventTime(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Lieu</Label>
                  <Input value={location} onChange={(e) => setLocation(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Invités</Label>
                  <Input
                    type="number"
                    value={guestCount}
                    onChange={(e) => setGuestCount(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Budget</Label>
                  <Input type="number" value={budget} onChange={(e) => setBudget(parseFloat(e.target.value) || 0)} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Style</Label>
                    <Input value={themeStyle} onChange={(e) => setThemeStyle(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Palette de couleurs</Label>
                    <ColorPalette selectedColors={themeColors} onColorsChange={handleColorChange} maxColors={6} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={themeDescription} onChange={(e) => setThemeDescription(e.target.value)} rows={6} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} />
              </div>

              <div className="space-y-2">
                <Label>Note pour votre wedding planner *</Label>
                <Textarea
                  value={requestNote}
                  onChange={(e) => setRequestNote(e.target.value)}
                  placeholder="Expliquez la raison du changement, contraintes, détails importants..."
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setRequestOpen(false)} disabled={sending}>
                Annuler
              </Button>
              <Button
                className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
                onClick={submitRequest}
                disabled={sending || !requestNote.trim()}
              >
                {sending ? 'Envoi...' : 'Envoyer la demande'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ClientDashboardLayout>
  );
}
