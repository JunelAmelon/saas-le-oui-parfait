'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { EventCard } from '@/components/dashboard/EventCard';
import { BudgetCard } from '@/components/dashboard/BudgetCard';
import { QuoteList } from '@/components/dashboard/QuoteList';
import { TaskList } from '@/components/dashboard/TaskList';
import { TimeTracker } from '@/components/dashboard/TimeTracker';
import { Euro, Calendar, Users, TrendingUp } from 'lucide-react';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-turquoise mx-auto"></div>
          <p className="mt-4 text-brand-gray">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-purple mb-1 sm:mb-2">
            Tableau de bord
          </h1>
          <p className="text-sm sm:text-base text-brand-gray">
            Bienvenue sur votre plateforme Le Oui Parfait
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Chiffre d'affaires"
            value="127 450 €"
            icon={Euro}
            trend={{ value: 12.5, isPositive: true }}
          />
          <StatCard
            title="Événements actifs"
            value="12"
            icon={Calendar}
            description="En cours de préparation"
          />
          <StatCard
            title="Prospects"
            value="24"
            icon={Users}
            trend={{ value: 8.3, isPositive: true }}
          />
          <StatCard
            title="Taux de conversion"
            value="68%"
            icon={TrendingUp}
            trend={{ value: 5.2, isPositive: true }}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <EventCard
              clientNames="Julie & Frédérick"
              date="23/08/2024"
              reference="J-380"
              status="Mariage"
            />
          </div>
          <div className="lg:col-span-1">
            <TimeTracker />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <BudgetCard total={25000} spent={23500} />

          <QuoteList
            quotes={[
              { id: '1', reference: 'Devis n°1', status: 'sent' },
              { id: '2', reference: 'Devis n°2', status: 'accepted' },
              { id: '3', reference: 'Devis n°3', status: 'accepted' },
            ]}
          />

          <TaskList
            tasks={[
              { id: '1', title: 'Appeler Château d\'Apigné', completed: false },
              { id: '2', title: 'Planifier RDV avec les mariés', completed: false },
              { id: '3', title: 'Préparer invitations', completed: false },
            ]}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
