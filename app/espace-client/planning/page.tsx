'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClientDashboardLayout } from '@/components/layout/ClientDashboardLayout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle,
  Circle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Plus,
  MapPin,
} from 'lucide-react';
import { useState } from 'react';
import { MilestoneManager } from '@/components/planning/MilestoneManager';
import { AppointmentRequest } from '@/components/planning/AppointmentRequest';

const events = [
  {
    id: '1',
    title: 'RDV Fleuriste - Choix des compositions',
    date: '2024-02-20',
    time: '14:00',
    duration: '2h',
    location: 'Atelier Floral, Rennes',
    status: 'upcoming',
    type: 'rdv',
  },
  {
    id: '2',
    title: 'Essayage robe de mariée',
    date: '2024-03-01',
    time: '10:00',
    duration: '1h30',
    location: 'Boutique Marie & Nous',
    status: 'upcoming',
    type: 'rdv',
  },
  {
    id: '3',
    title: 'Dégustation menu traiteur',
    date: '2024-03-15',
    time: '19:00',
    duration: '2h',
    location: 'Restaurant Le Gourmet',
    status: 'upcoming',
    type: 'rdv',
  },
  {
    id: '4',
    title: 'Visite finale du lieu',
    date: '2024-04-10',
    time: '15:00',
    duration: '2h',
    location: 'Château d\'Apigné',
    status: 'upcoming',
    type: 'rdv',
  },
  {
    id: '5',
    title: 'Dernier essayage costume',
    date: '2024-07-15',
    time: '11:00',
    duration: '1h',
    location: 'Tailleur Prestige',
    status: 'upcoming',
    type: 'rdv',
  },
];

interface Milestone {
  id: string;
  title: string;
  date: string;
  status: 'pending' | 'in_progress' | 'completed';
  eventId: string;
  createdBy: 'admin' | 'client';
  completedAt?: string;
}

const initialMilestones: Milestone[] = [
  { id: '1', title: 'Réservation lieu', date: '2024-01-15', status: 'completed', eventId: 'event-1', createdBy: 'admin', completedAt: '2024-01-15T10:00:00Z' },
  { id: '2', title: 'Choix traiteur', date: '2024-01-22', status: 'completed', eventId: 'event-1', createdBy: 'admin', completedAt: '2024-01-22T14:00:00Z' },
  { id: '3', title: 'Réservation photographe', date: '2024-02-05', status: 'completed', eventId: 'event-1', createdBy: 'admin', completedAt: '2024-02-05T16:00:00Z' },
  { id: '4', title: 'Confirmation DJ', date: '2024-02-12', status: 'in_progress', eventId: 'event-1', createdBy: 'admin' },
  { id: '5', title: 'Choix fleurs', date: '2024-02-25', status: 'pending', eventId: 'event-1', createdBy: 'admin' },
  { id: '6', title: 'Validation menu', date: '2024-03-20', status: 'pending', eventId: 'event-1', createdBy: 'admin' },
  { id: '7', title: 'Plan de table', date: '2024-07-01', status: 'pending', eventId: 'event-1', createdBy: 'admin' },
  { id: '8', title: 'Répétition cérémonie', date: '2024-08-20', status: 'pending', eventId: 'event-1', createdBy: 'admin' },
];

interface Appointment {
  id: string;
  type: string;
  dateRequested: string;
  timeRequested: string;
  notes: string;
  status: 'pending' | 'accepted' | 'refused' | 'completed';
  clientId: string;
  createdAt: string;
  adminResponse?: string;
  confirmedDate?: string;
  confirmedTime?: string;
}

const initialAppointments: Appointment[] = [
  {
    id: '1',
    type: 'Rendez-vous fleuriste',
    dateRequested: '2024-02-20',
    timeRequested: '14:00',
    notes: 'Pour choisir les compositions florales',
    status: 'accepted',
    clientId: 'client-1',
    createdAt: '2024-02-10T10:00:00Z',
    confirmedDate: '2024-02-20',
    confirmedTime: '14:00',
    adminResponse: 'Rendez-vous confirmé avec Atelier Floral',
  },
  {
    id: '2',
    type: 'Dégustation traiteur',
    dateRequested: '2024-03-15',
    timeRequested: '19:00',
    notes: 'Dégustation du menu final',
    status: 'pending',
    clientId: 'client-1',
    createdAt: '2024-02-15T09:00:00Z',
  },
];

const months = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

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
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [isRdvModalOpen, setIsRdvModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isEventDetailOpen, setIsEventDetailOpen] = useState(false);
  const [rdvType, setRdvType] = useState('');
  const [rdvDate, setRdvDate] = useState('');
  const [rdvNotes, setRdvNotes] = useState('');
  const [milestones, setMilestones] = useState<Milestone[]>(initialMilestones);
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);

  const handleRequestRdv = () => {
    setIsRdvModalOpen(false);
    setIsSuccessModalOpen(true);
    setRdvType('');
    setRdvDate('');
    setRdvNotes('');
  };

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

  return (
    <ClientDashboardLayout clientName="Julie & Frédérick" daysRemaining={165}>
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
                {events.map((event) => (
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
                ))}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-6 shadow-xl border-0">
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="icon" onClick={() => {
                  if (currentMonth === 0) {
                    setCurrentMonth(11);
                    setCurrentYear(currentYear - 1);
                  } else {
                    setCurrentMonth(currentMonth - 1);
                  }
                }}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h3 className="font-medium text-brand-purple">
                  {months[currentMonth]} {currentYear}
                </h3>
                <Button variant="ghost" size="icon" onClick={() => {
                  if (currentMonth === 11) {
                    setCurrentMonth(0);
                    setCurrentYear(currentYear + 1);
                  } else {
                    setCurrentMonth(currentMonth + 1);
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
                  const day = i - new Date(currentYear, currentMonth, 1).getDay() + 2;
                  const isCurrentMonth = day > 0 && day <= new Date(currentYear, currentMonth + 1, 0).getDate();
                  const hasEvent = events.some(e => {
                    const eventDate = new Date(e.date);
                    return eventDate.getDate() === day && 
                           eventDate.getMonth() === currentMonth && 
                           eventDate.getFullYear() === currentYear;
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
              <MilestoneManager
                eventId="event-1"
                isAdmin={false}
                milestones={milestones}
                onUpdate={(items) => setMilestones(items)}
              />
            </Card>

            <Card className="p-6 shadow-xl border-0">
              <AppointmentRequest
                clientId="client-1"
                isAdmin={false}
                appointments={appointments}
                onUpdate={(items) => setAppointments(items)}
              />
            </Card>
          </div>
        </div>

        <Dialog open={isRdvModalOpen} onOpenChange={setIsRdvModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-brand-purple">Demander un rendez-vous</DialogTitle>
              <DialogDescription>
                Envoyez une demande de rendez-vous à votre wedding planner
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Type de rendez-vous</Label>
                <Select value={rdvType} onValueChange={setRdvType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner le type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fleuriste">Fleuriste</SelectItem>
                    <SelectItem value="traiteur">Traiteur</SelectItem>
                    <SelectItem value="photographe">Photographe</SelectItem>
                    <SelectItem value="lieu">Visite du lieu</SelectItem>
                    <SelectItem value="essayage">Essayage</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date souhaitée</Label>
                <Input 
                  type="date" 
                  value={rdvDate}
                  onChange={(e) => setRdvDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Notes / Précisions</Label>
                <Textarea 
                  placeholder="Ajoutez des précisions si nécessaire..."
                  value={rdvNotes}
                  onChange={(e) => setRdvNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRdvModalOpen(false)}>
                Annuler
              </Button>
              <Button 
                className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
                onClick={handleRequestRdv}
                disabled={!rdvType || !rdvDate}
              >
                Envoyer la demande
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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

        <Dialog open={isSuccessModalOpen} onOpenChange={setIsSuccessModalOpen}>
          <DialogContent className="sm:max-w-md text-center">
            <div className="flex flex-col items-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <DialogTitle className="text-brand-purple text-xl">Demande envoyée !</DialogTitle>
              <DialogDescription className="mt-2">
                Votre demande de rendez-vous a été envoyée. Votre wedding planner vous recontactera rapidement.
              </DialogDescription>
            </div>
            <DialogFooter className="justify-center">
              <Button 
                className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
                onClick={() => setIsSuccessModalOpen(false)}
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
