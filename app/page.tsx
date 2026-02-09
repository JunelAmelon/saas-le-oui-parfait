'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { BudgetCard } from '@/components/dashboard/BudgetCard';
import { QuoteList } from '@/components/dashboard/QuoteList';
import { TaskList } from '@/components/dashboard/TaskList';
import { TimeTracker } from '@/components/dashboard/TimeTracker';
import { Euro, Calendar, Users, TrendingUp, Loader2, Heart, Eye, MoreVertical, Edit, MessageSquare } from 'lucide-react';
import { getDocuments } from '@/lib/db';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DashboardStats {
  prospectsCount: number;
  eventsCount: number;
  activeEvents: any[];
  upcomingTasks: any[];
  revenue: number;
  conversionRate: number;
}

interface Client {
  id: string;
  names: string;
  photo: string | null;
  eventDate: string;
  eventLocation: string;
  budget: number;
  guests: number;
  phone: string;
  email: string;
  status: string;
  createdAt?: any;
}

interface Devis {
  id: string;
  reference: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  montant_ttc: number;
  client: string;
  created_at: any;
}

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<DashboardStats>({
    prospectsCount: 0,
    eventsCount: 0,
    activeEvents: [],
    upcomingTasks: [],
    revenue: 0,
    conversionRate: 0
  });
  const [dataLoading, setDataLoading] = useState(true);
  const [lastClient, setLastClient] = useState<Client | null>(null);
  const [recentDevis, setRecentDevis] = useState<Devis[]>([]);

  // Sécurité & redirection
  useEffect(() => {
    if (!loading) {
      if (!user) router.push('/login');
      else if (user.role !== 'planner') router.push('/espace-client');
    }
  }, [user, loading, router]);

  // Fetch Firebase data (stats)
  useEffect(() => {
    async function fetchData() {
      if (!user || user.role !== 'planner') return;

      try {
        const [prospects, events, tasks, clients, devis] = await Promise.all([
          getDocuments('prospects', [{ field: 'planner_id', operator: '==', value: user.uid }]),
          getDocuments('events', [{ field: 'planner_id', operator: '==', value: user.uid }]),
          getDocuments('tasks', [
            { field: 'assigned_to', operator: '==', value: user.uid },
            { field: 'status', operator: '==', value: 'todo' }
          ]),
          getDocuments('clients', [{ field: 'planner_id', operator: '==', value: user.uid }]),
          getDocuments('devis', [{ field: 'planner_id', operator: '==', value: user.uid }])
        ]);

        const signedEvents = events.filter((e: any) =>
          ['confirmed', 'in_progress', 'completed'].includes(e.status)
        );

        const revenue = signedEvents.reduce(
          (acc: number, e: any) => acc + (parseInt(e.budget) || 0),
          0
        );

        const conversionRate = prospects.length
          ? Math.round(
            (prospects.filter((p: any) => p.status === 'converted').length / prospects.length) * 100
          )
          : 0;

        const activeEvents = events
          .filter((e: any) => ['confirmed', 'in_progress'].includes(e.status))
          .slice(0, 5)
          .map((e: any) => {
            const client = clients.find((c: any) => c.id === e.client_id);
            return {
              ...e,
              clientNames: client ? `${client.name} & ${client.partner}` : e.couple_names || 'Client Inconnu'
            };
          });

        // Trier les devis par date de création et prendre les 5 derniers
        const sortedDevis = devis
          .sort((a: any, b: any) => {
            const dateA = a.created_at?.toDate?.() || new Date(a.created_at);
            const dateB = b.created_at?.toDate?.() || new Date(b.created_at);
            return dateB.getTime() - dateA.getTime();
          })
          .slice(0, 5)
          .map((d: any) => ({
            id: d.id,
            reference: d.reference,
            status: d.status,
            montant_ttc: d.montant_ttc,
            client: d.client,
            created_at: d.created_at
          }));

        setRecentDevis(sortedDevis);

        setStats({
          prospectsCount: prospects.length,
          eventsCount: signedEvents.length,
          activeEvents,
          upcomingTasks: tasks.slice(0, 5),
          revenue,
          conversionRate
        });

        // Dernier client
        if (clients.length > 0) {
          clients.sort((a: any, b: any) => {
            const dateA = a.created_at?.toDate ? a.created_at.toDate() : new Date(a.created_at || a.createdAt);
            const dateB = b.created_at?.toDate ? b.created_at.toDate() : new Date(b.created_at || b.createdAt);
            return dateB.getTime() - dateA.getTime();
          });

          const last = clients[0];
          setLastClient({
            id: last.id,
            names: `${last.name} & ${last.partner}`,
            photo: last.photo || null,
            eventDate: last.event_date ? new Date(last.event_date).toLocaleDateString('fr-FR') : '',
            eventLocation: last.event_location || '',
            budget: parseInt(last.budget) || 0,
            guests: parseInt(last.guests) || 0,
            phone: last.phone || '',
            email: last.email || '',
            status: last.status || 'En cours',
            createdAt: last.created_at || last.createdAt || new Date()
          });
        }

      } catch (e) {
        console.error(e);
      } finally {
        setDataLoading(false);
      }
    }

    if (!loading) fetchData();
  }, [user, loading]);

  // Handlers pour les actions client
  const handleViewDetail = (client: Client) => {
    router.push(`/clients/${client.id}`);
  };

  const handleEdit = (client: Client) => {
    router.push(`/clients/${client.id}/edit`);
  };

  //  Loader global
  if (loading || dataLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-brand-turquoise mx-auto" />
          <p className="mt-4 text-brand-gray">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-purple mb-1 sm:mb-2">
            Tableau de bord
          </h1>
          <p className="text-sm sm:text-base text-brand-gray">
            Bienvenue sur votre plateforme Le Oui Parfait
          </p>
        </div>

        {/* Stats - 4 cartes */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Chiffre d'affaires"
            value={`${stats.revenue.toLocaleString('fr-FR')} €`}
            icon={Euro}
            trend={{ value: 12.5, isPositive: true }}
          />
          <StatCard
            title="Événements actifs"
            value={stats.eventsCount.toString()}
            icon={Calendar}
            description="En cours de préparation"
          />
          <StatCard
            title="Prospects"
            value={stats.prospectsCount.toString()}
            icon={Users}
            trend={{ value: 8.3, isPositive: true }}
          />
          <StatCard
            title="Taux de conversion"
            value={`${stats.conversionRate}%`}
            icon={TrendingUp}
            trend={{ value: 5.2, isPositive: true }}
          />
        </div>

        {/* Ligne : Dernier client + TimeTracker (2 colonnes, même niveau) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-10">
          {/* Colonne 1 : Dernier client (60%) */}
          <div className="lg:col-span-7">
            {lastClient ? (
              <Card className="p-4 md:p-6 shadow-xl border-0 hover:shadow-2xl transition-shadow cursor-pointer group h-full">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div
                    className="relative h-24 w-full sm:w-24 overflow-hidden rounded-lg bg-gray-100 flex-shrink-0"
                    onClick={() => handleViewDetail(lastClient)}
                  >
                    {lastClient.photo ? (
                      <img
                        src={lastClient.photo}
                        alt={lastClient.names}
                        className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-brand-beige to-brand-turquoise/20 flex items-center justify-center">
                        <Heart className="h-12 w-12 text-white" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <Eye className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>

                  <div className="flex-1 w-full">
                    <div className="mb-1 flex items-start justify-between">
                      <h3
                        className="text-lg font-bold text-brand-purple font-baskerville cursor-pointer hover:text-brand-turquoise transition-colors"
                        onClick={() => handleViewDetail(lastClient)}
                      >
                        {lastClient.names}
                      </h3>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                            <MoreVertical className="h-4 w-4 text-brand-gray" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetail(lastClient)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Voir détails
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(lastClient)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push('/messages')}>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Message
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <p className="text-sm text-brand-gray mb-2">
                      {lastClient.eventDate} | {lastClient.eventLocation}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-[#C4A26A] hover:bg-[#B59260] text-white border-0">
                        {lastClient.status}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-brand-turquoise hover:text-brand-turquoise-hover text-xs sm:text-sm"
                        onClick={() => handleViewDetail(lastClient)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Voir détails
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-6 flex flex-col items-center justify-center border-dashed border-2 border-gray-300 h-full">
                <p className="text-gray-500 mb-4">Aucun client disponible</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-brand-turquoise"
                  onClick={() => router.push('/clients/new')}
                >
                  + Ajouter un client
                </Button>
              </Card>
            )}
          </div>

          <div className="lg:col-span-3">
            <TimeTracker />
          </div>
        </div>

        {/* Dernière ligne : BudgetCard + QuoteList + TaskList (3 colonnes) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <BudgetCard
            total={stats.activeEvents.reduce((acc: number, curr: any) => acc + (parseInt(curr.budget) || 0), 0)}
            spent={stats.activeEvents.reduce((acc: number, curr: any) => acc + (curr.spent || 0), 0)}
          />

          <QuoteList
            quotes={recentDevis}
            onDevisCreated={() => {
              // Recharger les devis après création
              if (user) {
                getDocuments('devis', [{ field: 'planner_id', operator: '==', value: user.uid }])
                  .then((devis) => {
                    const sortedDevis = devis
                      .sort((a: any, b: any) => {
                        const dateA = a.created_at?.toDate?.() || new Date(a.created_at);
                        const dateB = b.created_at?.toDate?.() || new Date(b.created_at);
                        return dateB.getTime() - dateA.getTime();
                      })
                      .slice(0, 5)
                      .map((d: any) => ({
                        id: d.id,
                        reference: d.reference,
                        status: d.status,
                        montant_ttc: d.montant_ttc,
                        client: d.client,
                        created_at: d.created_at
                      }));
                    setRecentDevis(sortedDevis);
                  });
              }
            }}
          />

          <TaskList
            tasks={stats.upcomingTasks.map((t: any) => ({
              id: t.id,
              title: t.title,
              completed: t.status === 'done'
            }))}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}