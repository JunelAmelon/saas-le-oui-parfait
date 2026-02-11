'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2 } from 'lucide-react';
import { toast as sonnerToast } from 'sonner';

interface Todo {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string;
  event?: string;
}

interface TodoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  todo?: Todo | null;
  mode: 'create' | 'edit';
  onSave: (todo: Partial<Todo>) => Promise<void>;
}

export function TodoModal({ open, onOpenChange, todo, mode, onSave }: TodoModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'todo' | 'in_progress' | 'done'>('todo');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [dueDate, setDueDate] = useState('');
  const [event, setEvent] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && todo) {
      setTitle(todo.title);
      setDescription(todo.description || '');
      setStatus(todo.status);
      setPriority(todo.priority);
      setDueDate(todo.dueDate || '');
      setEvent(todo.event || '');
    } else if (mode === 'create') {
      setTitle('');
      setDescription('');
      setStatus('todo');
      setPriority('medium');
      setDueDate('');
      setEvent('');
    }
  }, [mode, todo, open]);

  const handleSubmit = async () => {
    if (!title || !description || !dueDate) {
      sonnerToast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        title,
        description,
        status,
        priority,
        dueDate,
        event,
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving task:', error);
      sonnerToast.error('Erreur lors de la sauvegarde de la tâche');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-brand-purple flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-brand-turquoise" />
            {mode === 'create' ? 'Nouvelle tâche' : 'Modifier la tâche'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Créez une nouvelle tâche à accomplir' : 'Modifiez les informations de la tâche'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>Titre de la tâche *</Label>
            <Input placeholder="Ex: Appeler le traiteur" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
          </div>

          <div>
            <Label>Description *</Label>
            <Textarea placeholder="Détails de la tâche..." value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Statut</Label>
              <Select value={status} onValueChange={(value: any) => setStatus(value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">À faire</SelectItem>
                  <SelectItem value="in_progress">En cours</SelectItem>
                  <SelectItem value="done">Terminé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Priorité</Label>
              <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Faible</SelectItem>
                  <SelectItem value="medium">Moyenne</SelectItem>
                  <SelectItem value="high">Haute</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Date d'échéance *</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1" />
          </div>

          <div>
            <Label>Événement</Label>
            <Input placeholder="Nom de l'événement" value={event} onChange={(e) => setEvent(e.target.value)} className="mt-1" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button className="bg-brand-turquoise hover:bg-brand-turquoise-hover" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Enregistrement...' : mode === 'create' ? 'Créer la tâche' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
