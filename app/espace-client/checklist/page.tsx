'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClientDashboardLayout } from '@/components/layout/ClientDashboardLayout';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
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
import { useState } from 'react';
import { ChecklistManager } from '@/components/checklist/ChecklistManager';

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

export default function ChecklistPage() {
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(initialChecklistItems);

  return (
    <ClientDashboardLayout clientName="Julie & Frédérick" daysRemaining={165}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-purple flex items-center gap-2 sm:gap-3">
            <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-brand-turquoise" />
            Check-list
          </h1>
          <p className="text-sm sm:text-base text-brand-gray mt-1">
            Suivez l'avancement de vos préparatifs
          </p>
        </div>

        <ChecklistManager
          eventId="event-1"
          isAdmin={false}
          items={checklistItems}
          onUpdate={(items) => setChecklistItems(items)}
        />
      </div>
    </ClientDashboardLayout>
  );
}
