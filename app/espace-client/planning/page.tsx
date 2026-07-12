'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClientDashboardLayout } from '@/components/layout/ClientDashboardLayout';
import { useClientData } from '@/contexts/ClientDataContext';
import { calculateDaysRemaining } from '@/lib/client-helpers';
import { getDocuments } from '@/lib/db';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle,
  Circle,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Loader2,
} from 'lucide-react';
import { updateDocument } from '@/lib/db';

type Step = {
  id: string;
  event_id: string;
  client_id: string;
  planner_id?: string;
  title: string;
  description?: string;
  deadline?: string;
  kind?: 'milestone';
  admin_confirmed?: boolean;
  client_confirmed?: boolean;
  created_at?: any;
};

type AppointmentTask = {
  id: string;
  kind?: 'appointment';
  event_id: string;
  client_id: string;
  title?: string;
  notes?: string;
  location?: string;
  status?: 'pending' | 'accepted' | 'refused' | 'cancelled' | 'completed';
  confirmed_date?: string;
  confirmed_time?: string;
  requested_date?: string;
  requested_time?: string;
};

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: string;
  location: string;
  status: string;
  type: string;
}

const months = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export default function PlanningPage() {
  const { client, event, loading: dataLoading } = useClientData();
  const [rdvEvents, setRdvEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [steps, setSteps] = useState<Step[]>([]);
  const [stepsLoading, setStepsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isEventDetailOpen, setIsEventDetailOpen] = useState(false);

  const coupleNames = useMemo(() => {
    const n1 = client?.name || '';
    const n2 = client?.partner || '';
    return `${n1}${n1 && n2 ? ' & ' : ''}${n2}`.trim() || event?.couple_names || 'Client';
  }, [client?.name, client?.partner, event?.couple_names]);

  useEffect(() => {
    async function fetchRDV() {
      if (!client?.id) {
        setRdvEvents([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const planningEvents = await getDocuments('events', [
          { field: 'client_id', operator: '==', value: client.id },
        ]);

        const mappedFromEvents = (planningEvents as any[])
          .filter((e) => Boolean(e?.date) && !e?.event_date && !e?.couple_names)
          .map((e) => {
            return {
              id: e.id,
              title: e.title || 'Rendez-vous',
              date: e.date || '',
              time: e.time || '',
              duration: '',
              location: e.location || '',
              status: 'upcoming',
              type: 'rdv',
              notes: e.description || '',
              adminResponse: '',
            };
          });

        let mappedFromTasks: any[] = [];
        {
          const baseFilters: any[] = [{ field: 'client_id', operator: '==', value: client.id }];
          if (event?.id) {
            baseFilters.unshift({ field: 'event_id', operator: '==', value: event.id });
          }

          const items = await getDocuments('tasks', baseFilters);

          const appointments = (items as any[])
            .filter((t) => t?.kind === 'appointment')
            .filter((t) => (t?.status || 'accepted') === 'accepted') as AppointmentTask[];

          mappedFromTasks = appointments.map((a) => {
            const date = a.confirmed_date || a.requested_date || '';
            const time = a.confirmed_time || a.requested_time || '';
            return {
              id: a.id,
              title: a.title || 'Rendez-vous',
              date,
              time,
              duration: '',
              location: a.location || '',
              status: 'upcoming',
              type: 'rdv',
              notes: a.notes || '',
              adminResponse: '',
            };
          });
        }

        const mapped = [...mappedFromEvents, ...mappedFromTasks];

        mapped.sort((x, y) => {
          const dx = new Date(`${x.date}T${x.time || '00:00'}`).getTime();
          const dy = new Date(`${y.date}T${y.time || '00:00'}`).getTime();
          return dx - dy;
        });

        setRdvEvents(mapped.filter((x) => x.date));
      } catch (error) {
        console.error('Error fetching RDV:', error);
        setRdvEvents([]);
      } finally {
        setLoading(false);
      }
    }
    if (!dataLoading) {
      fetchRDV();
    }
  }, [event, client, dataLoading]);

  useEffect(() => {
    async function fetchSteps() {
      if (!client?.id) {
        setSteps([]);
        setStepsLoading(false);
        return;
      }
      try {
        setStepsLoading(true);
        const filters: any[] = [];
        if (event?.id) {
          filters.push({ field: 'event_id', operator: '==', value: event.id });
        } else {
          filters.push({ field: 'client_id', operator: '==', value: client.id });
        }

        const items = await getDocuments('tasks', filters);
        const onlySteps = (items as any[]).filter((t) => t?.kind === 'milestone');
        setSteps(onlySteps as Step[]);
      } catch (e) {
        console.error('Error fetching steps:', e);
        setSteps([]);
      } finally {
        setStepsLoading(false);
      }
    }

    if (!dataLoading) {
      fetchSteps();
    }
  }, [event?.id, client?.id, dataLoading]);

  const toggleClientConfirm = async (step: Step) => {
    if (!step?.id) return;
    const next = !step.client_confirmed;
    setSteps((prev) => prev.map((s) => (s.id === step.id ? { ...s, client_confirmed: next } : s)));
    try {
      await updateDocument('tasks', step.id, { client_confirmed: next });
    } catch (e) {
      console.error('Error confirming step:', e);
    }
  };

  const daysRemaining = event ? calculateDaysRemaining(event.event_date) : 0;

  const handleEventClick = (ev: Event) => {
    setSelectedEvent(ev);
    setIsEventDetailOpen(true);
  };

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();

  const rdvOnDay = (d: Date) => rdvEvents.filter((e) => e.date && isSameDay(new Date(e.date), d));
  const stepsOnDay = (d: Date) => steps.filter((s) => s.deadline && isSameDay(new Date(s.deadline), d));

  const today = new Date();

  const calendarCells = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const startOffset = (firstDayOfMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [currentMonth]);

  const selectedDayItems = useMemo(() => {
    if (!selectedDate) return { rdv: [], steps: [] };
    return { rdv: rdvOnDay(selectedDate), steps: stepsOnDay(selectedDate) };
  }, [selectedDate, rdvEvents, steps]);

  const nextRdv = rdvEvents[0];

  if (dataLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-beige">
        <Loader2 className="animate-spin h-8 w-8 text-brand-turquoise" />
      </div>
    );
  }

  return (
    <ClientDashboardLayout clientName={coupleNames} daysRemaining={daysRemaining}>
      <div className="space-y-6">

        {/* ---------- HERO ---------- */}
        <div className="relative overflow-hidden rounded-3xl bg-brand-purple px-7 py-9 sm:px-10 sm:py-11">
          <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full bg-brand-turquoise/10 blur-3xl pointer-events-none" />
          <svg
            className="absolute right-6 top-1/2 -translate-y-1/2 opacity-[0.12] pointer-events-none hidden sm:block"
            width="140" height="140" viewBox="0 0 100 100" fill="none"
          >
            <path d="M50 5 L56 44 L95 50 L56 56 L50 95 L44 56 L5 50 L44 44 Z" fill="white" />
          </svg>

          <div className="relative">
            <span className="inline-block text-[10px] tracking-label uppercase text-brand-purple bg-white/90 px-3 py-1.5 rounded-full mb-4">
              Planning
            </span>
            <h1 className="font-baskerville text-3xl sm:text-4xl text-brand-beige mb-2">
              Vos rendez-vous et étapes clés,<br className="hidden sm:block" /> tous au même endroit.
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-brand-beige/60 text-sm">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-brand-turquoise" />
                {rdvEvents.length} rendez-vous
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#C9A96E]" />
                {steps.length} étapes clés
              </span>
            </div>
          </div>
        </div>

        {/* ---------- PILLS ---------- */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 bg-white rounded-2xl border border-brand-purple/8 shadow-sm p-4">
            <div className="w-10 h-10 rounded-xl bg-brand-turquoise/15 flex items-center justify-center shrink-0">
              <CalendarIcon className="w-4.5 h-4.5 text-brand-turquoise-hover" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] tracking-label uppercase text-brand-gray mb-0.5">
                {nextRdv ? `Prochain le ${new Date(nextRdv.date).getDate()} ${months[new Date(nextRdv.date).getMonth()].slice(0, 3).toLowerCase()}.` : 'Aucun rendez-vous'}
              </p>
              <p className="font-baskerville text-brand-purple truncate">{nextRdv?.title || '—'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white rounded-2xl border border-brand-purple/8 shadow-sm p-4">
            <div className="w-10 h-10 rounded-xl bg-[#F1EADD] flex items-center justify-center shrink-0">
              <CheckCircle className="w-4.5 h-4.5 text-[#C9A96E]" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] tracking-label uppercase text-brand-gray mb-0.5">
                {steps.filter((s) => s.admin_confirmed && s.client_confirmed).length}/{steps.length} validées
              </p>
              <p className="font-baskerville text-brand-purple">Étapes clés</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white rounded-2xl border border-brand-purple/8 shadow-sm p-4">
            <div className="w-10 h-10 rounded-xl bg-brand-purple/8 flex items-center justify-center shrink-0">
              <Clock className="w-4.5 h-4.5 text-brand-purple" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] tracking-label uppercase text-brand-gray mb-0.5">J-{daysRemaining}</p>
              <p className="font-baskerville text-brand-purple">Avant le grand jour</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* ---------- GRAND CALENDRIER ---------- */}
          <Card className="xl:col-span-2 p-6 sm:p-8 border border-brand-purple/8 shadow-sm rounded-3xl bg-white">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => {
                  if (currentMonth.getMonth() === 0) {
                    setCurrentMonth(new Date(currentMonth.getFullYear() - 1, 11));
                  } else {
                    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
                  }
                }}
                className="w-9 h-9 rounded-full flex items-center justify-center text-brand-purple hover:bg-brand-purple/8 transition-colors"
              >
                <ChevronLeft className="h-4.5 w-4.5" />
              </button>
              <h2 className="font-baskerville text-2xl text-brand-purple">
                {months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h2>
              <button
                onClick={() => {
                  if (currentMonth.getMonth() === 11) {
                    setCurrentMonth(new Date(currentMonth.getFullYear() + 1, 0));
                  } else {
                    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
                  }
                }}
                className="w-9 h-9 rounded-full flex items-center justify-center text-brand-purple hover:bg-brand-purple/8 transition-colors"
              >
                <ChevronRight className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="flex items-center gap-5 mb-5 text-xs text-brand-gray">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-brand-turquoise" /> Rendez-vous
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#C9A96E]" /> Étape clé
              </span>
            </div>

            <div className="grid grid-cols-7 mb-2">
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
                <div key={day} className="text-center text-[10px] tracking-label uppercase text-brand-gray py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {calendarCells.map((d, i) => {
                if (!d) return <div key={i} className="aspect-square" />;

                const isToday = isSameDay(d, today);
                const isSelected = selectedDate ? isSameDay(d, selectedDate) : false;
                const rdvCount = rdvOnDay(d).length;
                const stepCount = stepsOnDay(d).length;
                const hasEvents = rdvCount > 0 || stepCount > 0;

                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(d)}
                    className={`relative aspect-square rounded-xl sm:rounded-2xl flex flex-col items-center justify-center gap-1 transition-all ${
                      isSelected
                        ? 'bg-brand-purple text-white shadow-md'
                        : isToday
                          ? 'bg-brand-turquoise/12 text-brand-purple ring-1 ring-brand-turquoise'
                          : hasEvents
                            ? 'bg-brand-beige text-brand-purple hover:bg-brand-beige/70'
                            : 'text-brand-purple/70 hover:bg-brand-purple/5'
                    }`}
                  >
                    <span className={`text-sm sm:text-base ${isToday && !isSelected ? 'font-bold' : 'font-medium'}`}>
                      {d.getDate()}
                    </span>
                    {hasEvents && (
                      <div className="flex items-center gap-0.5">
                        {rdvCount > 0 && (
                          <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-brand-turquoise'}`} />
                        )}
                        {stepCount > 0 && (
                          <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/70' : 'bg-[#C9A96E]'}`} />
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {selectedDate && (
              <div className="mt-6 pt-6 border-t border-brand-purple/8">
                <p className="text-[11px] tracking-label uppercase text-brand-gray mb-3">
                  {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>

                {selectedDayItems.rdv.length === 0 && selectedDayItems.steps.length === 0 ? (
                  <p className="text-sm text-brand-gray">Rien de prévu ce jour-là.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedDayItems.rdv.map((e) => (
                      <button
                        key={e.id}
                        onClick={() => handleEventClick(e as Event)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-brand-turquoise/10 hover:bg-brand-turquoise/15 transition-colors text-left"
                      >
                        <span className="w-1.5 h-8 rounded-full bg-brand-turquoise shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-brand-purple truncate">{e.title}</p>
                          <p className="text-xs text-brand-gray">{e.time} {e.location ? `· ${e.location}` : ''}</p>
                        </div>
                      </button>
                    ))}
                    {selectedDayItems.steps.map((s) => (
                      <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-[#F1EADD]">
                        <span className="w-1.5 h-8 rounded-full bg-[#C9A96E] shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-brand-purple truncate">{s.title}</p>
                          <p className="text-xs text-brand-gray">Échéance de l'étape clé</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ---------- VOS ÉTAPES CLÉS (tableau) ---------- */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-baskerville text-xl text-brand-purple">Vos étapes clés</h2>
                <a href="#" className="text-xs font-semibold text-brand-turquoise-hover">Voir tout</a>
              </div>
              <div className="rounded-2xl border border-brand-purple/8 p-5 sm:p-6">
                {stepsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-brand-turquoise" />
                  </div>
                ) : steps.length === 0 ? (
                  <p className="text-sm text-brand-gray py-4 text-center">Aucune étape pour le moment</p>
                ) : (
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="text-left text-[10px] tracking-label uppercase text-brand-gray font-semibold pb-3">Étape</th>
                        <th className="text-left text-[10px] tracking-label uppercase text-brand-gray font-semibold pb-3">Échéance</th>
                        <th className="text-left text-[10px] tracking-label uppercase text-brand-gray font-semibold pb-3">Statut</th>
                        <th className="pb-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {steps
                        .slice()
                        .sort((a, b) => (a.deadline || '').localeCompare(b.deadline || ''))
                        .map((s) => {
                          const done = Boolean(s.admin_confirmed) && Boolean(s.client_confirmed);
                          return (
                            <tr key={s.id} className="border-t border-brand-purple/6">
                              <td className="py-3 text-sm font-semibold text-brand-purple">{s.title}</td>
                              <td className="py-3 text-xs text-brand-gray">{s.deadline || '—'}</td>
                              <td className="py-3">
                                <span
                                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full ${
                                    done ? 'bg-[#F1EADD] text-[#C9A96E]' : 'bg-brand-purple/8 text-brand-gray'
                                  }`}
                                >
                                  {done ? 'Validée' : 'En cours'}
                                </span>
                              </td>
                              <td className="py-3 text-right">
                                <button
                                  onClick={() => void toggleClientConfirm(s)}
                                  className={`text-[10.5px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-full transition-colors ${
                                    done || s.client_confirmed
                                      ? 'text-brand-gray hover:bg-brand-purple/8'
                                      : 'bg-brand-turquoise text-white hover:bg-brand-turquoise-hover'
                                  }`}
                                >
                                  {done ? 'Détail' : s.client_confirmed ? 'Annuler' : 'Valider'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </Card>

          {/* ---------- COLONNE LATÉRALE : PROCHAINS RENDEZ-VOUS ---------- */}
          <div className="space-y-6">
            <Card className="p-6 sm:p-8 border border-brand-purple/8 shadow-sm rounded-3xl bg-white">
              <h3 className="font-baskerville text-xl text-brand-purple">Prochains rendez-vous</h3>
              <div className="w-10 h-px bg-brand-turquoise my-3" />

              {rdvEvents.length === 0 ? (
                <p className="text-sm text-brand-gray py-4">Aucun rendez-vous de prévu</p>
              ) : (
                <div className="space-y-2.5">
                  {rdvEvents.slice(0, 5).map((e) => (
                    <button
                      key={e.id}
                      onClick={() => handleEventClick(e as Event)}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl bg-brand-beige/60 hover:bg-brand-beige transition-colors text-left"
                    >
                      <div className="w-11 h-11 rounded-xl bg-brand-turquoise/15 flex flex-col items-center justify-center shrink-0 leading-none">
                        <span className="text-sm font-baskerville text-brand-turquoise-hover">
                          {new Date(e.date).getDate()}
                        </span>
                        <span className="text-[8px] uppercase text-brand-turquoise-hover/80 mt-0.5">
                          {months[new Date(e.date).getMonth()].slice(0, 3)}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-brand-purple truncate">{e.title}</p>
                        <p className="text-xs text-brand-gray flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {e.time} {e.location ? `· ${e.location}` : ''}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* ---------- DÉTAIL RDV ---------- */}
        <Dialog open={isEventDetailOpen} onOpenChange={setIsEventDetailOpen}>
          <DialogContent className="sm:max-w-md rounded-3xl">
            <DialogHeader>
              <DialogTitle className="font-baskerville text-2xl text-brand-purple">{selectedEvent?.title}</DialogTitle>
            </DialogHeader>
            {selectedEvent && (
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-3 p-4 bg-brand-turquoise/10 rounded-2xl">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0">
                    <CalendarIcon className="h-4.5 w-4.5 text-brand-turquoise-hover" />
                  </div>
                  <div>
                    <p className="font-medium text-brand-purple">
                      {new Date(selectedEvent.date).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                    <p className="text-sm text-brand-gray">
                      {selectedEvent.time}{selectedEvent.duration ? ` - Durée: ${selectedEvent.duration}` : ''}
                    </p>
                  </div>
                </div>
                {selectedEvent.location && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4.5 w-4.5 text-brand-turquoise-hover shrink-0" />
                    <p className="text-brand-purple text-sm">{selectedEvent.location}</p>
                  </div>
                )}
                <span className="inline-block text-[10px] font-semibold uppercase tracking-wide px-3 py-1 rounded-full bg-brand-turquoise/15 text-brand-turquoise-hover">
                  Confirmé
                </span>
              </div>
            )}
            <DialogFooter>
              <Button
                className="bg-brand-turquoise hover:bg-brand-turquoise-hover w-full rounded-full"
                onClick={() => setIsEventDetailOpen(false)}
              >
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ClientDashboardLayout>
  );
}