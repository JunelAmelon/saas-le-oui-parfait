'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { addDocument, deleteDocument, getDocuments, updateDocument } from '@/lib/db';
import { ArrowLeft, CheckCircle, Circle, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type Step = {
  id: string;
  kind: 'milestone';
  event_id: string;
  client_id: string;
  planner_id?: string;
  title: string;
  description?: string;
  deadline?: string;
  admin_confirmed?: boolean;
  client_confirmed?: boolean;
  created_at?: any;
};

export default function ClientStepsAdminPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [eventId, setEventId] = useState<string | null>(null);
  const [plannerId, setPlannerId] = useState<string | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newStep, setNewStep] = useState({ title: '', description: '', deadline: '' });

  const fetchAll = async () => {
    if (!clientId) return;
    try {
      setLoading(true);
      const events = await getDocuments('events', [
        { field: 'client_id', operator: '==', value: clientId },
      ]);
      const ev = ((events as any[]) || []).find((x) => Boolean(x?.event_date)) || (events?.[0] as any) || null;
      const evId = ev?.id || null;
      setEventId(evId);
      setPlannerId(ev?.planner_id || null);

      if (!evId) {
        setSteps([]);
        return;
      }

      const tasks = await getDocuments('tasks', [
        { field: 'event_id', operator: '==', value: evId },
      ]);
      const onlySteps = (tasks as any[]).filter((t) => t?.kind === 'milestone');
      setSteps(onlySteps as Step[]);
    } catch (e) {
      console.error('Error fetching steps admin:', e);
      toast.error('Erreur lors du chargement des étapes');
      setSteps([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const sortedSteps = useMemo(() => {
    return steps.slice().sort((a, b) => (a.deadline || '').localeCompare(b.deadline || ''));
  }, [steps]);

  const addStep = async () => {
    if (!eventId) {
      toast.error('Événement introuvable pour ce client');
      return;
    }
    if (!newStep.title.trim()) {
      toast.error('Titre obligatoire');
      return;
    }

    try {
      const created = await addDocument('tasks', {
        kind: 'milestone',
        event_id: eventId,
        client_id: clientId,
        planner_id: plannerId || undefined,
        title: newStep.title.trim(),
        description: newStep.description.trim(),
        deadline: newStep.deadline,
        admin_confirmed: false,
        client_confirmed: false,
        created_at: new Date().toISOString(),
      });

      setSteps((prev) => [{ ...(created as any) }, ...prev]);
      setIsAddOpen(false);
      setNewStep({ title: '', description: '', deadline: '' });
      toast.success('Étape ajoutée');
    } catch (e) {
      console.error('Error adding step:', e);
      toast.error("Impossible d'ajouter l'étape");
    }
  };

  const toggleAdminConfirm = async (step: Step) => {
    const next = !step.admin_confirmed;
    setSteps((prev) => prev.map((s) => (s.id === step.id ? { ...s, admin_confirmed: next } : s)));
    try {
      await updateDocument('tasks', step.id, { admin_confirmed: next });
    } catch (e) {
      console.error('Error updating admin_confirmed:', e);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const removeStep = async (step: Step) => {
    try {
      await deleteDocument('tasks', step.id);
      setSteps((prev) => prev.filter((s) => s.id !== step.id));
      toast.success('Étape supprimée');
    } catch (e) {
      console.error('Error deleting step:', e);
      toast.error("Impossible de supprimer l'étape");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-brand-purple mb-2">Étapes</h1>
            <p className="text-brand-gray">Créez et validez les étapes clés pour ce client</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.back()} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Button>
            <Button
              className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2"
              onClick={() => setIsAddOpen(true)}
              disabled={loading || !eventId}
            >
              <Plus className="h-4 w-4" />
              Ajouter
            </Button>
          </div>
        </div>

        {loading ? (
          <Card className="p-10 shadow-xl border-0">
            <div className="flex items-center justify-center gap-3 text-brand-gray">
              <Loader2 className="h-5 w-5 animate-spin" />
              Chargement...
            </div>
          </Card>
        ) : !eventId ? (
          <Card className="p-10 shadow-xl border-0">
            <div className="text-center text-brand-gray">Aucun événement trouvé pour ce client.</div>
          </Card>
        ) : (
          <Card className="p-6 shadow-xl border-0">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-brand-purple">Liste des étapes</h2>
                <p className="text-sm text-brand-gray">{steps.length} étape(s)</p>
              </div>
            </div>

            {sortedSteps.length === 0 ? (
              <div className="text-center py-12 text-brand-gray">Aucune étape</div>
            ) : (
              <div className="space-y-3">
                {sortedSteps.map((s) => {
                  const done = Boolean(s.admin_confirmed) && Boolean(s.client_confirmed);
                  return (
                    <div key={s.id} className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="mt-0.5">
                            {done ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <Circle className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-brand-purple truncate">{s.title}</p>
                            {s.deadline ? <p className="text-sm text-brand-gray">Échéance : {s.deadline}</p> : null}
                            {s.description ? <p className="text-sm text-brand-gray mt-1">{s.description}</p> : null}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge className={done ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                            {done ? 'Validée' : 'En cours'}
                          </Badge>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => void removeStep(s)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Badge className={s.client_confirmed ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}>
                          Client : {s.client_confirmed ? 'confirmé' : 'en attente'}
                        </Badge>
                        <Badge className={s.admin_confirmed ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}>
                          Admin : {s.admin_confirmed ? 'confirmé' : 'en attente'}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          className="ml-auto"
                          onClick={() => void toggleAdminConfirm(s)}
                        >
                          {s.admin_confirmed ? 'Annuler validation admin' : 'Valider côté admin'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-brand-purple">Ajouter une étape</DialogTitle>
              <DialogDescription>Crée une étape visible côté client</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Titre *</Label>
                <Input value={newStep.title} onChange={(e) => setNewStep({ ...newStep, title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={newStep.description} onChange={(e) => setNewStep({ ...newStep, description: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Échéance</Label>
                <Input type="date" value={newStep.deadline} onChange={(e) => setNewStep({ ...newStep, deadline: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Annuler</Button>
              <Button className="bg-brand-turquoise hover:bg-brand-turquoise-hover" onClick={() => void addStep()}>
                Ajouter
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
