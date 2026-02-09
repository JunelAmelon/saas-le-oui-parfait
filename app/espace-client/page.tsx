'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useClientData } from '@/contexts/ClientDataContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClientDashboardLayout } from '@/components/layout/ClientDashboardLayout';
import {
  Heart,
  Calendar,
  MapPin,
  Users,
  Euro,
  Loader2,
} from 'lucide-react';
import { calculateDaysRemaining } from '@/lib/client-helpers';
import { ClientTimeline } from './tabs/ClientTimeline';
import { ClientDocuments } from './tabs/ClientDocuments';
import { ClientPayments } from './tabs/ClientPayments';

export default function ClientPortalPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { client, event, loading: dataLoading } = useClientData();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'client') {
        router.push('/');
      }
    }
  }, [user, authLoading, router]);

  if (authLoading || !user || user.role !== 'client' || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin rounded-full h-12 w-12 text-brand-turquoise mx-auto" />
          <p className="mt-4 text-brand-gray">Chargement de votre espace...</p>
        </div>
      </div>
    );
  }

  const displayDate = event?.event_date || client?.event_date || '';
  const displayLocation = event?.location || client?.event_location || '';
  const displayGuests = event?.guest_count ?? (client as any)?.guests ?? 0;
  const displayBudget = event?.budget ?? (client as any)?.budget ?? 0;
  const coupleNames = event?.couple_names || `${client?.name || ''}${client?.name && client?.partner ? ' & ' : ''}${client?.partner || ''}`.trim() || 'Client';
  const daysRemaining = displayDate ? calculateDaysRemaining(displayDate) : 0;

  return (
    <ClientDashboardLayout clientName={coupleNames} daysRemaining={daysRemaining}>
      <div>
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-brand-purple mb-2 flex items-center gap-3">
            <Heart className="h-8 w-8 text-red-500 fill-red-500" />
            Bienvenue {coupleNames}
          </h2>
          <p className="text-brand-gray">
            Suivez l'avancement des préparatifs de votre mariage
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-brand-turquoise/10 to-white">
            <Calendar className="h-8 w-8 text-brand-turquoise mb-3" />
            <p className="text-sm text-brand-gray mb-1">Date du mariage</p>
            <p className="text-xl font-bold text-brand-purple">
              {displayDate ? new Date(displayDate).toLocaleDateString('fr-FR') : 'À définir'}
            </p>
            <p className="text-xs text-brand-turquoise font-medium mt-1">
              J-{daysRemaining}
            </p>
          </Card>

          <Card className="p-6 shadow-xl border-0">
            <MapPin className="h-8 w-8 text-brand-turquoise mb-3" />
            <p className="text-sm text-brand-gray mb-1">Lieu</p>
            <p className="text-sm font-bold text-brand-purple">{displayLocation || 'À définir'}</p>
          </Card>

          <Card className="p-6 shadow-xl border-0">
            <Users className="h-8 w-8 text-brand-turquoise mb-3" />
            <p className="text-sm text-brand-gray mb-1">Invités</p>
            <p className="text-2xl font-bold text-brand-purple">{displayGuests || 0}</p>
          </Card>

          <Card className="p-6 shadow-xl border-0">
            <Euro className="h-8 w-8 text-brand-turquoise mb-3" />
            <p className="text-sm text-brand-gray mb-1">Budget</p>
            <p className="text-xl font-bold text-brand-purple">
              {Number(displayBudget || 0).toLocaleString('fr-FR')} €
            </p>
            <p className="text-xs text-brand-gray">estimé</p>
          </Card>
        </div>

        {event?.id ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 my-8">
              <ClientDocuments eventId={event.id} clientId={client?.id} />
              <ClientPayments eventId={event.id} clientId={client?.id} />
            </div>
            <ClientTimeline eventId={event.id} />
          </>
        ) : (
          <Card className="p-6 shadow-xl border-0">
            <p className="text-brand-gray">
              Certaines sections (documents, paiements, timeline) seront disponibles une fois que votre wedding planner aura associé votre événement.
            </p>
          </Card>
        )}
      </div>
    </ClientDashboardLayout>
  );
}
