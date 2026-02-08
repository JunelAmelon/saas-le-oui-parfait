'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClientDashboardLayout } from '@/components/layout/ClientDashboardLayout';
import {
  Heart,
  Calendar,
  MapPin,
  Users,
  CheckCircle,
  Clock,
  FileText,
  Download,
  MessageSquare,
  Euro,
  Loader2,
} from 'lucide-react';
import { getDocuments } from '@/lib/db';
import { ClientTimeline } from './tabs/ClientTimeline';
import { ClientDocuments } from './tabs/ClientDocuments';
import { ClientPayments } from './tabs/ClientPayments';

export default function ClientPortalPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [event, setEvent] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'client') {
        router.push('/');
      }
    }
  }, [user, loading, router]);

  useEffect(() => {
    async function fetchEvent() {
      if (user && user.role === 'client') {
        try {
          // Find event where client_email matches user.email
          const events = await getDocuments('events', [{ field: 'client_email', operator: '==', value: user.email }]);

          if (events.length > 0) {
            setEvent(events[0]);
          }
        } catch (error) {
          console.error("Error fetching client event", error);
        } finally {
          setDataLoading(false);
        }
      }
    }

    if (!loading && user?.role === 'client') {
      fetchEvent();
    }
  }, [user, loading]);

  if (loading || !user || user.role !== 'client' || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin rounded-full h-12 w-12 text-brand-turquoise mx-auto" />
          <p className="mt-4 text-brand-gray">Chargement de votre espace...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center">
          <Heart className="h-12 w-12 text-brand-turquoise mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-brand-purple mb-2">Bienvenue</h2>
          <p className="text-brand-gray mb-6">
            Aucun événement n'est associé à votre compte pour le moment.
            Veuillez contacter votre Wedding Planner.
          </p>
          <Button onClick={() => window.location.reload()}>Actualiser</Button>
        </Card>
      </div>
    )
  }

  // Calculate days remaining (mock logic for now if event_date is string)
  const eventDate = new Date(event.event_date);
  const today = new Date();
  const diffTime = eventDate.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return (
    <ClientDashboardLayout clientName={event.couple_names} daysRemaining={daysRemaining > 0 ? daysRemaining : 0}>
      <div>
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-brand-purple mb-2 flex items-center gap-3">
            <Heart className="h-8 w-8 text-red-500 fill-red-500" />
            Bienvenue {event.couple_names}
          </h2>
          <p className="text-brand-gray">
            Suivez l'avancement des préparatifs de votre mariage
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-brand-turquoise/10 to-white">
            <Calendar className="h-8 w-8 text-brand-turquoise mb-3" />
            <p className="text-sm text-brand-gray mb-1">Date du mariage</p>
            <p className="text-xl font-bold text-brand-purple">{new Date(event.event_date).toLocaleDateString()}</p>
            <p className="text-xs text-brand-turquoise font-medium mt-1">
              J-{daysRemaining > 0 ? daysRemaining : 0}
            </p>
          </Card>

          <Card className="p-6 shadow-xl border-0">
            <MapPin className="h-8 w-8 text-brand-turquoise mb-3" />
            <p className="text-sm text-brand-gray mb-1">Lieu</p>
            <p className="text-sm font-bold text-brand-purple">{event.location}</p>
          </Card>

          <Card className="p-6 shadow-xl border-0">
            <Users className="h-8 w-8 text-brand-turquoise mb-3" />
            <p className="text-sm text-brand-gray mb-1">Invités</p>
            <p className="text-2xl font-bold text-brand-purple">{event.guest_count}</p>
          </Card>

          <Card className="p-6 shadow-xl border-0">
            <Euro className="h-8 w-8 text-brand-turquoise mb-3" />
            <p className="text-sm text-brand-gray mb-1">Budget</p>
            <p className="text-xl font-bold text-brand-purple">
              {event.budget?.toLocaleString()} €
            </p>
            {/* Mock spent for now */}
            <p className="text-xs text-brand-gray">estimé</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 my-8">
          <ClientDocuments eventId={event.id} />
          <ClientPayments eventId={event.id} />
        </div>
        <ClientTimeline eventId={event.id} />
      </div>
    </ClientDashboardLayout>
  );
}
