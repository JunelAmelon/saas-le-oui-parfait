'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClientDashboardLayout } from '@/components/layout/ClientDashboardLayout';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { useClientData } from '@/contexts/ClientDataContext';
import { calculateDaysRemaining } from '@/lib/client-helpers';
import {
  CheckCircle,
  Circle,
  Clock,
  Calendar,
  ChevronDown,
  ChevronUp,
  Plus,
  Filter,
} from 'lucide-react';
import { ChecklistManager } from '@/components/checklist/ChecklistManager';
import { Loader2 } from 'lucide-react';
import { getDocuments, updateDocument } from '@/lib/db';

interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  completed: boolean;
  category: string;
  priority: 'high' | 'medium' | 'low';
}

const initialChecklistItems = [
  { id: '1', title: 'Réserver le lieu de réception', deadline: '2024-01-15', completed: true, category: 'Lieu & Réception', priority: 'high' as const, eventId: 'event-1', completedAt: '2024-01-15T10:00:00Z' },
  { id: '2', title: 'Choisir et réserver le traiteur', deadline: '2024-01-22', completed: true, category: 'Traiteur & Boissons', priority: 'high' as const, eventId: 'event-1', completedAt: '2024-01-22T14:00:00Z' },
  { id: '3', title: 'Réserver le photographe', deadline: '2024-02-05', completed: true, category: 'Photographie & Vidéo', priority: 'high' as const, eventId: 'event-1', completedAt: '2024-02-05T16:00:00Z' },
  { id: '4', title: 'Choisir la robe de mariée', deadline: '2024-03-01', completed: false, category: 'Tenue des mariés', priority: 'high' as const, eventId: 'event-1' },
  { id: '5', title: 'Commander les faire-part', deadline: '2024-03-15', completed: false, category: 'Invitations', priority: 'medium' as const, eventId: 'event-1' },
  { id: '6', title: 'Réserver le DJ', deadline: '2024-02-12', completed: true, category: 'Animation & Musique', priority: 'medium' as const, eventId: 'event-1', completedAt: '2024-02-12T11:00:00Z' },
  { id: '7', title: 'Choisir le fleuriste', deadline: '2024-02-20', completed: false, category: 'Fleurs', priority: 'high' as const, eventId: 'event-1' },
  { id: '8', title: 'Commander le gâteau', deadline: '2024-04-01', completed: false, category: 'Traiteur & Boissons', priority: 'medium' as const, eventId: 'event-1' },
  { id: '9', title: 'Essayage costume marié', deadline: '2024-04-15', completed: false, category: 'Tenue des mariés', priority: 'medium' as const, eventId: 'event-1' },
  { id: '10', title: 'Établir la liste des invités', deadline: '2024-02-01', completed: true, category: 'Invitations', priority: 'high' as const, eventId: 'event-1', completedAt: '2024-02-01T09:00:00Z' },
  { id: '11', title: 'Envoyer les faire-part', deadline: '2024-05-01', completed: false, category: 'Invitations', priority: 'high' as const, eventId: 'event-1' },
  { id: '12', title: 'Confirmer le menu avec le traiteur', deadline: '2024-05-15', completed: false, category: 'Traiteur & Boissons', priority: 'high' as const, eventId: 'event-1' },
  { id: '13', title: 'Finaliser le plan de table', deadline: '2024-07-01', completed: false, category: 'Lieu & Réception', priority: 'medium' as const, eventId: 'event-1' },
  { id: '14', title: 'Préparer les alliances', deadline: '2024-07-15', completed: false, category: 'Tenue des mariés', priority: 'high' as const, eventId: 'event-1' },
  { id: '15', title: 'Répétition de la cérémonie', deadline: '2024-08-20', completed: false, category: 'Autre', priority: 'high' as const, eventId: 'event-1' },
  { id: '16', title: 'Confirmer tous les prestataires', deadline: '2024-08-18', completed: false, category: 'Autre', priority: 'high' as const, eventId: 'event-1' },
  { id: '17', title: 'Préparer les valises lune de miel', deadline: '2024-08-21', completed: false, category: 'Autre', priority: 'low' as const, eventId: 'event-1' },
];

interface ChecklistItem {
  id: string;
  title: string;
  deadline?: string;
  completed: boolean;
  category: string;
  priority: 'high' | 'medium' | 'low';
  eventId: string;
  completedAt?: string;
}

type Step = {
  id: string;
  kind?: 'milestone';
  event_id: string;
  title: string;
  description?: string;
  deadline?: string;
  admin_confirmed?: boolean;
  client_confirmed?: boolean;
};

export default function ChecklistPage() {
  const { client, event, loading: dataLoading } = useClientData();
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStepsAsChecklist() {
      const eventId = String(event?.id || '').trim();
      const clId = String(client?.id || '').trim();
      if (!eventId && !clId) {
        setChecklistItems([]);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const items = await getDocuments('tasks', [
          eventId
            ? { field: 'event_id', operator: '==', value: eventId }
            : { field: 'client_id', operator: '==', value: clId },
        ]);
        const steps = (items as any[]).filter((t) => t?.kind === 'milestone') as Step[];

        const mapped: ChecklistItem[] = steps.map((s) => ({
          id: s.id,
          title: s.title,
          deadline: s.deadline,
          completed: Boolean(s.client_confirmed),
          category: 'Étapes',
          priority: 'high',
          eventId: eventId,
          completedAt: undefined,
        }));

        setChecklistItems(mapped);
      } catch (error) {
        console.error('Error fetching steps for checklist:', error);
        setChecklistItems([]);
      } finally {
        setLoading(false);
      }
    }

    if (!dataLoading) {
      fetchStepsAsChecklist();
    }
  }, [event?.id, client?.id, dataLoading]);

  const displayDate = String(event?.event_date || (client as any)?.event_date || '').trim();
  const daysRemaining = displayDate ? calculateDaysRemaining(displayDate) : 0;
  const clientName =
    String((event as any)?.couple_names || '').trim() ||
    `${String((client as any)?.name || '').trim()}${(client as any)?.name && (client as any)?.partner ? ' & ' : ''}${String((client as any)?.partner || '').trim()}`
      .trim() ||
    'Client';

  if (dataLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-12 w-12 text-brand-turquoise" />
      </div>
    );
  }

  return (
    <ClientDashboardLayout clientName={clientName} daysRemaining={daysRemaining}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-purple flex items-center gap-2 sm:gap-3">
            <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-brand-turquoise" />
            Check-list
          </h1>
          <p className="text-sm sm:text-base text-brand-gray mt-1">
            Suivez l&apos;avancement de vos préparatifs
          </p>
        </div>

        <ChecklistManager
          eventId={event?.id || ''}
          isAdmin={false}
          canCreate={false}
          items={checklistItems}
          onUpdate={(items) => setChecklistItems(items as unknown as ChecklistItem[])}
          onToggleItem={async (item, nextCompleted) => {
            if (!item?.id) return;
            try {
              await updateDocument('tasks', item.id, { client_confirmed: nextCompleted });
            } catch (e) {
              console.error('Error updating client_confirmed:', e);
            }
          }}
        />
      </div>
    </ClientDashboardLayout>
  );
}
