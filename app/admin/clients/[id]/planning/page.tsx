'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Calendar, Clock, MapPin, Loader2, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { addDocument, deleteDocument, getDocuments } from '@/lib/db';
import { toast } from 'sonner';

type AppointmentTask = {
  id: string;
  kind: 'appointment';
  event_id: string;
  client_id: string;
  planner_id?: string;
  title: string;
  notes?: string;
  location?: string;
  status: 'accepted';
  confirmed_date: string;
  confirmed_time: string;
  created_by: 'admin';
  created_at: string;
};

export default function ClientPlanningPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [eventId, setEventId] = useState<string | null>(null);
  const [plannerId, setPlannerId] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<AppointmentTask[]>([]);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState({ title: '', date: '', time: '', location: '', notes: '' });

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
        setAppointments([]);
        return;
      }

      const tasks = await getDocuments('tasks', [
        { field: 'event_id', operator: '==', value: evId },
      ]);
      const apts = (tasks as any[])
        .filter((t) => t?.kind === 'appointment')
        .filter((t) => (t?.status || 'accepted') === 'accepted') as AppointmentTask[];
      setAppointments(apts);
    } catch (e) {
      console.error('Error fetching admin planning:', e);
      toast.error('Erreur lors du chargement du planning');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const sortedAppointments = useMemo(() => {
    return appointments
      .slice()
      .sort((a, b) => `${a.confirmed_date}T${a.confirmed_time}`.localeCompare(`${b.confirmed_date}T${b.confirmed_time}`));
  }, [appointments]);

  const addAppointment = async () => {
    if (!eventId) {
      toast.error('Événement introuvable pour ce client');
      return;
    }
    if (!form.title.trim() || !form.date || !form.time) {
      toast.error('Titre, date et heure obligatoires');
      return;
    }

    try {
      const created = await addDocument('tasks', {
        kind: 'appointment',
        event_id: eventId,
        client_id: clientId,
        planner_id: plannerId || undefined,
        title: form.title.trim(),
        notes: form.notes.trim(),
        location: form.location.trim(),
        status: 'accepted',
        confirmed_date: form.date,
        confirmed_time: form.time,
        created_by: 'admin',
        created_at: new Date().toISOString(),
      });

      setAppointments((prev) => [{ ...(created as any) }, ...prev]);
      setIsAddOpen(false);
      setForm({ title: '', date: '', time: '', location: '', notes: '' });
      toast.success('Rendez-vous ajouté');
    } catch (e) {
      console.error('Error adding appointment:', e);
      toast.error("Impossible d'ajouter le rendez-vous");
    }
  };

  const removeAppointment = async (apt: AppointmentTask) => {
    try {
      await deleteDocument('tasks', apt.id);
      setAppointments((prev) => prev.filter((x) => x.id !== apt.id));
      toast.success('Rendez-vous supprimé');
    } catch (e) {
      console.error('Error deleting appointment:', e);
      toast.error("Impossible de supprimer le rendez-vous");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-brand-purple mb-2">Planning</h1>
            <p className="text-brand-gray">Planning du client</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              ← Retour
            </Button>
            <Button
              className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2"
              onClick={() => setIsAddOpen(true)}
              disabled={loading || !eventId}
            >
              <Plus className="h-4 w-4" />
              Ajouter un RDV
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <div>
                <h2 className="text-xl font-bold text-brand-purple">Rendez-vous</h2>
                <p className="text-sm text-brand-gray">{appointments.length} rendez-vous</p>
              </div>
            </div>

            {sortedAppointments.length === 0 ? (
              <div className="text-center py-10 text-brand-gray">Aucun rendez-vous</div>
            ) : (
              <div className="space-y-3">
                {sortedAppointments.map((a) => (
                  <div key={a.id} className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-medium text-brand-purple truncate">{a.title}</p>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-brand-gray mt-1">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {a.confirmed_date}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {a.confirmed_time}
                          </span>
                          {a.location ? (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {a.location}
                            </span>
                          ) : null}
                        </div>
                        {a.notes ? <p className="text-sm text-brand-gray mt-2">{a.notes}</p> : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-100 text-green-700">Confirmé</Badge>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => void removeAppointment(a)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-brand-purple">Ajouter un rendez-vous</DialogTitle>
              <DialogDescription>Ce RDV sera visible côté client dans "Prochains rendez-vous"</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Titre *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Heure *</Label>
                  <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Lieu</Label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                Annuler
              </Button>
              <Button className="bg-brand-turquoise hover:bg-brand-turquoise-hover" onClick={() => void addAppointment()}>
                Ajouter
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
