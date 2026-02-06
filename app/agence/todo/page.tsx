'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Calendar, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { useState } from 'react';
import { TodoModal } from '@/components/modals/TodoModal';

interface Todo {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string;
  event?: string;
}

const todosDemo: Todo[] = [
  {
    id: '1',
    title: 'Appeler Château d\'Apigné',
    description: 'Confirmer les horaires d\'accès pour le jour J',
    status: 'todo',
    priority: 'urgent',
    dueDate: '2024-02-10',
    event: 'Julie & Frédérick',
  },
  {
    id: '2',
    title: 'Planifier RDV avec les mariés',
    description: 'Réunion de préparation pour la timeline du jour J',
    status: 'in_progress',
    priority: 'high',
    dueDate: '2024-02-12',
    event: 'Julie & Frédérick',
  },
  {
    id: '3',
    title: 'Préparer invitations',
    description: 'Commander et personnaliser les faire-part',
    status: 'todo',
    priority: 'medium',
    dueDate: '2024-02-15',
    event: 'Sophie & Alexandre',
  },
  {
    id: '4',
    title: 'Confirmer fleuriste',
    description: 'Valider le devis et la composition finale',
    status: 'done',
    priority: 'high',
    dueDate: '2024-02-08',
    event: 'Emma & Thomas',
  },
  {
    id: '5',
    title: 'Envoyer proposition menus',
    description: 'Transmettre les 3 options de menu au traiteur',
    status: 'todo',
    priority: 'medium',
    dueDate: '2024-02-14',
    event: 'Sophie & Alexandre',
  },
];

const priorityColors = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const priorityLabels = {
  low: 'Faible',
  medium: 'Moyenne',
  high: 'Haute',
  urgent: 'Urgent',
};

const statusIcons = {
  todo: Clock,
  in_progress: AlertCircle,
  done: CheckCircle2,
};

const statusLabels = {
  todo: 'À faire',
  in_progress: 'En cours',
  done: 'Terminé',
};

const statusColors = {
  todo: 'text-gray-500',
  in_progress: 'text-brand-turquoise',
  done: 'text-green-600',
};

export default function TodoPage() {
  const [todos, setTodos] = useState(todosDemo);
  const [filter, setFilter] = useState<'all' | 'todo' | 'in_progress' | 'done'>('all');
  const [isTodoModalOpen, setIsTodoModalOpen] = useState(false);
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

  const handleEdit = (todo: Todo) => {
    setSelectedTodo(todo);
    setModalMode('edit');
    setIsTodoModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedTodo(null);
    setModalMode('create');
    setIsTodoModalOpen(true);
  };

  const filteredTodos = filter === 'all' ? todos : todos.filter(t => t.status === filter);

  const toggleStatus = (id: string) => {
    setTodos(todos.map(todo => {
      if (todo.id === id) {
        const statusFlow = { todo: 'in_progress' as const, in_progress: 'done' as const, done: 'todo' as const };
        return { ...todo, status: statusFlow[todo.status] };
      }
      return todo;
    }));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-purple mb-2">
              Gestion des tâches
            </h1>
            <p className="text-sm sm:text-base text-brand-gray">
              Organisez et suivez toutes vos tâches
            </p>
          </div>
          <Button 
            className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2 w-full sm:w-auto"
            onClick={handleCreate}
          >
            <Plus className="h-4 w-4" />
            Nouvelle tâche
          </Button>
        </div>

        <Card className="p-4 shadow-xl border-0">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
              className={filter === 'all' ? 'bg-brand-turquoise hover:bg-brand-turquoise-hover' : 'border-2 border-brand-turquoise text-brand-gray hover:bg-brand-turquoise hover:text-white'}
            >
              Toutes ({todos.length})
            </Button>
            <Button
              variant={filter === 'todo' ? 'default' : 'outline'}
              onClick={() => setFilter('todo')}
              className={filter === 'todo' ? 'bg-brand-turquoise hover:bg-brand-turquoise-hover' : 'border-2 border-brand-turquoise text-brand-gray hover:bg-brand-turquoise hover:text-white'}
            >
              À faire ({todos.filter(t => t.status === 'todo').length})
            </Button>
            <Button
              variant={filter === 'in_progress' ? 'default' : 'outline'}
              onClick={() => setFilter('in_progress')}
              className={filter === 'in_progress' ? 'bg-brand-turquoise hover:bg-brand-turquoise-hover' : 'border-2 border-brand-turquoise text-brand-gray hover:bg-brand-turquoise hover:text-white'}
            >
              En cours ({todos.filter(t => t.status === 'in_progress').length})
            </Button>
            <Button
              variant={filter === 'done' ? 'default' : 'outline'}
              onClick={() => setFilter('done')}
              className={filter === 'done' ? 'bg-brand-turquoise hover:bg-brand-turquoise-hover' : 'border-2 border-brand-turquoise text-brand-gray hover:bg-brand-turquoise hover:text-white'}
            >
              Terminées ({todos.filter(t => t.status === 'done').length})
            </Button>
          </div>
        </Card>

        <div className="space-y-4">
          {filteredTodos.map((todo) => {
            const StatusIcon = statusIcons[todo.status];
            return (
              <Card key={todo.id} className="p-4 sm:p-6 shadow-xl border-0 hover:shadow-2xl transition-shadow">
                <div className="flex items-start gap-3 sm:gap-4">
                  <Checkbox
                    checked={todo.status === 'done'}
                    onCheckedChange={() => toggleStatus(todo.id)}
                    className="mt-1 flex-shrink-0"
                  />

                  <div className="flex-1 space-y-3 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className={`text-base sm:text-lg font-bold mb-1 ${todo.status === 'done' ? 'line-through text-brand-gray' : 'text-brand-purple'}`}>
                          {todo.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-brand-gray">
                          {todo.description}
                        </p>
                      </div>

                      <Badge className={`${priorityColors[todo.priority]} flex-shrink-0 text-xs`}>
                        {priorityLabels[todo.priority]}
                      </Badge>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-xs sm:text-sm">
                      <div className={`flex items-center gap-2 ${statusColors[todo.status]}`}>
                        <StatusIcon className="h-4 w-4 flex-shrink-0" />
                        <span className="font-medium">{statusLabels[todo.status]}</span>
                      </div>

                      <div className="flex items-center gap-2 text-brand-gray">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">
                          Échéance: {new Date(todo.dueDate).toLocaleDateString('fr-FR')}
                        </span>
                      </div>

                      {todo.event && (
                        <Badge variant="outline" className="border-brand-turquoise text-brand-turquoise text-xs w-fit">
                          {todo.event}
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-2 border-brand-turquoise text-brand-gray hover:bg-brand-turquoise hover:text-white w-full sm:w-auto"
                        onClick={() => handleEdit(todo)}
                      >
                        Modifier
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-2 border-red-300 text-red-600 hover:bg-red-500 hover:text-white w-full sm:w-auto"
                      >
                        Supprimer
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <TodoModal
        isOpen={isTodoModalOpen}
        onClose={() => setIsTodoModalOpen(false)}
        todo={selectedTodo}
        mode={modalMode}
      />
    </DashboardLayout>
  );
}
