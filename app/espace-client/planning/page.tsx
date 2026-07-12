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
  MapPin,
  Loader2,
  ChevronLeft,
  ChevronRight,
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

const ITEMS_PER_PAGE = 4;

export default function PlanningPage() {
  const { client, event, loading: dataLoading } = useClientData();
  const [rdvEvents, setRdvEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [steps, setSteps] = useState<Step[]>([]);
  const [stepsLoading, setStepsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isEventDetailOpen, setIsEventDetailOpen] = useState(false);
  const [rdvPage, setRdvPage] = useState(1);
  const [stepsPage, setStepsPage] = useState(1);

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

  useEffect(() => {
    setRdvPage(1);
  }, [rdvEvents.length]);

  useEffect(() => {
    setStepsPage(1);
  }, [steps.length]);

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

  const nextRdv = rdvEvents[0];

  // ---------- Frise chronologique : fusion RDV + étapes ----------
  type TimelineItem = {
    id: string;
    title: string;
    date: string;
    kind: 'rdv' | 'step';
    raw: any;
  };

  const timelineItems: TimelineItem[] = useMemo(() => {
    const rdvItems: TimelineItem[] = rdvEvents
      .filter((e) => e.date)
      .map((e) => ({ id: `rdv-${e.id}`, title: e.title, date: e.date, kind: 'rdv', raw: e }));
    const stepItems: TimelineItem[] = steps
      .filter((s) => s.deadline)
      .map((s) => ({ id: `step-${s.id}`, title: s.title, date: s.deadline as string, kind: 'step', raw: s }));
    return [...rdvItems, ...stepItems].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [rdvEvents, steps]);

  const { minTime, maxTime } = useMemo(() => {
    if (timelineItems.length === 0) {
      const now = Date.now();
      return { minTime: now, maxTime: now + 1000 * 60 * 60 * 24 * 30 };
    }
    const times = timelineItems.map((i) => new Date(i.date).getTime());
    let min = Math.min(...times);
    let max = Math.max(...times);
    if (min === max) {
      min -= 1000 * 60 * 60 * 24 * 7;
      max += 1000 * 60 * 60 * 24 * 7;
    } else {
      const pad = (max - min) * 0.08;
      min -= pad;
      max += pad;
    }
    return { minTime: min, maxTime: max };
  }, [timelineItems]);

  const percentFor = (dateStr: string) => {
    const t = new Date(dateStr).getTime();
    return Math.min(100, Math.max(0, ((t - minTime) / (maxTime - minTime)) * 100));
  };

  // ---------- Pagination ----------
  const rdvTotalPages = Math.max(1, Math.ceil(rdvEvents.length / ITEMS_PER_PAGE));
  const rdvPaginated = rdvEvents.slice((rdvPage - 1) * ITEMS_PER_PAGE, (rdvPage - 1) * ITEMS_PER_PAGE + ITEMS_PER_PAGE);

  const sortedSteps = useMemo(
    () => steps.slice().sort((a, b) => (a.deadline || '').localeCompare(b.deadline || '')),
    [steps]
  );
  const stepsTotalPages = Math.max(1, Math.ceil(sortedSteps.length / ITEMS_PER_PAGE));
  const stepsPaginated = sortedSteps.slice((stepsPage - 1) * ITEMS_PER_PAGE, (stepsPage - 1) * ITEMS_PER_PAGE + ITEMS_PER_PAGE);

  const MiniPagination = ({
    page,
    totalPages,
    onChange,
  }: {
    page: number;
    totalPages: number;
    onChange: (p: number) => void;
  }) => {
    if (totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-center gap-2 mt-4">
        <button
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="w-8 h-8 rounded-full flex items-center justify-center text-brand-purple disabled:opacity-30 hover:bg-brand-purple/6 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-xs text-brand-gray">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="w-8 h-8 rounded-full flex items-center justify-center text-brand-purple disabled:opacity-30 hover:bg-brand-purple/6 transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    );
  };

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
          <div className="flex items-center gap-3 bg-white rounded-2xl shadow-sm p-4">
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

          <div className="flex items-center gap-3 bg-white rounded-2xl shadow-sm p-4">
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

          <div className="flex items-center gap-3 bg-white rounded-2xl shadow-sm p-4">
            <div className="w-10 h-10 rounded-xl bg-brand-purple/8 flex items-center justify-center shrink-0">
              <Clock className="w-4.5 h-4.5 text-brand-purple" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] tracking-label uppercase text-brand-gray mb-0.5">J-{daysRemaining}</p>
              <p className="font-baskerville text-brand-purple">Avant le grand jour</p>
            </div>
          </div>
        </div>

        {/* ---------- FRISE CHRONOLOGIQUE (pleine largeur) ---------- */}
        <Card className="p-6 sm:p-8 border-0 shadow-sm rounded-3xl bg-white overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-baskerville text-xl text-brand-purple">Frise chronologique</h2>
            <div className="flex items-center gap-5 text-xs text-brand-gray">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-brand-turquoise" /> Rendez-vous
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#C9A96E]" /> Étape clé
              </span>
            </div>
          </div>

          {timelineItems.length === 0 ? (
            <p className="text-sm text-brand-gray py-6 text-center">Rien de planifié pour le moment.</p>
          ) : (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex justify-between pointer-events-none">
                  {[0, 20, 40, 60, 80, 100].map((p) => (
                    <div key={p} className="flex flex-col items-center" style={{ width: 1 }}>
                      <span className="text-[9px] text-brand-gray/50 -translate-x-1/2 mb-2">{p}%</span>
                      <div className="w-px bg-brand-purple/6 flex-1" style={{ minHeight: timelineItems.length * 52 }} />
                    </div>
                  ))}
                </div>

                <div className="relative pt-6 space-y-2.5">
                  {timelineItems.map((item) => {
                    const isRdv = item.kind === 'rdv';
                    const solid = isRdv ? 'bg-brand-turquoise' : 'bg-[#C9A96E]';
                    const left = percentFor(item.date);
                    return (
                      <div key={item.id} className="flex items-center gap-3">
                        <div className="w-40 sm:w-56 shrink-0 flex items-center gap-2 pr-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${solid}`} />
                          <span className="text-xs font-medium text-brand-purple truncate">{item.title}</span>
                        </div>
                        <div className="relative flex-1 h-9">
                          <div className="absolute inset-y-0 left-0 right-0 my-auto h-px bg-brand-purple/6" />
                          <button
                            onClick={() => (isRdv ? handleEventClick(item.raw as Event) : undefined)}
                            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full ${solid} text-white text-[11px] font-medium whitespace-nowrap shadow-sm ${isRdv ? 'cursor-pointer hover:opacity-90' : 'cursor-default'}`}
                            style={{ left: `${left}%` }}
                          >
                            <CalendarIcon className="w-3 h-3" />
                            {new Date(item.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-between mt-6 pt-4 border-t border-brand-purple/6 text-xs text-brand-gray">
                <span>{new Date(minTime).toLocaleDateString('fr-FR')}</span>
                <span>{new Date(maxTime).toLocaleDateString('fr-FR')}</span>
              </div>
            </>
          )}
        </Card>

        {/* ---------- DEUX COLONNES SYMÉTRIQUES, SÉPARATION VISIBLE SUR DESKTOP ---------- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-0 lg:divide-x lg:divide-brand-purple/10">
          {/* Prochains rendez-vous */}
          <div className="lg:pr-8">
            <h3 className="font-baskerville text-xl text-brand-purple mb-4">Prochains rendez-vous</h3>
            {rdvEvents.length === 0 ? (
              <div className="rounded-2xl shadow-sm bg-white p-6 text-center">
                <p className="text-sm text-brand-gray">Aucun rendez-vous de prévu</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {rdvPaginated.map((e) => (
                    <div key={e.id} className="rounded-2xl overflow-hidden bg-white shadow-sm flex flex-col">
                      <div className="flex items-center justify-between px-4 py-2.5 bg-brand-turquoise/15">
                        <span className="text-xs font-semibold truncate text-brand-turquoise-hover">{e.title}</span>
                        <span className="w-2 h-2 rounded-full bg-brand-turquoise shrink-0" />
                      </div>
                      <div className="p-4 flex flex-col gap-2 flex-1">
                        <div className="flex items-center gap-2 text-xs text-brand-gray">
                          <CalendarIcon className="h-3.5 w-3.5 text-brand-turquoise-hover shrink-0" />
                          <span className="truncate">
                            {new Date(e.date).toLocaleDateString('fr-FR')}
                            {e.time ? ` · ${e.time}` : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-brand-gray min-h-[18px]">
                          <MapPin className="h-3.5 w-3.5 text-brand-turquoise-hover shrink-0" />
                          <span className="truncate">{e.location || '—'}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1 mt-auto">
                          <span className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-brand-turquoise/15 text-brand-turquoise-hover">
                            Confirmé
                          </span>
                          <button
                            onClick={() => handleEventClick(e as Event)}
                            className="text-[10.5px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-full bg-brand-turquoise text-white hover:bg-brand-turquoise-hover transition-colors"
                          >
                            Détail
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <MiniPagination page={rdvPage} totalPages={rdvTotalPages} onChange={setRdvPage} />
              </>
            )}
          </div>

          {/* Étapes clés */}
          <div className="lg:pl-8">
            <h3 className="font-baskerville text-xl text-brand-purple mb-4">Étapes clés</h3>
            {stepsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-brand-turquoise" />
              </div>
            ) : steps.length === 0 ? (
              <div className="rounded-2xl shadow-sm bg-white p-6 text-center">
                <p className="text-sm text-brand-gray">Aucune étape pour le moment</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {stepsPaginated.map((s) => {
                    const done = Boolean(s.admin_confirmed) && Boolean(s.client_confirmed);
                    return (
                      <div key={s.id} className="rounded-2xl overflow-hidden bg-white shadow-sm flex flex-col">
                        <div className="flex items-center justify-between px-4 py-2.5 bg-[#F1EADD]">
                          <span className="text-xs font-semibold truncate text-[#C9A96E]">{s.title}</span>
                          {done ? (
                            <CheckCircle className="h-4 w-4 text-[#C9A96E] shrink-0" />
                          ) : (
                            <Circle className="h-4 w-4 text-[#C9A96E]/50 shrink-0" />
                          )}
                        </div>
                        <div className="p-4 flex flex-col gap-2 flex-1">
                          <div className="flex items-center gap-2 text-xs text-brand-gray">
                            <CalendarIcon className="h-3.5 w-3.5 text-[#C9A96E] shrink-0" />
                            <span className="truncate">{s.deadline ? `Échéance : ${s.deadline}` : 'Aucune échéance'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-brand-gray min-h-[18px]">
                            <span className="truncate text-brand-gray/70">
                              {s.description ? s.description : ''}
                            </span>
                          </div>
                          <div className="flex items-center justify-between pt-1 mt-auto">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${
                                done ? 'bg-[#F1EADD] text-[#C9A96E]' : 'bg-brand-purple/8 text-brand-gray'
                              }`}
                            >
                              {done ? 'Validée' : 'En cours'}
                            </span>
                            <button
                              onClick={() => void toggleClientConfirm(s)}
                              className={`text-[10.5px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-full transition-colors ${
                                s.client_confirmed
                                  ? 'text-brand-gray hover:bg-brand-purple/8'
                                  : 'bg-[#C9A96E] text-white hover:opacity-90'
                              }`}
                            >
                              {s.client_confirmed ? 'Annuler' : 'Valider'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <MiniPagination page={stepsPage} totalPages={stepsTotalPages} onChange={setStepsPage} />
              </>
            )}
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