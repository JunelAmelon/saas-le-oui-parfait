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

interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  completed: boolean;
  category: string;
  priority: 'high' | 'medium' | 'low';
}

const initialTasks: Task[] = [
  { id: '1', title: 'Réserver le lieu de réception', dueDate: '15/01/2024', completed: true, category: '12-6 mois avant', priority: 'high' },
  { id: '2', title: 'Choisir et réserver le traiteur', dueDate: '22/01/2024', completed: true, category: '12-6 mois avant', priority: 'high' },
  { id: '3', title: 'Réserver le photographe', dueDate: '05/02/2024', completed: true, category: '12-6 mois avant', priority: 'high' },
  { id: '4', title: 'Choisir la robe de mariée', dueDate: '01/03/2024', completed: false, category: '12-6 mois avant', priority: 'high' },
  { id: '5', title: 'Commander les faire-part', dueDate: '15/03/2024', completed: false, category: '6-3 mois avant', priority: 'medium' },
  { id: '6', title: 'Réserver le DJ', dueDate: '12/02/2024', completed: true, category: '12-6 mois avant', priority: 'medium' },
  { id: '7', title: 'Choisir le fleuriste', dueDate: '20/02/2024', completed: false, category: '6-3 mois avant', priority: 'high' },
  { id: '8', title: 'Commander le gâteau', dueDate: '01/04/2024', completed: false, category: '6-3 mois avant', priority: 'medium' },
  { id: '9', title: 'Essayage costume marié', dueDate: '15/04/2024', completed: false, category: '6-3 mois avant', priority: 'medium' },
  { id: '10', title: 'Établir la liste des invités', dueDate: '01/02/2024', completed: true, category: '12-6 mois avant', priority: 'high' },
  { id: '11', title: 'Envoyer les faire-part', dueDate: '01/05/2024', completed: false, category: '3-1 mois avant', priority: 'high' },
  { id: '12', title: 'Confirmer le menu avec le traiteur', dueDate: '15/05/2024', completed: false, category: '3-1 mois avant', priority: 'high' },
  { id: '13', title: 'Finaliser le plan de table', dueDate: '01/07/2024', completed: false, category: '3-1 mois avant', priority: 'medium' },
  { id: '14', title: 'Préparer les alliances', dueDate: '15/07/2024', completed: false, category: '3-1 mois avant', priority: 'high' },
  { id: '15', title: 'Répétition de la cérémonie', dueDate: '20/08/2024', completed: false, category: 'Dernière semaine', priority: 'high' },
  { id: '16', title: 'Confirmer tous les prestataires', dueDate: '18/08/2024', completed: false, category: 'Dernière semaine', priority: 'high' },
  { id: '17', title: 'Préparer les valises lune de miel', dueDate: '21/08/2024', completed: false, category: 'Dernière semaine', priority: 'low' },
];

const categories = ['12-6 mois avant', '6-3 mois avant', '3-1 mois avant', 'Dernière semaine'];

export default function ChecklistPage() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(categories);
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all');

  const toggleTask = (taskId: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'completed') return task.completed;
    if (filter === 'pending') return !task.completed;
    return true;
  });

  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const progress = (completedCount / totalCount) * 100;

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge className="bg-red-100 text-red-700 text-xs">Urgent</Badge>;
      case 'medium':
        return <Badge className="bg-orange-100 text-orange-700 text-xs">Important</Badge>;
      case 'low':
        return <Badge className="bg-gray-100 text-gray-700 text-xs">Normal</Badge>;
      default:
        return null;
    }
  };

  return (
    <ClientDashboardLayout clientName="Julie & Frédérick" daysRemaining={165}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-brand-purple flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-brand-turquoise" />
              Check-list
            </h1>
            <p className="text-brand-gray mt-1">
              Suivez l'avancement de vos préparatifs
            </p>
          </div>
        </div>

        <Card className="p-6 shadow-xl border-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-brand-purple">Progression globale</h2>
              <p className="text-sm text-brand-gray">
                {completedCount} sur {totalCount} tâches complétées
              </p>
            </div>
            <span className="text-2xl font-bold text-brand-turquoise">
              {progress.toFixed(0)}%
            </span>
          </div>
          <Progress value={progress} className="h-3" />
        </Card>

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
              className={filter === 'all' ? 'bg-brand-turquoise' : ''}
            >
              Toutes ({totalCount})
            </Button>
            <Button
              variant={filter === 'pending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('pending')}
              className={filter === 'pending' ? 'bg-brand-turquoise' : ''}
            >
              À faire ({totalCount - completedCount})
            </Button>
            <Button
              variant={filter === 'completed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('completed')}
              className={filter === 'completed' ? 'bg-brand-turquoise' : ''}
            >
              Terminées ({completedCount})
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {categories.map((category) => {
            const categoryTasks = filteredTasks.filter(t => t.category === category);
            const categoryCompleted = categoryTasks.filter(t => t.completed).length;
            const isExpanded = expandedCategories.includes(category);

            if (categoryTasks.length === 0) return null;

            return (
              <Card key={category} className="shadow-xl border-0 overflow-hidden">
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full p-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-brand-turquoise" />
                    <span className="font-bold text-brand-purple">{category}</span>
                    <Badge className="bg-brand-turquoise/10 text-brand-turquoise">
                      {categoryCompleted}/{categoryTasks.length}
                    </Badge>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-brand-gray" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-brand-gray" />
                  )}
                </button>

                {isExpanded && (
                  <div className="p-4 space-y-3">
                    {categoryTasks.map((task) => (
                      <div
                        key={task.id}
                        className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                          task.completed ? 'bg-green-50' : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <Checkbox
                          checked={task.completed}
                          onCheckedChange={() => toggleTask(task.id)}
                          className="h-5 w-5"
                        />
                        <div className="flex-1">
                          <p className={`font-medium ${
                            task.completed 
                              ? 'text-brand-gray line-through' 
                              : 'text-brand-purple'
                          }`}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="h-3 w-3 text-brand-gray" />
                            <span className="text-xs text-brand-gray">{task.dueDate}</span>
                          </div>
                        </div>
                        {!task.completed && getPriorityBadge(task.priority)}
                        {task.completed && (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </ClientDashboardLayout>
  );
}
