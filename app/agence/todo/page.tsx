'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Calendar, AlertCircle, CheckCircle2, Clock, Loader2, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { TodoModal } from '@/components/modals/TodoModal';
import { useAuth } from '@/contexts/AuthContext';
import { getDocuments, addDocument, updateDocument, deleteDocument } from '@/lib/db';
import { toast } from 'sonner';

interface Todo {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string;
  event?: string;
}

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
  const { user, loading: authLoading } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'todo' | 'in_progress' | 'done'>('all');
  const [isTodoModalOpen, setIsTodoModalOpen] = useState(false);
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

  // Fetch todos from Firestore
  const fetchTodos = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const tasksData = await getDocuments('tasks', [
        { field: 'assigned_to', operator: '==', value: user.uid }
      ]);
      const mappedTodos = tasksData.map((t: any) => ({
        id: t.id,
        title: t.title,
        description: t.description || '',
        status: t.status || 'todo',
        priority: t.priority || 'medium',
        dueDate: t.due_date || '',
        event: t.event_name || ''
      }));
      setTodos(mappedTodos);
    } catch (error) {
      console.error('Erreur fetch todos:', error);
      toast.error('Erreur lors du chargement des tâches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user?.role === 'planner') {
      fetchTodos();
    }
  }, [user, authLoading]);

  // Open modal for edit
  const handleEdit = (todo: Todo) => {
    setSelectedTodo(todo);
    setModalMode('edit');
    setIsTodoModalOpen(true);
  };

  // Open modal for create
  const handleCreate = () => {
    setSelectedTodo(null);
    setModalMode('create');
    setIsTodoModalOpen(true);
  };

  const filteredTodos = filter === 'all' ? todos : todos.filter(t => t.status === filter);

  // Toggle status
  const toggleStatus = async (id: string) => {
    const todo = todos.find(t => t.id === id);
    if (!todo || !user) return;

    const statusFlow: Record<string, 'todo' | 'in_progress' | 'done'> = {
      'todo': 'in_progress',
      'in_progress': 'done',
      'done': 'todo'
    };
    const newStatus = statusFlow[todo.status];

    try {
      setTodos(todos.map(t => t.id === id ? { ...t, status: newStatus } : t));
      await updateDocument('tasks', id, { status: newStatus });
      toast.success(`Tâche: ${statusLabels[newStatus]}`);
    } catch (error) {
      console.error(error);
      setTodos(todos.map(t => t.id === id ? { ...t, status: todo.status } : t));
      toast.error('Erreur lors de la mise à jour');
    }
  };

  // Delete a task
  const handleDelete = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer cette tâche ?')) return;
    try {
      await deleteDocument('tasks', id);
      setTodos(todos.filter(t => t.id !== id));
      toast.success('Tâche supprimée');
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de la suppression');
    }
  };

  // Save todo from modal (create or edit)
  const handleSaveSuccess = async (todoData: Partial<Todo>) => {
    if (!user) return;

    try {
      if (modalMode === 'create') {
        // Mappe les champs correctement
        const newTask = {
          title: todoData.title,
          description: todoData.description,
          status: todoData.status,
          priority: todoData.priority,
          due_date: todoData.dueDate,       // <== nom Firestore
          event_name: todoData.event,       // <== nom Firestore
          assigned_to: user.uid,
          created_at: new Date().toISOString(),
        };
        await addDocument('tasks', newTask);
        toast.success('Tâche créée');
      } else if (modalMode === 'edit' && selectedTodo) {
        const updatedTask = {
          title: todoData.title,
          description: todoData.description,
          status: todoData.status,
          priority: todoData.priority,
          due_date: todoData.dueDate,       // <== correction
          event_name: todoData.event,       // <== correction
        };
        await updateDocument('tasks', selectedTodo.id, updatedTask);
        toast.success('Tâche modifiée');
      }
      setIsTodoModalOpen(false);
      fetchTodos(); // Rafraîchir la liste
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de la sauvegarde de la tâche');
    }
  };


  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-brand-turquoise mx-auto" />
            <p className="mt-4 text-brand-gray">Chargement des tâches...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
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

        {/* Filtres */}
        <Card className="p-4 shadow-xl border-0">
          <div className="flex flex-wrap gap-2">
            {['all', 'todo', 'in_progress', 'done'].map((f) => (
              <Button
                key={f}
                variant={filter === f ? 'default' : 'outline'}
                className={filter === f
                  ? 'bg-brand-turquoise hover:bg-brand-turquoise-hover'
                  : 'border-2 border-brand-turquoise text-brand-gray hover:bg-brand-turquoise hover:text-white'}
                onClick={() => setFilter(f as any)}
              >
                {f === 'all' ? `Toutes (${todos.length})` :
                  f === 'todo' ? `À faire (${todos.filter(t => t.status === 'todo').length})` :
                    f === 'in_progress' ? `En cours (${todos.filter(t => t.status === 'in_progress').length})` :
                      `Terminées (${todos.filter(t => t.status === 'done').length})`}
              </Button>
            ))}
          </div>
        </Card>

        {/* Liste des tâches */}
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
                        <p className="text-xs sm:text-sm text-brand-gray">{todo.description}</p>
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
                        <span className="truncate">Échéance: {new Date(todo.dueDate).toLocaleDateString('fr-FR')}</span>
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
                        onClick={() => handleDelete(todo.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
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

      {/* Modal pour créer / modifier */}
      <TodoModal
        open={isTodoModalOpen}
        onOpenChange={setIsTodoModalOpen}
        todo={selectedTodo}
        mode={modalMode}
        onSave={handleSaveSuccess}
      />
    </DashboardLayout>
  );
}
