'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useClientData } from '@/contexts/ClientDataContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClientDashboardLayout } from '@/components/layout/ClientDashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import {
  Calendar,
  Users,
  Euro,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { calculateDaysRemaining } from '@/lib/client-helpers';
import { ClientDocuments } from './tabs/ClientDocuments';
import { ClientPayments } from './tabs/ClientPayments';
import { ClientDevis } from './tabs/ClientDevis';
import { getDocuments, updateDocument } from '@/lib/db';

type Milestone = {
  id: string;
  kind?: 'milestone';
  event_id: string;
  title: string;
  description?: string;
  deadline?: string;
  admin_confirmed?: boolean;
  client_confirmed?: boolean;
};

export default function ClientPortalPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { client, event, loading: dataLoading } = useClientData();

  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [milestonesLoading, setMilestonesLoading] = useState(false);

  const displayDate = (event as any)?.event_date || (client as any)?.event_date || '';
  const displayLocation = (event as any)?.location || (client as any)?.event_location || '';
  const displayGuests = (event as any)?.guest_count ?? (client as any)?.guests ?? 0;
  const displayBudget = (event as any)?.budget ?? (client as any)?.budget ?? 0;
  const coupleNames =
    (event as any)?.couple_names ||
    `${(client as any)?.name || ''}${(client as any)?.name && (client as any)?.partner ? ' & ' : ''}${(client as any)?.partner || ''}`
      .trim() ||
    'Client';
  const daysRemaining = displayDate ? calculateDaysRemaining(displayDate) : 0;

  const themeStyle = (event as any)?.theme?.style || '';
  const themeColors: string[] = (event as any)?.theme?.colors || [];

  const sortedMilestones = useMemo(() => {
    return milestones.slice().sort((a, b) => String(a.deadline || '').localeCompare(String(b.deadline || '')));
  }, [milestones]);

  const milestonesDone = useMemo(() => {
    return sortedMilestones.filter((m) => Boolean(m.admin_confirmed) && Boolean(m.client_confirmed)).length;
  }, [sortedMilestones]);

  const milestonesTotal = sortedMilestones.length;
  const progressPct = milestonesTotal > 0 ? Math.round((milestonesDone / milestonesTotal) * 100) : 0;

  const nextMilestones = useMemo(() => {
    return sortedMilestones
      .filter((m) => !(Boolean(m.admin_confirmed) && Boolean(m.client_confirmed)))
      .slice(0, 3);
  }, [sortedMilestones]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'client') {
        router.push('/');
      }
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchMilestones = async () => {
      if (!event?.id) {
        setMilestones([]);
        return;
      }
      setMilestonesLoading(true);
      try {
        const items = await getDocuments('tasks', [{ field: 'event_id', operator: '==', value: event.id }]);
        const only = (items as any[]).filter((t) => t?.kind === 'milestone') as Milestone[];
        setMilestones(only);
      } catch (e) {
        console.error('Error fetching milestones (home):', e);
        setMilestones([]);
      } finally {
        setMilestonesLoading(false);
      }
    };

    fetchMilestones();
  }, [event?.id]);

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

  const confirmMilestone = async (m: Milestone) => {
    if (!m?.id) return;
    const next = !m.client_confirmed;
    setMilestones((prev) => prev.map((x) => (x.id === m.id ? { ...x, client_confirmed: next } : x)));
    try {
      await updateDocument('tasks', m.id, { client_confirmed: next });
    } catch (e) {
      console.error('Error updating milestone confirmation (home):', e);
      setMilestones((prev) => prev.map((x) => (x.id === m.id ? { ...x, client_confirmed: !next } : x)));
    }
  };

  return (
    <ClientDashboardLayout clientName={coupleNames} daysRemaining={daysRemaining}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-purple mb-1 sm:mb-2">
            Tableau de bord
          </h1>
          <p className="text-sm sm:text-base text-brand-gray">
            Votre mariage en un coup d'œil
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
              onClick={() => router.push('/espace-client/mariage')}
            >
              Voir mon mariage
            </Button>
            <Button variant="outline" onClick={() => router.push('/espace-client/planning')}>
              Planning
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Compte à rebours"
            value={`J-${daysRemaining}`}
            icon={Calendar}
            description={displayDate ? new Date(displayDate).toLocaleDateString('fr-FR') : 'Date à définir'}
          />
          <StatCard
            title="Invités"
            value={displayGuests || 0}
            icon={Users}
            description=""
          />
          <StatCard
            title="Budget"
            value={`${Number(displayBudget || 0).toLocaleString('fr-FR')} €`}
            icon={Euro}
            description=""
          />
          <StatCard
            title="Progression"
            value={`${progressPct}%`}
            icon={Sparkles}
            description={milestonesTotal > 0 ? `${milestonesDone} / ${milestonesTotal}` : ''}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="p-6 shadow-xl border-0 lg:col-span-2">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-xl font-bold text-brand-purple">Prochaines étapes</h3>
                <p className="text-sm text-brand-gray">
                  {milestonesTotal > 0 ? `${milestonesDone} / ${milestonesTotal} étapes validées` : "Les étapes clés apparaîtront ici"}
                </p>
              </div>
            </div>

            <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden mb-5">
              <div className="h-full bg-brand-turquoise" style={{ width: `${progressPct}%` }} />
            </div>

            {milestonesLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-brand-turquoise" />
              </div>
            ) : nextMilestones.length === 0 ? (
              <p className="text-sm text-brand-gray">Aucune étape en attente.</p>
            ) : (
              <div className="space-y-3">
                {nextMilestones.map((m) => (
                  <div key={m.id} className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-medium text-brand-purple truncate">{m.title}</p>
                        {m.deadline ? <p className="text-xs text-brand-gray">Échéance : {m.deadline}</p> : null}
                      </div>
                      <Button size="sm" variant="outline" onClick={() => void confirmMilestone(m)}>
                        {m.client_confirmed ? 'Annuler' : 'Je confirme'}
                      </Button>
                    </div>
                    <p className="text-xs text-brand-gray mt-2">
                      {m.admin_confirmed ? 'Admin: confirmé' : 'Admin: en attente'} • {m.client_confirmed ? 'Vous: confirmé' : 'Vous: en attente'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-6 shadow-xl border-0 bg-brand-turquoise-hover">
            <h3 className="text-xl font-bold text-white mb-4">Moodboard</h3>
            <p className="text-sm text-white/90">
              {themeStyle ? themeStyle : 'À définir'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {themeColors.length > 0 ? (
                themeColors.slice(0, 8).map((c, idx) => (
                  <div
                    key={`${c}-${idx}`}
                    className="h-8 w-8 rounded-full border border-white/70 shadow-sm"
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))
              ) : (
                <p className="text-sm text-white/90">Ajoutez vos couleurs depuis “Mon mariage”.</p>
              )}
            </div>
            <Button
              className="w-full mt-5 bg-white text-brand-turquoise-hover hover:bg-white/90"
              onClick={() => router.push('/espace-client/mariage')}
            >
              Modifier
            </Button>
          </Card>
        </div>

        {event?.id ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <ClientDocuments eventId={event.id} clientId={client?.id} />
              <ClientPayments eventId={event.id} clientId={client?.id} />
            </div>
            {client?.id ? (
              <ClientDevis clientId={client.id} clientEmail={client.email} variant="table" />
            ) : null}
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
