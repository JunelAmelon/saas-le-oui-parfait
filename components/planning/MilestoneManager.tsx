'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CheckCircle, Circle, Clock, Plus, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Milestone {
  id: string;
  title: string;
  date: string;
  status: 'pending' | 'in_progress' | 'completed';
  eventId: string;
  createdBy: 'admin' | 'client';
  completedAt?: string;
}

interface MilestoneManagerProps {
  eventId: string;
  isAdmin?: boolean;
  milestones: Milestone[];
  onUpdate?: (milestones: Milestone[]) => void;
}

export function MilestoneManager({ eventId, isAdmin = false, milestones: initialMilestones, onUpdate }: MilestoneManagerProps) {
  const [milestones, setMilestones] = useState<Milestone[]>(initialMilestones);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newMilestone, setNewMilestone] = useState({ title: '', date: '' });
  const { toast } = useToast();

  const handleAddMilestone = () => {
    if (!newMilestone.title || !newMilestone.date) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs',
        variant: 'destructive',
      });
      return;
    }

    const milestone: Milestone = {
      id: Date.now().toString(),
      title: newMilestone.title,
      date: newMilestone.date,
      status: 'pending',
      eventId,
      createdBy: isAdmin ? 'admin' : 'client',
    };

    const updated = [...milestones, milestone];
    setMilestones(updated);
    onUpdate?.(updated);
    setIsAddModalOpen(false);
    setNewMilestone({ title: '', date: '' });

    toast({
      title: 'Étape ajoutée',
      description: 'L\'étape clé a été ajoutée avec succès',
    });
  };

  const handleStatusChange = (id: string, newStatus: Milestone['status']) => {
    const updated = milestones.map(m => 
      m.id === id 
        ? { ...m, status: newStatus, completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined }
        : m
    );
    setMilestones(updated);
    onUpdate?.(updated);

    toast({
      title: 'Statut mis à jour',
      description: 'Le statut de l\'étape a été modifié',
    });
  };

  const handleDelete = (id: string) => {
    const updated = milestones.filter(m => m.id !== id);
    setMilestones(updated);
    onUpdate?.(updated);

    toast({
      title: 'Étape supprimée',
      description: 'L\'étape clé a été supprimée',
    });
  };

  const getStatusIcon = (status: Milestone['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-brand-turquoise" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: Milestone['status']) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-700">Terminé</Badge>;
      case 'in_progress':
        return <Badge className="bg-brand-turquoise/20 text-brand-turquoise">En cours</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-600">À venir</Badge>;
    }
  };

  const completedCount = milestones.filter(m => m.status === 'completed').length;
  const progressPercentage = milestones.length > 0 ? (completedCount / milestones.length) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-brand-purple">Étapes clés</h3>
          <p className="text-sm text-brand-gray">
            {completedCount} / {milestones.length} complétées ({progressPercentage.toFixed(0)}%)
          </p>
        </div>
        {isAdmin && (
          <Button
            size="sm"
            className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter
          </Button>
        )}
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-brand-turquoise h-2 rounded-full transition-all"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      <div className="space-y-3">
        {milestones.map((milestone) => (
          <Card key={milestone.id} className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3">
              <div className="mt-1">{getStatusIcon(milestone.status)}</div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-medium text-brand-purple">{milestone.title}</h4>
                    <p className="text-sm text-brand-gray">{milestone.date}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(milestone.status)}
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDelete(milestone.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
                {isAdmin && milestone.status !== 'completed' && (
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(milestone.id, 'in_progress')}
                      disabled={milestone.status === 'in_progress'}
                    >
                      En cours
                    </Button>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleStatusChange(milestone.id, 'completed')}
                    >
                      Marquer comme terminé
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une étape clé</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Titre de l'étape *</Label>
              <Input
                id="title"
                value={newMilestone.title}
                onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                placeholder="Ex: Réservation du lieu"
              />
            </div>
            <div>
              <Label htmlFor="date">Date prévue *</Label>
              <Input
                id="date"
                type="date"
                value={newMilestone.date}
                onChange={(e) => setNewMilestone({ ...newMilestone, date: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Annuler
            </Button>
            <Button
              className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
              onClick={handleAddMilestone}
            >
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
