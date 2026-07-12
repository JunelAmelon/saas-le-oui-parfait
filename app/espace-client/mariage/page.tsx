'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  Euro,
  ArrowRight,
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

  const daysRemaining = eventDate ? calculateDaysRemaining(eventDate) : 0;

  useEffect(() => {
    setEventDate((event?.event_date || client?.event_date || '') as string);
    setLocation((event?.location || client?.event_location || '') as string);
    setGuestCount((event?.guest_count ?? (client as any)?.guests ?? 0) as number);
    setBudget((event?.budget ?? (client as any)?.budget ?? 0) as number);
    setThemeStyle(
      (event as any)?.theme?.style ||
        (client as any)?.theme?.style ||
        (client as any)?.theme_style ||
        ''
    );
    setThemeDescription(
      (event as any)?.theme?.description ||
        (client as any)?.theme?.description ||
        (client as any)?.theme_description ||
        ''
    );
    setThemeColors(
      ((event as any)?.theme?.colors || (client as any)?.theme?.colors || (client as any)?.theme_colors || []) as string[]
    );
    setNotes((event as any)?.notes || (client as any)?.notes || '');
  }, [event, client]);

  if (dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-beige">
        <Loader2 className="animate-spin h-8 w-8 text-brand-turquoise" />
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
      const plannerId = (client as any)?.planner_id || event?.planner_id || '';

      await addDocument('change_requests', {
        type: 'wedding_info',
        status: 'pending',
        client_id: client.id,
        event_id: event?.id || '',
        planner_id: plannerId,
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

      try {
        if (plannerId) {
          await addDocument('notifications', {
            recipient_id: plannerId,
            type: 'change_request',
            title: 'Nouvelle demande de modification',
            message: `${coupleNames} a envoyé une demande de modification`,
            link: `/agence/clients?clientId=${client.id}`,
            read: false,
            created_at: new Date(),
            planner_id: plannerId,
            client_id: client.id,
            event_id: event?.id || null,
            meta: { from: 'client', request_type: 'wedding_info' },
          });

          try {
            const { sendPushToRecipient } = await import('@/lib/push');
            await sendPushToRecipient({
              recipientId: plannerId,
              title: 'Nouvelle demande de modification',
              body: `${coupleNames} a envoyé une demande de modification`,
              link: `/agence/clients?clientId=${client.id}`,
            });
          } catch (e) {
            console.warn('Unable to send push:', e);
          }

          try {
            const { sendEmailToUid } = await import('@/lib/email');
            await sendEmailToUid({
              recipientUid: plannerId,
              subject: 'Nouvelle demande de modification - Le Oui Parfait',
              text: `${coupleNames} a envoyé une demande de modification.\n\nConnectez-vous à votre espace admin pour la consulter.`,
            });
          } catch (e) {
            console.warn('Unable to send email:', e);
          }
        }
      } catch (e) {
        console.warn('Unable to create planner notification for change request:', e);
      }

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

        {/* ---------- HERO (identique DA dashboard) ---------- */}
        <div className="relative overflow-hidden rounded-3xl bg-brand-purple px-7 py-9 sm:px-10 sm:py-11">
          <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full bg-brand-turquoise/10 blur-3xl pointer-events-none" />
          <svg
            className="absolute right-6 top-1/2 -translate-y-1/2 opacity-[0.12] pointer-events-none hidden sm:block"
            width="150" height="150" viewBox="0 0 100 100" fill="none"
          >
            <path d="M50 5 L56 44 L95 50 L56 56 L50 95 L44 56 L5 50 L44 44 Z" fill="white" />
          </svg>

          <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <span className="inline-block text-[10px] tracking-label uppercase text-brand-purple bg-white/90 px-3 py-1.5 rounded-full mb-4">
                Mariage
              </span>
              <h1 className="font-baskerville text-3xl sm:text-4xl text-brand-beige mb-2">
                {coupleNames}
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-brand-beige/60 text-sm">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-brand-turquoise" />
                  {eventDate ? new Date(eventDate).toLocaleDateString('fr-FR') : 'Date à définir'}
                </span>
                {location && (
                  <>
                    <span className="text-brand-beige/25">·</span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-brand-turquoise" />
                      {location}
                    </span>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={openRequest}
              disabled={sending}
              className="inline-flex items-center gap-3 bg-[#2E2937] hover:bg-[#221f2a] text-white text-sm font-semibold pl-5 pr-1.5 py-1.5 rounded-full transition-colors shrink-0"
            >
              Demander une modification
              <span className="w-8 h-8 rounded-full bg-brand-turquoise flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-white" />
              </span>
            </button>
          </div>
        </div>

        {/* ---------- PILLS (icônes multicolores comme le dashboard) ---------- */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center gap-3 bg-white rounded-2xl border border-brand-purple/8 shadow-sm p-4">
            <div className="w-10 h-10 rounded-xl bg-brand-purple/8 flex items-center justify-center shrink-0">
              <Calendar className="w-4.5 h-4.5 text-brand-purple" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] tracking-label uppercase text-brand-gray mb-0.5">Date</p>
              <p className="font-baskerville text-brand-purple truncate">
                {eventDate ? new Date(eventDate).toLocaleDateString('fr-FR') : 'À définir'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white rounded-2xl border border-brand-purple/8 shadow-sm p-4">
            <div className="w-10 h-10 rounded-xl bg-[#F3E3E6] flex items-center justify-center shrink-0">
              <MapPin className="w-4.5 h-4.5 text-[#B98A96]" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] tracking-label uppercase text-brand-gray mb-0.5">Lieu</p>
              <p className="font-baskerville text-brand-purple truncate">{location || 'À définir'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white rounded-2xl border border-brand-purple/8 shadow-sm p-4">
            <div className="w-10 h-10 rounded-xl bg-brand-turquoise/15 flex items-center justify-center shrink-0">
              <Users className="w-4.5 h-4.5 text-brand-turquoise-hover" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] tracking-label uppercase text-brand-gray mb-0.5">Invités</p>
              <p className="font-baskerville text-brand-purple">{guestCount || 0}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white rounded-2xl border border-brand-purple/8 shadow-sm p-4">
            <div className="w-10 h-10 rounded-xl bg-[#F1EADD] flex items-center justify-center shrink-0">
              <Euro className="w-4.5 h-4.5 text-[#C9A96E]" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] tracking-label uppercase text-brand-gray mb-0.5">Budget</p>
              <p className="font-baskerville text-brand-purple">{(budget || 0).toLocaleString('fr-FR')} €</p>
            </div>
          </div>
        </div>

        {/* ---------- THÈME & DÉCORATION (façon "mood cards") ---------- */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-baskerville text-xl text-brand-purple">Thème &amp; décoration</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card Style */}
            <div className="bg-white rounded-3xl border border-brand-purple/6 shadow-sm overflow-hidden">
              <div className="h-24 bg-gradient-to-br from-brand-purple to-[#6a6178] flex items-center justify-center">
                <Palette className="w-7 h-7 text-white/80" />
              </div>
              <div className="p-5 border-t-2 border-brand-purple">
                <span className="inline-block text-[10px] font-bold tracking-wide uppercase text-brand-purple bg-brand-purple/8 px-2.5 py-1 rounded-full mb-3">
                  Style
                </span>
                <p className="font-baskerville text-lg text-brand-purple leading-snug">
                  {themeStyle || 'À définir'}
                </p>
              </div>
            </div>

            {/* Card Palette */}
            <div className="bg-white rounded-3xl border border-brand-purple/6 shadow-sm overflow-hidden">
              <div className="h-24 flex">
                {(themeColors.length > 0 ? themeColors : ['#88b7b5', '#4B4456', '#C9A96E', '#B98A96']).map((c, i) => (
                  <div key={i} className="flex-1" style={{ backgroundColor: c }} />
                ))}
              </div>
              <div className="p-5 border-t-2 border-brand-turquoise">
                <span className="inline-block text-[10px] font-bold tracking-wide uppercase text-brand-turquoise-hover bg-brand-turquoise/15 px-2.5 py-1 rounded-full mb-3">
                  Palette
                </span>
                <div className="flex gap-2 flex-wrap">
                  {themeColors.length > 0 ? (
                    themeColors.map((c) => (
                      <div key={c} className="w-6 h-6 rounded-lg shadow-sm" style={{ backgroundColor: c }} title={c} />
                    ))
                  ) : (
                    <p className="text-sm text-brand-gray">Couleurs à définir</p>
                  )}
                </div>
              </div>
            </div>

            {/* Card Description */}
            <div className="bg-white rounded-3xl border border-brand-purple/6 shadow-sm overflow-hidden">
              <div className="h-24 bg-gradient-to-br from-[#C9A96E] to-[#e0c395] flex items-center justify-center">
                <Clock className="w-7 h-7 text-white/80" />
              </div>
              <div className="p-5 border-t-2 border-[#C9A96E]">
                <span className="inline-block text-[10px] font-bold tracking-wide uppercase text-[#C9A96E] bg-[#F1EADD] px-2.5 py-1 rounded-full mb-3">
                  Ambiance
                </span>
                <p className="text-sm text-brand-gray leading-relaxed whitespace-pre-wrap line-clamp-4">
                  {themeDescription || 'Description à venir'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ---------- NOTES ---------- */}
        <Card className="p-6 sm:p-8 border border-brand-purple/8 shadow-sm rounded-3xl bg-white">
          <div className="flex items-center justify-between gap-4 mb-1">
            <h2 className="font-baskerville text-xl text-brand-purple">Notes</h2>
            <div className="w-9 h-9 rounded-full bg-brand-purple/8 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4 text-brand-purple" />
            </div>
          </div>
          <div className="w-10 h-px bg-brand-turquoise mb-6" />
          <p className="text-sm text-brand-gray whitespace-pre-wrap leading-relaxed">{notes || '—'}</p>
        </Card>

        {/* ---------- DIALOG DEMANDE DE MODIFICATION ---------- */}
        <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl">
            <DialogHeader>
              <DialogTitle className="font-baskerville text-2xl text-brand-purple">
                Demander une modification
              </DialogTitle>
              <DialogDescription>
                Proposez les changements souhaités. Votre wedding planner validera (ou ajustera) avant application.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] tracking-label uppercase text-brand-gray">Date</Label>
                  <Input value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] tracking-label uppercase text-brand-gray">Heure (optionnel)</Label>
                  <Input value={eventTime} onChange={(e) => setEventTime(e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] tracking-label uppercase text-brand-gray">Lieu</Label>
                  <Input value={location} onChange={(e) => setLocation(e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] tracking-label uppercase text-brand-gray">Invités</Label>
                  <Input
                    type="number"
                    value={guestCount}
                    onChange={(e) => setGuestCount(parseInt(e.target.value) || 0)}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] tracking-label uppercase text-brand-gray">Budget</Label>
                  <Input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(parseFloat(e.target.value) || 0)}
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] tracking-label uppercase text-brand-gray">Style</Label>
                    <Input value={themeStyle} onChange={(e) => setThemeStyle(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] tracking-label uppercase text-brand-gray">Palette de couleurs</Label>
                    <ColorPalette selectedColors={themeColors} onColorsChange={handleColorChange} maxColors={6} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] tracking-label uppercase text-brand-gray">Description</Label>
                  <Textarea
                    value={themeDescription}
                    onChange={(e) => setThemeDescription(e.target.value)}
                    rows={6}
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] tracking-label uppercase text-brand-gray">Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} className="rounded-xl" />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] tracking-label uppercase text-brand-gray">
                  Note pour votre wedding planner *
                </Label>
                <Textarea
                  value={requestNote}
                  onChange={(e) => setRequestNote(e.target.value)}
                  placeholder="Expliquez la raison du changement, contraintes, détails importants..."
                  rows={4}
                  className="rounded-xl"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setRequestOpen(false)} disabled={sending} className="rounded-full">
                Annuler
              </Button>
              <Button
                className="bg-brand-turquoise hover:bg-brand-turquoise-hover rounded-full"
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