'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Building2, FileText, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { addDocument } from '@/lib/db';
import { toast as sonnerToast } from 'sonner';
import { ClientModal } from './ClientModal';

interface QuickAddModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickAddModal({ open, onOpenChange }: QuickAddModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('client');
  const [loading, setLoading] = useState(false);
  
  // État pour ClientModal
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  
  // État pour formulaire Prestataire (inline comme sur la page prestataires)
  const [prestataireForm, setPrestataireForm] = useState({
    name: '',
    category: '',
    contactName: '',
    city: '',
    email: '',
    phone: '',
    website: '',
    rating: 5,
    desc: '',
    notes: '',
  });
  
  // État pour formulaire Tâche (inline)
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    status: 'todo' as 'todo' | 'in_progress' | 'done',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    dueDate: '',
  });

  const resetPrestataireForm = () => {
    setPrestataireForm({
      name: '',
      category: '',
      contactName: '',
      city: '',
      email: '',
      phone: '',
      website: '',
      rating: 5,
      desc: '',
      notes: '',
    });
  };

  const resetTaskForm = () => {
    setTaskForm({
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
      dueDate: '',
    });
  };

  const handleCreatePrestataire = async () => {
    if (!user) {
      sonnerToast.error('Vous devez être connecté');
      return;
    }
    
    if (!prestataireForm.name || !prestataireForm.category || !prestataireForm.email) {
      sonnerToast.error('Veuillez remplir les champs obligatoires (Nom, Catégorie, Email)');
      return;
    }

    setLoading(true);
    try {
      await addDocument('vendors', {
        name: prestataireForm.name,
        category: prestataireForm.category,
        contact_name: prestataireForm.contactName,
        city: prestataireForm.city,
        email: prestataireForm.email,
        phone: prestataireForm.phone,
        website: prestataireForm.website,
        rating: prestataireForm.rating,
        desc: prestataireForm.desc,
        notes: prestataireForm.notes,
        status: 'active',
        planner_id: user.uid,
        created_at: new Date(),
      });
      
      sonnerToast.success('Prestataire créé avec succès !');
      resetPrestataireForm();
      onOpenChange(false);
    } catch (error) {
      console.error('Erreur création prestataire:', error);
      sonnerToast.error('Erreur lors de la création du prestataire');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async () => {
    if (!user) {
      sonnerToast.error('Vous devez être connecté');
      return;
    }
    
    if (!taskForm.title || !taskForm.dueDate) {
      sonnerToast.error('Veuillez remplir le titre et la date d\'échéance');
      return;
    }

    setLoading(true);
    try {
      await addDocument('tasks', {
        title: taskForm.title,
        description: taskForm.description,
        status: taskForm.status,
        priority: taskForm.priority,
        due_date: taskForm.dueDate,
        planner_id: user.uid,
        assigned_to: user.uid,
        created_at: new Date(),
      });
      
      sonnerToast.success('Tâche créée avec succès !');
      resetTaskForm();
      onOpenChange(false);
    } catch (error) {
      console.error('Erreur création tâche:', error);
      sonnerToast.error('Erreur lors de la création de la tâche');
    } finally {
      setLoading(false);
    }
  };

  const handleClientSuccess = () => {
    setIsClientModalOpen(false);
    onOpenChange(false);
    sonnerToast.success('Client créé avec succès !');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-brand-purple">
              Ajout rapide
            </DialogTitle>
            <DialogDescription>
              Créez rapidement un nouveau client, prestataire ou une tâche
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="client" className="gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Client</span>
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

            {/* ONGLET CLIENT */}
            <TabsContent value="client" className="mt-4">
              <div className="space-y-4 text-center py-8">
                <Users className="h-16 w-16 mx-auto text-brand-turquoise" />
                <h3 className="text-xl font-semibold text-brand-purple">Créer un nouveau client</h3>
                <p className="text-gray-600">Ajoutez rapidement un nouveau client à votre base</p>
                <Button
                  onClick={() => setIsClientModalOpen(true)}
                  className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Ouvrir le formulaire client
                </Button>
              </div>
            </TabsContent>

            {/* ONGLET PRESTATAIRE - Formulaire inline */}
            <TabsContent value="provider" className="mt-4">
              <div className="space-y-4 py-4">
                <div>
                  <Label>Nom du prestataire *</Label>
                  <Input 
                    placeholder="Nom de l'entreprise" 
                    className="mt-1"
                    value={prestataireForm.name}
                    onChange={(e) => setPrestataireForm({...prestataireForm, name: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Catégorie *</Label>
                  <Select value={prestataireForm.category} onValueChange={(v) => setPrestataireForm({...prestataireForm, category: v})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Sélectionner une catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="venue">Lieu</SelectItem>
                      <SelectItem value="catering">Traiteur</SelectItem>
                      <SelectItem value="photography">Photographe</SelectItem>
                      <SelectItem value="video">Vidéo</SelectItem>
                      <SelectItem value="music">Musique</SelectItem>
                      <SelectItem value="flowers">Fleuriste</SelectItem>
                      <SelectItem value="decoration">Décoration</SelectItem>
                      <SelectItem value="transport">Transport</SelectItem>
                      <SelectItem value="other">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Nom du contact</Label>
                    <Input 
                      placeholder="Prénom Nom" 
                      className="mt-1"
                      value={prestataireForm.contactName}
                      onChange={(e) => setPrestataireForm({...prestataireForm, contactName: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Ville</Label>
                    <Input 
                      placeholder="Rennes" 
                      className="mt-1"
                      value={prestataireForm.city}
                      onChange={(e) => setPrestataireForm({...prestataireForm, city: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Email *</Label>
                    <Input 
                      type="email" 
                      placeholder="contact@exemple.fr" 
                      className="mt-1"
                      value={prestataireForm.email}
                      onChange={(e) => setPrestataireForm({...prestataireForm, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Téléphone</Label>
                    <Input 
                      placeholder="02 99 00 00 00" 
                      className="mt-1"
                      value={prestataireForm.phone}
                      onChange={(e) => setPrestataireForm({...prestataireForm, phone: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <Label>Note (1-5 étoiles)</Label>
                  <Select value={prestataireForm.rating.toString()} onValueChange={(v) => setPrestataireForm({...prestataireForm, rating: parseInt(v)})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Sélectionner une note" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">⭐ 1 étoile</SelectItem>
                      <SelectItem value="2">⭐⭐ 2 étoiles</SelectItem>
                      <SelectItem value="3">⭐⭐⭐ 3 étoiles</SelectItem>
                      <SelectItem value="4">⭐⭐⭐⭐ 4 étoiles</SelectItem>
                      <SelectItem value="5">⭐⭐⭐⭐⭐ 5 étoiles</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Décrivez le rôle de ce prestataire et ce qu'il apporte..."
                    className="mt-1"
                    rows={2}
                    value={prestataireForm.desc}
                    onChange={(e) => setPrestataireForm({ ...prestataireForm, desc: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Notes &amp; conditions</Label>
                  <Textarea 
                    placeholder="Conditions de paiement, contraintes spécifiques, remarques internes..." 
                    className="mt-1" 
                    rows={2}
                    value={prestataireForm.notes}
                    onChange={(e) => setPrestataireForm({...prestataireForm, notes: e.target.value})}
                  />
                </div>
                <DialogFooter className="pt-4">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Annuler
                  </Button>
                  <Button 
                    className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
                    onClick={handleCreatePrestataire}
                    disabled={loading}
                  >
                    {loading ? 'Création...' : 'Créer le prestataire'}
                  </Button>
                </DialogFooter>
              </div>
            </TabsContent>

            {/* ONGLET TÂCHE - Formulaire inline */}
            <TabsContent value="task" className="mt-4">
              <div className="space-y-4 py-4">
                <div>
                  <Label>Titre de la tâche *</Label>
                  <Input 
                    placeholder="Ex: Appeler le traiteur" 
                    className="mt-1"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({...taskForm, title: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea 
                    placeholder="Détails de la tâche..." 
                    className="mt-1" 
                    rows={3}
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({...taskForm, description: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Statut</Label>
                    <Select value={taskForm.status} onValueChange={(v: any) => setTaskForm({...taskForm, status: v})}>
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
                    <Select value={taskForm.priority} onValueChange={(v: any) => setTaskForm({...taskForm, priority: v})}>
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
                  <Label>Date d&apos;échéance *</Label>
                  <Input 
                    type="date" 
                    className="mt-1"
                    value={taskForm.dueDate}
                    onChange={(e) => setTaskForm({...taskForm, dueDate: e.target.value})}
                  />
                </div>
                <DialogFooter className="pt-4">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Annuler
                  </Button>
                  <Button 
                    className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
                    onClick={handleCreateTask}
                    disabled={loading}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {loading ? 'Création...' : 'Créer la tâche'}
                  </Button>
                </DialogFooter>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Modal Client séparé */}
      {user && (
        <ClientModal
          open={isClientModalOpen}
          onOpenChange={setIsClientModalOpen}
          mode="create"
          userId={user.uid}
          onSuccess={handleClientSuccess}
        />
      )}
    </>
  );
}
