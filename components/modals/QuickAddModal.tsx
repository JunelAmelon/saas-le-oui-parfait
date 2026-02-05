'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Calendar, Building2, FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface QuickAddModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickAddModal({ open, onOpenChange }: QuickAddModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleProspectSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      couple_names: formData.get('coupleNames') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      wedding_date: formData.get('weddingDate') as string,
      budget: parseFloat(formData.get('budget') as string) || 0,
      notes: formData.get('notes') as string,
      status: 'nouveau',
      planner_id: null,
    };

    try {
      const { error } = await supabase.from('prospects').insert([data]);

      if (error) throw error;

      toast({
        title: 'Prospect ajouté',
        description: 'Le prospect a été ajouté avec succès',
      });
      onOpenChange(false);
      e.currentTarget.reset();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEventSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      couple_names: formData.get('coupleNames') as string,
      event_date: formData.get('eventDate') as string,
      location: formData.get('location') as string,
      guest_count: parseInt(formData.get('guestCount') as string) || 0,
      budget: parseFloat(formData.get('budget') as string) || 0,
      status: 'planification',
      planner_id: null,
    };

    try {
      const { error } = await supabase.from('events').insert([data]);

      if (error) throw error;

      toast({
        title: 'Événement créé',
        description: 'L\'événement a été créé avec succès',
      });
      onOpenChange(false);
      e.currentTarget.reset();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProviderSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('providerName') as string,
      category: formData.get('category') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      website: formData.get('website') as string,
      notes: formData.get('notes') as string,
      planner_id: null,
    };

    try {
      const { error } = await supabase.from('providers').insert([data]);

      if (error) throw error;

      toast({
        title: 'Prestataire ajouté',
        description: 'Le prestataire a été ajouté avec succès',
      });
      onOpenChange(false);
      e.currentTarget.reset();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTaskSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get('taskTitle') as string,
      description: formData.get('description') as string,
      due_date: formData.get('dueDate') as string,
      priority: formData.get('priority') as string,
      status: 'todo',
      assigned_to: null,
    };

    try {
      const { error } = await supabase.from('tasks').insert([data]);

      if (error) throw error;

      toast({
        title: 'Tâche créée',
        description: 'La tâche a été créée avec succès',
      });
      onOpenChange(false);
      e.currentTarget.reset();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-brand-purple">
            Ajout rapide
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="prospect" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
            <TabsTrigger value="prospect" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Prospect</span>
            </TabsTrigger>
            <TabsTrigger value="event" className="gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Événement</span>
            </TabsTrigger>
            <TabsTrigger value="provider" className="gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Prestataire</span>
            </TabsTrigger>
            <TabsTrigger value="task" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Tâche</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="prospect" className="mt-4">
            <form onSubmit={handleProspectSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="coupleNames">Noms du couple *</Label>
                <Input
                  id="coupleNames"
                  name="coupleNames"
                  placeholder="Julie & Marc"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="julie@email.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="06 12 34 56 78"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weddingDate">Date souhaitée</Label>
                  <Input id="weddingDate" name="weddingDate" type="date" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budget">Budget estimé (€)</Label>
                  <Input
                    id="budget"
                    name="budget"
                    type="number"
                    placeholder="35000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Informations complémentaires..."
                  rows={3}
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-turquoise hover:bg-brand-turquoise-hover"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ajout en cours...
                  </>
                ) : (
                  'Ajouter le prospect'
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="event" className="mt-4">
            <form onSubmit={handleEventSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="coupleNames">Noms du couple *</Label>
                <Input
                  id="coupleNames"
                  name="coupleNames"
                  placeholder="Julie & Marc"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="eventDate">Date de l'événement *</Label>
                  <Input id="eventDate" name="eventDate" type="date" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="guestCount">Nombre d'invités</Label>
                  <Input
                    id="guestCount"
                    name="guestCount"
                    type="number"
                    placeholder="120"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Lieu</Label>
                <Input
                  id="location"
                  name="location"
                  placeholder="Château d'Apigné, Rennes"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget">Budget (€) *</Label>
                <Input
                  id="budget"
                  name="budget"
                  type="number"
                  placeholder="35000"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-turquoise hover:bg-brand-turquoise-hover"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Création en cours...
                  </>
                ) : (
                  'Créer l\'événement'
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="provider" className="mt-4">
            <form onSubmit={handleProviderSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="providerName">Nom du prestataire *</Label>
                <Input
                  id="providerName"
                  name="providerName"
                  placeholder="Château d'Apigné"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Catégorie *</Label>
                <select
                  id="category"
                  name="category"
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Sélectionner...</option>
                  <option value="lieu">Lieu de réception</option>
                  <option value="traiteur">Traiteur</option>
                  <option value="fleuriste">Fleuriste</option>
                  <option value="photographe">Photographe</option>
                  <option value="videaste">Vidéaste</option>
                  <option value="dj">DJ / Musiciens</option>
                  <option value="decoration">Décoration</option>
                  <option value="patisserie">Pâtisserie</option>
                  <option value="autre">Autre</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="contact@prestataire.fr"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="02 99 00 00 00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Site web</Label>
                <Input
                  id="website"
                  name="website"
                  type="url"
                  placeholder="https://www.prestataire.fr"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Informations complémentaires..."
                  rows={3}
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-turquoise hover:bg-brand-turquoise-hover"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ajout en cours...
                  </>
                ) : (
                  'Ajouter le prestataire'
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="task" className="mt-4">
            <form onSubmit={handleTaskSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="taskTitle">Titre de la tâche *</Label>
                <Input
                  id="taskTitle"
                  name="taskTitle"
                  placeholder="Confirmer le traiteur"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Détails de la tâche..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Date d'échéance</Label>
                  <Input id="dueDate" name="dueDate" type="date" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priorité</Label>
                  <select
                    id="priority"
                    name="priority"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="basse">Basse</option>
                    <option value="moyenne">Moyenne</option>
                    <option value="haute">Haute</option>
                  </select>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-turquoise hover:bg-brand-turquoise-hover"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Création en cours...
                  </>
                ) : (
                  'Créer la tâche'
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
