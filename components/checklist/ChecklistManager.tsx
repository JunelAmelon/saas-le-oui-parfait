'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, Circle, Plus, Trash2, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

interface ChecklistItem {
  id: string;
  title: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  deadline?: string;
  completed: boolean;
  completedAt?: string;
  eventId: string;
}

interface ChecklistManagerProps {
  eventId: string;
  isAdmin?: boolean;
  items: ChecklistItem[];
  onUpdate?: (items: ChecklistItem[]) => void;
}

const categories = [
  'Lieu & Réception',
  'Traiteur & Boissons',
  'Décoration',
  'Tenue des mariés',
  'Photographie & Vidéo',
  'Animation & Musique',
  'Fleurs',
  'Administratif',
  'Invitations',
  'Autre',
];

const defaultChecklist: Omit<ChecklistItem, 'id' | 'eventId' | 'completed' | 'completedAt'>[] = [
  { title: 'Réserver le lieu de réception', category: 'Lieu & Réception', priority: 'high', deadline: '' },
  { title: 'Choisir et réserver le traiteur', category: 'Traiteur & Boissons', priority: 'high', deadline: '' },
  { title: 'Réserver le photographe', category: 'Photographie & Vidéo', priority: 'high', deadline: '' },
  { title: 'Réserver le vidéaste', category: 'Photographie & Vidéo', priority: 'medium', deadline: '' },
  { title: 'Choisir la robe de mariée', category: 'Tenue des mariés', priority: 'high', deadline: '' },
  { title: 'Choisir le costume du marié', category: 'Tenue des mariés', priority: 'high', deadline: '' },
  { title: 'Réserver le DJ ou groupe musical', category: 'Animation & Musique', priority: 'high', deadline: '' },
  { title: 'Commander les faire-part', category: 'Invitations', priority: 'medium', deadline: '' },
  { title: 'Envoyer les faire-part', category: 'Invitations', priority: 'medium', deadline: '' },
  { title: 'Choisir le fleuriste', category: 'Fleurs', priority: 'medium', deadline: '' },
  { title: 'Définir le thème et la décoration', category: 'Décoration', priority: 'medium', deadline: '' },
  { title: 'Réserver les alliances', category: 'Tenue des mariés', priority: 'high', deadline: '' },
  { title: 'Organiser l\'enterrement de vie de jeune fille/garçon', category: 'Autre', priority: 'low', deadline: '' },
  { title: 'Établir le plan de table', category: 'Lieu & Réception', priority: 'medium', deadline: '' },
  { title: 'Prévoir le menu', category: 'Traiteur & Boissons', priority: 'high', deadline: '' },
  { title: 'Choisir les vins et champagne', category: 'Traiteur & Boissons', priority: 'medium', deadline: '' },
  { title: 'Réserver l\'hébergement pour les invités', category: 'Autre', priority: 'low', deadline: '' },
  { title: 'Organiser le transport des invités', category: 'Autre', priority: 'medium', deadline: '' },
  { title: 'Déposer le dossier de mariage à la mairie', category: 'Administratif', priority: 'high', deadline: '' },
  { title: 'Prévoir la liste de mariage', category: 'Autre', priority: 'low', deadline: '' },
];

export function ChecklistManager({ eventId, isAdmin = false, items: initialItems, onUpdate }: ChecklistManagerProps) {
  const [items, setItems] = useState<ChecklistItem[]>(initialItems);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [newItem, setNewItem] = useState({
    title: '',
    category: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    deadline: '',
  });
  const { toast } = useToast();

  const handleToggleItem = (id: string) => {
    const updated = items.map(item =>
      item.id === id
        ? {
            ...item,
            completed: !item.completed,
            completedAt: !item.completed ? new Date().toISOString() : undefined,
          }
        : item
    );
    setItems(updated);
    onUpdate?.(updated);

    const item = items.find(i => i.id === id);
    toast({
      title: item?.completed ? 'Tâche marquée comme non complétée' : 'Tâche complétée',
      description: item?.title,
    });
  };

  const handleAddItem = () => {
    if (!newItem.title || !newItem.category) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs obligatoires',
        variant: 'destructive',
      });
      return;
    }

    const item: ChecklistItem = {
      id: Date.now().toString(),
      ...newItem,
      eventId,
      completed: false,
    };

    const updated = [...items, item];
    setItems(updated);
    onUpdate?.(updated);
    setIsAddModalOpen(false);
    setNewItem({ title: '', category: '', priority: 'medium', deadline: '' });

    toast({
      title: 'Tâche ajoutée',
      description: 'La tâche a été ajoutée à la checklist',
    });
  };

  const handleDeleteItem = (id: string) => {
    const updated = items.filter(item => item.id !== id);
    setItems(updated);
    onUpdate?.(updated);

    toast({
      title: 'Tâche supprimée',
      description: 'La tâche a été supprimée de la checklist',
    });
  };

  const handleLoadDefaultChecklist = () => {
    const defaultItems: ChecklistItem[] = defaultChecklist.map((item, index) => ({
      ...item,
      id: `default-${index}`,
      eventId,
      completed: false,
    }));

    const updated = [...items, ...defaultItems];
    setItems(updated);
    onUpdate?.(updated);

    toast({
      title: 'Checklist chargée',
      description: `${defaultItems.length} tâches ont été ajoutées`,
    });
  };

  const filteredItems = items.filter(item => {
    if (filter === 'pending' && item.completed) return false;
    if (filter === 'completed' && !item.completed) return false;
    if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
    return true;
  });

  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const getPriorityBadge = (priority: ChecklistItem['priority']) => {
    switch (priority) {
      case 'high':
        return <Badge className="bg-red-100 text-red-700 text-xs">Urgent</Badge>;
      case 'medium':
        return <Badge className="bg-orange-100 text-orange-700 text-xs">Important</Badge>;
      case 'low':
        return <Badge className="bg-gray-100 text-gray-700 text-xs">Normal</Badge>;
    }
  };

  const groupedByCategory = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-brand-purple">Checklist de préparation</h3>
          <p className="text-sm text-brand-gray">
            {completedCount} / {totalCount} tâches complétées ({progress.toFixed(0)}%)
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && items.length === 0 && (
            <Button
              variant="outline"
              onClick={handleLoadDefaultChecklist}
            >
              Charger checklist type
            </Button>
          )}
          <Button
            className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une tâche
          </Button>
        </div>
      </div>

      <Card className="p-6 shadow-xl border-0">
        <Progress value={progress} className="h-3 mb-6" />

        <div className="flex flex-wrap gap-2 mb-6">
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
            Complétées ({completedCount})
          </Button>
        </div>

        <div className="mb-4">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrer par catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les catégories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-6">
          {Object.entries(groupedByCategory).map(([category, categoryItems]) => (
            <div key={category}>
              <h4 className="font-medium text-brand-purple mb-3 flex items-center gap-2">
                {category}
                <Badge variant="outline">{categoryItems.length}</Badge>
              </h4>
              <div className="space-y-2">
                {categoryItems.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                      item.completed ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200 hover:border-brand-turquoise'
                    }`}
                  >
                    <Checkbox
                      checked={item.completed}
                      onCheckedChange={() => handleToggleItem(item.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`font-medium ${item.completed ? 'line-through text-gray-500' : 'text-brand-purple'}`}>
                          {item.title}
                        </p>
                        <div className="flex items-center gap-2">
                          {getPriorityBadge(item.priority)}
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleDeleteItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </div>
                      {item.deadline && (
                        <div className="flex items-center gap-1 text-xs text-brand-gray mt-1">
                          <Calendar className="h-3 w-3" />
                          <span>Échéance: {item.deadline}</span>
                        </div>
                      )}
                      {item.completed && item.completedAt && (
                        <p className="text-xs text-green-600 mt-1">
                          ✓ Complétée le {new Date(item.completedAt).toLocaleDateString('fr-FR')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <CheckCircle className="h-12 w-12 text-brand-gray mx-auto mb-4" />
            <p className="text-brand-gray">Aucune tâche à afficher</p>
          </div>
        )}
      </Card>

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une tâche</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Titre de la tâche *</Label>
              <Input
                id="title"
                value={newItem.title}
                onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                placeholder="Ex: Réserver le photographe"
              />
            </div>
            <div>
              <Label htmlFor="category">Catégorie *</Label>
              <Select value={newItem.category} onValueChange={(value) => setNewItem({ ...newItem, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">Priorité</Label>
                <Select value={newItem.priority} onValueChange={(value: any) => setNewItem({ ...newItem, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Normal</SelectItem>
                    <SelectItem value="medium">Important</SelectItem>
                    <SelectItem value="high">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="deadline">Échéance</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={newItem.deadline}
                  onChange={(e) => setNewItem({ ...newItem, deadline: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Annuler
            </Button>
            <Button
              className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
              onClick={handleAddItem}
            >
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
