'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, CheckCircle, Circle, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MilestoneManager } from '@/components/planning/MilestoneManager';
import { AppointmentRequest } from '@/components/planning/AppointmentRequest';

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
  { id: '3', title: 'Réservation photographe', date: '2024-02-05', status: 'in_progress', eventId: 'event-1', createdBy: 'admin' },
  { id: '4', title: 'Confirmation DJ', date: '2024-02-12', status: 'pending', eventId: 'event-1', createdBy: 'admin' },
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

export default function ClientPlanningPage() {
  const params = useParams();
  const router = useRouter();
  const [milestones, setMilestones] = useState<Milestone[]>(initialMilestones);
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
          >
            ← Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-brand-purple">
              Planning - Client #{params.id}
            </h1>
            <p className="text-brand-gray">
              Gérez le planning et les rendez-vous du client
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 shadow-xl border-0">
            <MilestoneManager
              eventId="event-1"
              isAdmin={true}
              milestones={milestones}
              onUpdate={(items) => setMilestones(items)}
            />
          </Card>

          <Card className="p-6 shadow-xl border-0">
            <AppointmentRequest
              clientId={params.id as string}
              isAdmin={true}
              appointments={appointments}
              onUpdate={(items) => setAppointments(items)}
            />
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
