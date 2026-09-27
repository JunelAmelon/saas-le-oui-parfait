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
import { addDocument, deleteDocument, getDocument, getDocuments, updateDocument } from '@/lib/db';
import { ArrowLeft, CheckCircle, Circle, Loader2, Plus, Trash2, Pencil, Bell, Pause, Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { CLIENT_REMINDER_DEFS, defaultReminderPayloads, reminderDef, calculateFirstSendDate } from '@/lib/client-reminders';

type Step = {
  id: string;
  kind: 'milestone';
  event_id: string;
  client_id: string;
  planner_id?: string;
  title: string;
  description?: string;
  deadline?: string;
  deadline_date?: string;
  reminder_offsets?: number[];
  priority?: 'normal' | 'urgent';
  auto_generated?: boolean;
  last_reminder_tier?: string;
  last_reminder_sent?: string;
  admin_confirmed?: boolean;
  client_confirmed?: boolean;
  client_confirmed_at?: string;
  created_at?: any;
};

export default function ClientStepsAdminPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [eventId, setEventId] = useState<string | null>(null);
  const [eventDate, setEventDate] = useState<string | null>(null);
  const [plannerId, setPlannerId] = useState<string | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [processingReminderId, setProcessingReminderId] = useState<string | null>(null);
  const [reminderPage, setReminderPage] = useState(1);
  const REMINDERS_PER_PAGE = 3;

  // Modals pour rappels personnalisés
  const [isAddReminderOpen, setIsAddReminderOpen] = useState(false);
  const [newReminderForm, setNewReminderForm] = useState({
    label: '',
    intervalDays: 30,
    maxSends: '' as string | number,
    firstDate: '',
  });
  const [isAddingReminder, setIsAddingReminder] = useState(false);

  const [isEditReminderOpen, setIsEditReminderOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<any | null>(null);
  const [editReminderForm, setEditReminderForm] = useState({
    label: '',
    intervalDays: 30,
    maxSends: '' as string | number,
    nextSendAt: '',
  });
  const [isSavingEditReminder, setIsSavingEditReminder] = useState(false);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newStep, setNewStep] = useState({ title: '', description: '', deadline: '' });

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editing, setEditing] = useState<Step | null>(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', deadline: '' });

  const [isAdding, setIsAdding] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [processingStepId, setProcessingStepId] = useState<string | null>(null);

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
      setEventDate(ev?.event_date || null);
      setPlannerId(ev?.planner_id || user?.uid || null);

      const filters: any[] = [];
      if (evId) filters.push({ field: 'event_id', operator: '==', value: evId });
      filters.push({ field: 'client_id', operator: '==', value: clientId });
      if (user?.uid) filters.push({ field: 'planner_id', operator: '==', value: user.uid });

      const tasks = await getDocuments('tasks', filters);
      const onlySteps = (tasks as any[]).filter((t) => t?.kind === 'milestone');
      setSteps(onlySteps as Step[]);

      // Rappels automatiques ; backfill pour les fiches créées avant la fonctionnalité.
      // Dédupliqué par type : ne crée que les types absents, supprime les doublons
      // (le double appel de fetchAll en dev StrictMode pouvait en générer).
      try {
        const rems = await getDocuments('client_reminders', [
          { field: 'client_id', operator: '==', value: clientId },
        ]);

        const byType: Record<string, any[]> = {};
        for (const r of rems as any[]) {
          const key = r.type === 'custom' ? `custom:${r.id}` : (r.type || '?');
          (byType[key] = byType[key] || []).push(r);
        }
        const now = new Date();
        const kept: any[] = [];
        const dupes: any[] = [];
        for (const key of Object.keys(byType)) {
          const list = byType[key];
          list.sort((a: any, b: any) => String(a.created_at || '').localeCompare(String(b.created_at || '')));
          const primary = list[0];
          // Option B : Rétroplanning basé sur la date du mariage.
          // Si le rappel par défaut n'a pas encore été envoyé (0 envoi) et n'est pas bouclé,
          // on aligne sa prochaine date sur le rétroplanning de la date du mariage.
          const def = reminderDef(primary?.type);
          if (
            def &&
            (primary.sent_count || 0) === 0 &&
            !primary.completed_at &&
            primary.schedule_mode !== 'manual'
          ) {
            const wDate = ev?.event_date || eventDate;
            const targetDate = calculateFirstSendDate(def, wDate, now);
            const targetIso = targetDate.toISOString();
            if (primary.next_send_at !== targetIso) {
              primary.next_send_at = targetIso;
              void updateDocument('client_reminders', primary.id, { next_send_at: targetIso });
            }
          }
          kept.push(primary);
          dupes.push(...list.slice(1));
        }
        await Promise.all(dupes.map((d) => deleteDocument('client_reminders', d.id)));

        const existingDefaultTypes = new Set(
          (rems as any[])
            .filter((r) => r.type && r.type !== 'custom')
            .map((r) => r.type),
        );
        const missingTypes = CLIENT_REMINDER_DEFS
          .map((d) => d.type)
          .filter((t) => !existingDefaultTypes.has(t));
        if (missingTypes.length) {
          const clientDoc = (await getDocument('clients', clientId)) as any;
          const pid = clientDoc?.planner_id || ev?.planner_id || user?.uid || '';
          const wDate = ev?.event_date || clientDoc?.event_date || eventDate;
          // Initialisation selon le rétroplanning (Option B)
          for (const payload of defaultReminderPayloads(clientId, pid, wDate, now)) {
            if (missingTypes.includes(payload.type)) {
              const createdDoc = await addDocument('client_reminders', payload);
              kept.push({ ...payload, id: (createdDoc as any)?.id });
            }
          }
        }
        setReminders(kept);
      } catch (e) {
        console.warn('Error fetching client reminders:', e);
        setReminders([]);
      }
    } catch (e) {
      console.error('Error fetching steps admin:', e);
      toast.error('Erreur lors du chargement des étapes');
      setSteps([]);
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (step: Step) => {
    setEditing(step);
    setEditForm({
      title: step.title || '',
      description: step.description || '',
      deadline: step.deadline || '',
    });
    setIsEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editing?.id) return;
    if (!editForm.title.trim()) {
      toast.error('Titre obligatoire');
      return;
    }

    setIsSavingEdit(true);
    try {
      const update: Record<string, any> = {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        deadline: editForm.deadline,
        deadline_date: editForm.deadline,
      };
      if (!editing.reminder_offsets?.length) {
        update.reminder_offsets = [-7, -3, 0, 3, 7, 14];
      }
      await updateDocument('tasks', editing.id, update);

      setSteps((prev) =>
        prev.map((s) =>
          s.id === editing.id
            ? {
                ...s,
                title: editForm.title.trim(),
                description: editForm.description.trim(),
                deadline: editForm.deadline,
              }
            : s
        )
      );

      setIsEditOpen(false);
      setEditing(null);
      toast.success('Étape mise à jour');
    } catch (e) {
      console.error('Error updating step:', e);
      toast.error("Impossible de modifier l'étape");
    } finally {
      setIsSavingEdit(false);
    }
  };

  useEffect(() => {
    void fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, user?.uid]);

  const sortedSteps = useMemo(() => {
    return steps.slice().sort((a, b) => {
      const aUrgent = a.priority === 'urgent' ? -1 : 0;
      const bUrgent = b.priority === 'urgent' ? -1 : 0;
      if (aUrgent !== bUrgent) return aUrgent - bUrgent;
      return (a.deadline || '').localeCompare(b.deadline || '');
    });
  }, [steps]);

  const toggleReminderActive = async (rem: any) => {
    if (processingReminderId) return;
    setProcessingReminderId(rem.id);
    try {
      const next = !rem.active;
      await updateDocument('client_reminders', rem.id, { active: next });
      setReminders((prev) => prev.map((r) => (r.id === rem.id ? { ...r, active: next } : r)));
    } catch (e) {
      console.error('Error toggling reminder:', e);
      toast.error('Impossible de modifier le rappel');
    } finally {
      setProcessingReminderId(null);
    }
  };

  const toggleReminderDone = async (rem: any) => {
    if (processingReminderId) return;
    if (!rem.completed_at && !confirm('Marquer ce rappel comme bouclé ? Les relances s\'arrêteront.')) return;
    setProcessingReminderId(rem.id);
    try {
      const done = !rem.completed_at;
      await updateDocument('client_reminders', rem.id, {
        completed_at: done ? new Date().toISOString() : null,
        completed_by: done ? 'admin' : null,
      });
      setReminders((prev) =>
        prev.map((r) => (r.id === rem.id ? { ...r, completed_at: done ? new Date().toISOString() : null, completed_by: done ? 'admin' : null } : r)),
      );
      toast.success(done ? 'Rappel marqué comme bouclé' : 'Rappel rouvert');
    } catch (e) {
      console.error('Error completing reminder:', e);
      toast.error('Impossible de modifier le rappel');
    } finally {
      setProcessingReminderId(null);
    }
  };

  const addReminder = async () => {
    if (!newReminderForm.label.trim()) {
      toast.error('Libellé du rappel obligatoire');
      return;
    }
    const intervalDays = Number(newReminderForm.intervalDays) || 30;
    const maxSends = newReminderForm.maxSends !== '' ? Number(newReminderForm.maxSends) : null;
    let nextSendAt: string;
    if (newReminderForm.firstDate) {
      nextSendAt = new Date(newReminderForm.firstDate + 'T00:00:00').toISOString();
    } else {
      const d = new Date();
      d.setDate(d.getDate() + intervalDays);
      nextSendAt = d.toISOString();
    }

    setIsAddingReminder(true);
    try {
      const payload: Record<string, any> = {
        client_id: clientId,
        planner_id: plannerId || user?.uid || '',
        type: 'custom',
        label: newReminderForm.label.trim(),
        schedule_mode: 'manual',
        interval_days: intervalDays,
        max_sends: maxSends,
        sent_count: 0,
        next_send_at: nextSendAt,
        last_sent_at: null,
        active: true,
        completed_at: null,
        completed_by: null,
        created_at: new Date().toISOString(),
      };
      const created = await addDocument('client_reminders', payload);
      setReminders((prev) => [{ ...payload, id: (created as any)?.id }, ...prev]);
      setIsAddReminderOpen(false);
      setNewReminderForm({ label: '', intervalDays: 30, maxSends: '', firstDate: '' });
      toast.success('Rappel automatique ajouté');
    } catch (e) {
      console.error('Error adding reminder:', e);
      toast.error("Impossible d'ajouter le rappel");
    } finally {
      setIsAddingReminder(false);
    }
  };

  const openEditReminder = (rem: any) => {
    setEditingReminder(rem);
    const def = reminderDef(rem.type);
    const nextDateStr = rem.next_send_at ? new Date(rem.next_send_at).toISOString().slice(0, 10) : '';
    setEditReminderForm({
      label: rem.label || def?.label || rem.type,
      intervalDays: rem.interval_days || def?.intervalDays || 30,
      maxSends: rem.max_sends ?? (def?.maxSends ?? ''),
      nextSendAt: nextDateStr,
    });
    setIsEditReminderOpen(true);
  };

  const saveEditReminder = async () => {
    if (!editingReminder?.id) return;
    if (!editReminderForm.label.trim()) {
      toast.error('Libellé obligatoire');
      return;
    }

    setIsSavingEditReminder(true);
    try {
      const intervalDays = Number(editReminderForm.intervalDays) || 30;
      const maxSends = editReminderForm.maxSends !== '' ? Number(editReminderForm.maxSends) : null;
      const nextSendAt = editReminderForm.nextSendAt
        ? new Date(editReminderForm.nextSendAt + 'T00:00:00').toISOString()
        : editingReminder.next_send_at;

      const updateData = {
        label: editReminderForm.label.trim(),
        schedule_mode: 'manual',
        interval_days: intervalDays,
        max_sends: maxSends,
        next_send_at: nextSendAt,
      };

      await updateDocument('client_reminders', editingReminder.id, updateData);
      setReminders((prev) =>
        prev.map((r) => (r.id === editingReminder.id ? { ...r, ...updateData } : r))
      );
      setIsEditReminderOpen(false);
      setEditingReminder(null);
      toast.success('Rappel mis à jour');
    } catch (e) {
      console.error('Error updating reminder:', e);
      toast.error('Impossible de modifier le rappel');
    } finally {
      setIsSavingEditReminder(false);
    }
  };

  const removeReminder = async (rem: any) => {
    if (!confirm(`Supprimer définitivement le rappel "${rem.label || rem.type}" ?`)) return;
    setProcessingReminderId(rem.id);
    try {
      await deleteDocument('client_reminders', rem.id);
      setReminders((prev) => prev.filter((r) => r.id !== rem.id));
      toast.success('Rappel supprimé');
    } catch (e) {
      console.error('Error deleting reminder:', e);
      toast.error('Impossible de supprimer le rappel');
    } finally {
      setProcessingReminderId(null);
    }
  };

  const addStep = async () => {
    if (!newStep.title.trim()) {
      toast.error('Titre obligatoire');
      return;
    }

    setIsAdding(true);
    try {
      const created = await addDocument('tasks', {
        kind: 'milestone',
        event_id: eventId || '',
        client_id: clientId,
        planner_id: plannerId || user?.uid || undefined,
        title: newStep.title.trim(),
        description: newStep.description.trim(),
        deadline: newStep.deadline,
        deadline_date: newStep.deadline,
        reminder_offsets: [-7, -3, 0, 3, 7, 14],
        priority: 'normal',
        auto_generated: false,
        admin_confirmed: false,
        client_confirmed: false,
        created_at: new Date().toISOString(),
      });

      // Notif + push + email côté client (best effort)
      try {
        const { getDocument, addDocument: addDoc2 } = await import('@/lib/db');
        const clientRaw = (await getDocument('clients', clientId)) as any;
        const clientUserId = clientRaw?.client_user_id || null;
        if (clientUserId) {
          await addDoc2('notifications', {
            recipient_id: clientUserId,
            type: 'step',
            title: 'Nouvelle étape',
            message: `Une nouvelle étape a été ajoutée : ${newStep.title.trim()}`,
            link: '/espace-client/planning',
            read: false,
            created_at: new Date(),
            planner_id: plannerId || user?.uid || undefined,
            client_id: clientId,
            event_id: eventId || '',
            meta: { kind: 'milestone', task_id: (created as any)?.id || null },
          });

          try {
            const { sendPushToRecipient } = await import('@/lib/push');
            await sendPushToRecipient({
              recipientId: clientUserId,
              title: 'Nouvelle étape',
              body: `Une nouvelle étape a été ajoutée : ${newStep.title.trim()}`,
              link: '/espace-client/planning',
            });
          } catch (e) {
            console.warn('Unable to send push:', e);
          }

          try {
            const { sendEmailToUid } = await import('@/lib/email');
            await sendEmailToUid({
              recipientUid: clientUserId,
              subject: 'Nouvelle étape - Le Oui Parfait',
              text: `Une nouvelle étape a été ajoutée à votre planning : ${newStep.title.trim()}.\n\nConnectez-vous à votre espace client pour la consulter.`,
            });
          } catch (e) {
            console.warn('Unable to send email:', e);
          }
        }
      } catch (e) {
        console.warn('Unable to notify client for step:', e);
      }

      setSteps((prev) => [{ ...(created as any) }, ...prev]);
      setIsAddOpen(false);
      setNewStep({ title: '', description: '', deadline: '' });
      toast.success('Étape ajoutée');
    } catch (e) {
      console.error('Error adding step:', e);
      toast.error("Impossible d'ajouter l'étape");
    } finally {
      setIsAdding(false);
    }
  };

  const removeStep = async (step: Step) => {
    if (processingStepId) return;
    if (!confirm('Supprimer cette étape ?')) return;
    setProcessingStepId(step.id);
    try {
      await deleteDocument('tasks', step.id);
      setSteps((prev) => prev.filter((s) => s.id !== step.id));
      toast.success('Étape supprimée');
    } catch (e) {
      console.error('Error deleting step:', e);
      toast.error("Impossible de supprimer l'étape");
    } finally {
      setProcessingStepId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader title="Étapes" description="Créez et validez les étapes clés pour ce client">
          <Button variant="outline" onClick={() => router.back()} className="w-full sm:w-auto gap-2">
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
          <Button
            className="bg-brand-turquoise hover:bg-brand-turquoise-hover w-full sm:w-auto gap-2"
            onClick={() => setIsAddOpen(true)}
            disabled={loading}
          >
            <Plus className="h-4 w-4" />
            Ajouter
          </Button>
        </PageHeader>

        {loading ? (
          <Card className="p-10 shadow-xl border-0">
            <div className="flex items-center justify-center gap-3 text-brand-gray">
              <Loader2 className="h-5 w-5 animate-spin" />
              Chargement...
            </div>
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
                  const done = Boolean(s.client_confirmed);
                  return (
                    <div key={s.id} className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="mt-0.5">
                            {done ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <Circle className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium text-brand-purple truncate">{s.title}</p>
                              {s.priority === 'urgent' && (
                                <Badge className="bg-red-100 text-red-700 border-0 text-[10px]">Urgent</Badge>
                              )}
                              {s.auto_generated && (
                                <Badge className="bg-blue-50 text-blue-600 border-0 text-[10px]">Auto</Badge>
                              )}
                            </div>
                            {s.deadline ? <p className="text-sm text-brand-gray">Échéance : {s.deadline}</p> : null}
                            {s.description ? <p className="text-sm text-brand-gray mt-1">{s.description}</p> : null}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge className={done ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                            {done ? 'Validée' : 'En cours'}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(s)}
                            title="Modifier"
                          >
                            <Pencil className="h-4 w-4 text-brand-gray" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => void removeStep(s)}
                            disabled={processingStepId === s.id}
                          >
                            {processingStepId === s.id ? (
                              <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-red-500" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Badge className={s.client_confirmed ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}>
                          {s.client_confirmed ? 'Validée par le couple' : 'En attente du couple'}
                        </Badge>
                        {s.client_confirmed && s.client_confirmed_at ? (
                          <span className="text-xs text-brand-gray">{s.client_confirmed_at.slice(0, 10)}</span>
                        ) : null}
                        {s.last_reminder_tier ? (
                          <Badge className="bg-gray-100 text-gray-700 text-[10px]">
                            Dernier rappel : {s.last_reminder_tier}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}

        {/* Rappels automatiques au couple */}
        <Card className="p-6 shadow-xl border-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-brand-turquoise" />
              <div>
                <h2 className="text-xl font-bold text-brand-purple">Rappels automatiques ({reminders.length})</h2>
              </div>
            </div>
            <Button
              size="sm"
              className="bg-brand-purple hover:bg-brand-purple/90 text-white gap-2 self-start sm:self-auto"
              onClick={() => {
                setNewReminderForm({ label: '', intervalDays: 30, maxSends: '', firstDate: '' });
                setIsAddReminderOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Nouveau rappel
            </Button>
          </div>

          {reminders.length === 0 ? (
            <p className="text-sm text-brand-gray py-4">Aucun rappel actif.</p>
          ) : (
            <div className="space-y-3">
              {reminders
                .slice((reminderPage - 1) * REMINDERS_PER_PAGE, reminderPage * REMINDERS_PER_PAGE)
                .map((rem) => {
                  const def = reminderDef(rem.type);
                  const maxSends = rem.max_sends !== undefined && rem.max_sends !== null ? rem.max_sends : (def?.maxSends ?? null);
                  const cadence = maxSends !== null
                    ? `1×/${rem.interval_days || def?.intervalDays || 30} j · ${rem.sent_count || 0}/${maxSends} envoyé(s)`
                    : `tous les ${rem.interval_days || def?.intervalDays || 90} j · ${rem.sent_count || 0} envoyé(s)`;
                  const nextDate = rem.next_send_at
                    ? new Date(rem.next_send_at).toLocaleDateString('fr-FR')
                    : null;
                  const done = Boolean(rem.completed_at);

                  return (
                    <div key={rem.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg bg-gray-50 hover:bg-gray-100/70 transition-colors">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-brand-purple">{rem.label || def?.label || rem.type}</p>
                          {done ? (
                            <Badge className="bg-green-100 text-green-700">Bouclé{rem.completed_by === 'client' ? ' par le couple' : ''}</Badge>
                          ) : !rem.active ? (
                            <Badge className="bg-gray-100 text-gray-600">Terminé</Badge>
                          ) : (
                            <Badge className="bg-brand-turquoise/15 text-brand-turquoise">Actif</Badge>
                          )}
                        </div>
                        <p className="text-sm text-brand-gray mt-1">
                          {cadence}
                          {rem.active && !done && nextDate ? ` · prochain envoi : ${nextDate}` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {!done && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title={rem.active ? 'Mettre en pause' : 'Reprendre'}
                            onClick={() => void toggleReminderActive(rem)}
                            disabled={processingReminderId === rem.id}
                          >
                            {processingReminderId === rem.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : rem.active ? (
                              <Pause className="h-4 w-4 text-brand-gray" />
                            ) : (
                              <Play className="h-4 w-4 text-brand-turquoise" />
                            )}
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Modifier le rappel"
                          onClick={() => openEditReminder(rem)}
                          disabled={processingReminderId === rem.id}
                        >
                          <Pencil className="h-4 w-4 text-brand-gray" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title={done ? 'Rouvrir le rappel' : 'Marquer comme bouclé'}
                          onClick={() => void toggleReminderDone(rem)}
                          disabled={processingReminderId === rem.id}
                        >
                          <CheckCircle className={`h-4 w-4 ${done ? 'text-green-600' : 'text-gray-400'}`} />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                          title="Supprimer le rappel"
                          onClick={() => void removeReminder(rem)}
                          disabled={processingReminderId === rem.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Pagination rappels (3 par page) */}
          {Math.ceil(reminders.length / REMINDERS_PER_PAGE) > 1 && (
            <div className="flex items-center justify-between pt-4 mt-2 border-t border-gray-100 text-sm text-brand-gray">
              <span>
                Page {reminderPage} sur {Math.ceil(reminders.length / REMINDERS_PER_PAGE)} ({reminders.length} rappels)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0"
                  disabled={reminderPage <= 1}
                  onClick={() => setReminderPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0"
                  disabled={reminderPage >= Math.ceil(reminders.length / REMINDERS_PER_PAGE)}
                  onClick={() => setReminderPage((p) => Math.min(Math.ceil(reminders.length / REMINDERS_PER_PAGE), p + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Modal Ajout de rappel personnalisé */}
        <Dialog open={isAddReminderOpen} onOpenChange={setIsAddReminderOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-brand-purple">Nouveau rappel automatique</DialogTitle>
              <DialogDescription>
                Définissez un rappel périodique envoyé par email et dans l&apos;espace client.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Libellé du rappel *</Label>
                <Input
                  placeholder="Ex: Choix des faire-part, Menu traiteur..."
                  value={newReminderForm.label}
                  onChange={(e) => setNewReminderForm({ ...newReminderForm, label: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cadence (jours) *</Label>
                  <Input
                    type="number"
                    min={1}
                    value={newReminderForm.intervalDays}
                    onChange={(e) => setNewReminderForm({ ...newReminderForm, intervalDays: parseInt(e.target.value) || 30 })}
                  />
                  <p className="text-[11px] text-brand-gray">Ex: 30 = mensuel, 90 = trimestriel</p>
                </div>

                <div className="space-y-2">
                  <Label>Nb max d&apos;envois</Label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="Illimité si vide"
                    value={newReminderForm.maxSends}
                    onChange={(e) => setNewReminderForm({ ...newReminderForm, maxSends: e.target.value ? parseInt(e.target.value) : '' })}
                  />
                  <p className="text-[11px] text-brand-gray">Ex: 3 envois max</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Date du 1er envoi (optionnel)</Label>
                <Input
                  type="date"
                  value={newReminderForm.firstDate}
                  onChange={(e) => setNewReminderForm({ ...newReminderForm, firstDate: e.target.value })}
                />
                <p className="text-[11px] text-brand-gray">Par défaut : aujourd&apos;hui + cadence</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddReminderOpen(false)} disabled={isAddingReminder}>
                Annuler
              </Button>
              <Button
                className="bg-brand-purple hover:bg-brand-purple/90 text-white"
                onClick={() => void addReminder()}
                disabled={isAddingReminder}
              >
                {isAddingReminder ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Créer le rappel'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Modification de rappel */}
        <Dialog open={isEditReminderOpen} onOpenChange={setIsEditReminderOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-brand-purple">Modifier le rappel</DialogTitle>
              <DialogDescription>
                Ajustez le libellé, la cadence ou la prochaine date d&apos;envoi.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Libellé *</Label>
                <Input
                  value={editReminderForm.label}
                  onChange={(e) => setEditReminderForm({ ...editReminderForm, label: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cadence (jours) *</Label>
                  <Input
                    type="number"
                    min={1}
                    value={editReminderForm.intervalDays}
                    onChange={(e) => setEditReminderForm({ ...editReminderForm, intervalDays: parseInt(e.target.value) || 30 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Nb max d&apos;envois</Label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="Illimité si vide"
                    value={editReminderForm.maxSends}
                    onChange={(e) => setEditReminderForm({ ...editReminderForm, maxSends: e.target.value ? parseInt(e.target.value) : '' })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Prochaine date d&apos;envoi</Label>
                <Input
                  type="date"
                  value={editReminderForm.nextSendAt}
                  onChange={(e) => setEditReminderForm({ ...editReminderForm, nextSendAt: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditReminderOpen(false)} disabled={isSavingEditReminder}>
                Annuler
              </Button>
              <Button
                className="bg-brand-purple hover:bg-brand-purple/90 text-white"
                onClick={() => void saveEditReminder()}
                disabled={isSavingEditReminder}
              >
                {isSavingEditReminder ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
              <Button variant="outline" onClick={() => setIsAddOpen(false)} disabled={isAdding}>Annuler</Button>
              <Button
                className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
                onClick={() => void addStep()}
                disabled={isAdding}
              >
                {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ajouter'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-brand-purple">Modifier une étape</DialogTitle>
              <DialogDescription>Ces modifications seront visibles côté client.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Titre *</Label>
                <Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Échéance</Label>
                <Input type="date" value={editForm.deadline} onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditOpen(false);
                  setEditing(null);
                }}
              >
                Annuler
              </Button>
              <Button
                className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
                onClick={() => void saveEdit()}
                disabled={isSavingEdit}
              >
                {isSavingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
