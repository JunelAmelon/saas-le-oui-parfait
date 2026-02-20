'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  AlertCircle,
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
          // Les événements de mariage (EventData) utilisent souvent event_date/couple_names.
          // Les items planning créés depuis /planning utilisent date/time/location.
          // On exclut volontairement l'événement de mariage (et assimilés) pour ne garder que les RDV.
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

  if (dataLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-12 w-12 text-brand-turquoise" />
      </div>
    );
  }

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setIsEventDetailOpen(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-brand-turquoise" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-700">Terminé</Badge>;
      case 'in_progress':
        return <Badge className="bg-brand-turquoise/20 text-brand-turquoise">En cours</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-600">À venir</Badge>;
    }
  };

  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  return (
    <ClientDashboardLayout clientName={coupleNames} daysRemaining={daysRemaining}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-purple flex items-center gap-2 sm:gap-3">
            <CalendarIcon className="h-6 w-6 sm:h-8 sm:w-8 text-brand-turquoise" />
            Planning
          </h1>
          <p className="text-sm sm:text-base text-brand-gray mt-1">
            Vos rendez-vous et étapes clés
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 shadow-xl border-0">
              <h2 className="text-xl font-bold text-brand-purple mb-6">
                Prochains rendez-vous
              </h2>
              <div className="space-y-4">
                {rdvEvents.length === 0 ? (
                  <div className="text-center py-10 text-brand-gray">
                    Aucun rendez-vous de prévu
                  </div>
                ) : (
                  rdvEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => handleEventClick(event as Event)}
                  >
                    <div className="flex-shrink-0 w-16 text-center">
                      <p className="text-2xl font-bold text-brand-purple">
                        {new Date(event.date).getDate()}
                      </p>
                      <p className="text-xs text-brand-gray uppercase">
                        {months[new Date(event.date).getMonth()].slice(0, 3)}
                      </p>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-brand-purple">{event.title}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-brand-gray">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {event.time} ({event.duration})
                        </span>
                      </div>
                      <p className="text-sm text-brand-gray mt-1">{event.location}</p>
                    </div>
                    <Badge className="bg-brand-turquoise/20 text-brand-turquoise">
                      Confirmé
                    </Badge>
                  </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-6 shadow-xl border-0">
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="icon" onClick={() => {
                  if (currentMonth.getMonth() === 0) {
                    setCurrentMonth(new Date(currentMonth.getFullYear() - 1, 11));
                  } else {
                    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
                  }
                }}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h3 className="font-medium text-brand-purple">
                  {months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h3>
                <Button variant="ghost" size="icon" onClick={() => {
                  if (currentMonth.getMonth() === 11) {
                    setCurrentMonth(new Date(currentMonth.getFullYear() + 1, 0));
                  } else {
                    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
                  }
                }}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => (
                  <div key={i} className="p-2 font-medium text-brand-gray">
                    {day}
                  </div>
                ))}
                {Array.from({ length: 35 }, (_, i) => {
                  const day = i - new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay() + 2;
                  const isCurrentMonth = day > 0 && day <= new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
                  const hasEvent = rdvEvents.some(e => {
                    const eventDate = new Date(e.date);
                    return eventDate.getDate() === day && 
                           eventDate.getMonth() === currentMonth.getMonth() && 
                           eventDate.getFullYear() === currentMonth.getFullYear();
                  });
                  return (
                    <div
                      key={i}
                      className={`p-2 rounded-full text-sm ${
                        isCurrentMonth
                          ? hasEvent
                            ? 'bg-brand-turquoise text-white font-medium'
                            : 'text-brand-purple hover:bg-gray-100 cursor-pointer'
                          : 'text-gray-300'
                      }`}
                    >
                      {isCurrentMonth ? day : ''}
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="p-6 shadow-xl border-0">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-brand-purple">Étapes clés</h3>
                  <p className="text-sm text-brand-gray">
                    Suivez l&apos;avancement de vos étapes
                  </p>
                </div>

                {stepsLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-brand-turquoise" />
                  </div>
                ) : steps.length === 0 ? (
                  <div className="text-center py-10 text-brand-gray">
                    Aucune étape pour le moment
                  </div>
                ) : (
                  <div className="space-y-3">
                    {steps
                      .slice()
                      .sort((a, b) => (a.deadline || '').localeCompare(b.deadline || ''))
                      .map((s) => {
                        const done = Boolean(s.admin_confirmed) && Boolean(s.client_confirmed);
                        return (
                          <div
                            key={s.id}
                            className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <p className="font-medium text-brand-purple truncate">{s.title}</p>
                                {s.deadline ? (
                                  <p className="text-sm text-brand-gray">Échéance : {s.deadline}</p>
                                ) : null}
                                {s.description ? (
                                  <p className="text-sm text-brand-gray mt-1">{s.description}</p>
                                ) : null}
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={done ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                                  {done ? 'Validée' : 'En cours'}
                                </Badge>
                              </div>
                            </div>

                            <div className="mt-3 flex items-center justify-end">
                              <Button
                                size="sm"
                                variant={s.client_confirmed ? 'outline' : 'default'}
                                className={s.client_confirmed ? '' : 'bg-brand-turquoise hover:bg-brand-turquoise-hover'}
                                onClick={() => void toggleClientConfirm(s)}
                              >
                                {s.client_confirmed ? 'Annuler ma confirmation' : 'Valider cette étape'}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        <Dialog open={isEventDetailOpen} onOpenChange={setIsEventDetailOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-brand-purple">{selectedEvent?.title}</DialogTitle>
            </DialogHeader>
            {selectedEvent && (
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-3 p-3 bg-brand-turquoise/10 rounded-lg">
                  <CalendarIcon className="h-5 w-5 text-brand-turquoise" />
                  <div>
                    <p className="font-medium text-brand-purple">
                      {new Date(selectedEvent.date).toLocaleDateString('fr-FR', { 
                        weekday: 'long', 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      })}
                    </p>
                    <p className="text-sm text-brand-gray">
                      {selectedEvent.time} - Durée: {selectedEvent.duration}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-brand-turquoise" />
                  <p className="text-brand-purple">{selectedEvent.location}</p>
                </div>
                <Badge className="bg-brand-turquoise/20 text-brand-turquoise">
                  Confirmé
                </Badge>
              </div>
            )}
            <DialogFooter>
              <Button 
                className="bg-brand-turquoise hover:bg-brand-turquoise-hover w-full"
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
