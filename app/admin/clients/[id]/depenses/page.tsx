'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { addDocument, deleteDocument, getDocuments } from '@/lib/db';
import { ArrowLeft, Euro, Loader2, Plus, Receipt, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';

type Expense = {
  id: string;
  planner_id: string;
  client_id: string;
  event_id: string;
  title: string;
  amount: number;
  date: string;
  category?: string;
  notes?: string;
  status: 'pending' | 'paid';
  created_at?: any;
};

export default function ClientDepensesAdminPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [eventId, setEventId] = useState<string | null>(null);

  const [expenses, setExpenses] = useState<Expense[]>([]);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    amount: '',
    date: '',
    category: '',
    status: 'pending' as 'pending' | 'paid',
    notes: '',
  });

  const fetchAll = async () => {
    if (!user?.uid || !clientId) return;
    try {
      setLoading(true);

      const events = await getDocuments('events', [{ field: 'client_id', operator: '==', value: clientId }]);
      const ev = ((events as any[]) || []).find((x) => Boolean(x?.event_date)) || (events?.[0] as any) || null;
      const evId = ev?.id || null;
      setEventId(evId);

      const filters: any[] = [{ field: 'client_id', operator: '==', value: clientId }];
      filters.push({ field: 'planner_id', operator: '==', value: user.uid });

      const data = await getDocuments('expenses', filters).catch(() => []);
      const mapped = (data as any[]).map((d: any) => ({
        id: d.id,
        planner_id: d.planner_id,
        client_id: d.client_id,
        event_id: d.event_id || '',
        title: d.title || 'Dépense',
        amount: Number(d.amount || 0),
        date: d.date || '',
        category: d.category || '',
        notes: d.notes || '',
        status: (d.status === 'paid' ? 'paid' : 'pending') as 'pending' | 'paid',
        created_at: d.created_at || null,
      })) as Expense[];

      const parseCreatedAt = (v: any) => {
        if (!v) return 0;
        const dt = v?.toDate?.() || new Date(v);
        return Number.isNaN(dt.getTime()) ? 0 : dt.getTime();
      };

      mapped.sort((a, b) => parseCreatedAt(b.created_at) - parseCreatedAt(a.created_at));
      setExpenses(mapped);
    } catch (e) {
      console.error('Error fetching client expenses:', e);
      toast.error('Erreur lors du chargement des dépenses');
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, clientId]);

  const totals = useMemo(() => {
    const total = expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const paid = expenses.filter((e) => e.status === 'paid').reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const pending = Math.max(0, total - paid);
    return { total, paid, pending };
  }, [expenses]);

  const addExpense = async () => {
    if (!user?.uid) return;
    if (!form.title.trim()) {
      toast.error('Titre obligatoire');
      return;
    }
    const amount = Number(String(form.amount || '').replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Montant invalide');
      return;
    }
    if (!form.date) {
      toast.error('Date obligatoire');
      return;
    }

    try {
      const created = await addDocument('expenses', {
        planner_id: user.uid,
        client_id: clientId,
        event_id: eventId || '',
        title: form.title.trim(),
        amount,
        date: form.date,
        category: form.category.trim(),
        status: form.status,
        notes: form.notes.trim(),
        created_at: new Date(),
      });

      setExpenses((prev) => [{ ...(created as any) }, ...prev] as Expense[]);
      setIsAddOpen(false);
      setForm({ title: '', amount: '', date: '', category: '', status: 'pending', notes: '' });
      toast.success('Dépense ajoutée');
    } catch (e) {
      console.error('Error adding expense:', e);
      toast.error("Impossible d'ajouter la dépense");
    }
  };

  const removeExpense = async (exp: Expense) => {
    if (!exp?.id) return;
    if (!confirm('Supprimer cette dépense ?')) return;
    try {
      await deleteDocument('expenses', exp.id);
      setExpenses((prev) => prev.filter((x) => x.id !== exp.id));
      toast.success('Dépense supprimée');
    } catch (e) {
      console.error('Error deleting expense:', e);
      toast.error('Impossible de supprimer la dépense');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-purple mb-1 sm:mb-2">Dépenses</h1>
            <p className="text-sm sm:text-base text-brand-gray">Gérez les dépenses liées à ce client</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.back()} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Button>
            <Button className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2" onClick={() => setIsAddOpen(true)}>
              <Plus className="h-4 w-4" />
              Ajouter
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-brand-beige to-white">
            <p className="text-sm text-brand-gray uppercase tracking-label mb-1">Total</p>
            <p className="text-3xl font-bold text-brand-purple">{totals.total.toLocaleString('fr-FR')} €</p>
          </Card>
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-green-50 to-white">
            <p className="text-sm text-brand-gray uppercase tracking-label mb-1">Payées</p>
            <p className="text-3xl font-bold text-brand-purple">{totals.paid.toLocaleString('fr-FR')} €</p>
          </Card>
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-blue-50 to-white">
            <p className="text-sm text-brand-gray uppercase tracking-label mb-1">En attente</p>
            <p className="text-3xl font-bold text-brand-purple">{totals.pending.toLocaleString('fr-FR')} €</p>
          </Card>
        </div>

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
                <h2 className="text-xl font-bold text-brand-purple">Liste</h2>
                <p className="text-sm text-brand-gray">{expenses.length} dépense(s)</p>
              </div>
            </div>

            {expenses.length === 0 ? (
              <div className="text-center py-10 text-brand-gray">Aucune dépense</div>
            ) : (
              <div className="space-y-3">
                {expenses.map((e) => (
                  <div key={e.id} className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-medium text-brand-purple truncate flex items-center gap-2">
                          <Receipt className="h-4 w-4 text-brand-gray" />
                          {e.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-brand-gray">
                          <span className="inline-flex items-center gap-1">
                            <Euro className="h-4 w-4" />
                            {Number(e.amount || 0).toLocaleString('fr-FR')} €
                          </span>
                          {e.date ? <span>{e.date}</span> : null}
                          {e.category ? <span>• {e.category}</span> : null}
                        </div>
                        {e.notes ? <p className="text-sm text-brand-gray mt-2">{e.notes}</p> : null}
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge className={e.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}>
                          {e.status === 'paid' ? 'Payée' : 'En attente'}
                        </Badge>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => void removeExpense(e)}>
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
              <DialogTitle className="text-brand-purple">Ajouter une dépense</DialogTitle>
              <DialogDescription>Cette dépense sera comptabilisée dans le dashboard.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titre *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(ev) => setForm((p) => ({ ...p, title: ev.target.value }))}
                  placeholder="Ex: Fleuriste, location..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Montant *</Label>
                  <Input
                    id="amount"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="1"
                    value={form.amount}
                    onChange={(ev) => setForm((p) => ({ ...p, amount: ev.target.value }))}
                    placeholder="Ex: 450"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={form.date}
                    onChange={(ev) => setForm((p) => ({ ...p, date: ev.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Catégorie</Label>
                <Input
                  id="category"
                  value={form.category}
                  onChange={(ev) => setForm((p) => ({ ...p, category: ev.target.value }))}
                  placeholder="Ex: décoration"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={form.status === 'pending' ? 'default' : 'outline'}
                  className={form.status === 'pending' ? 'bg-brand-turquoise hover:bg-brand-turquoise-hover' : ''}
                  onClick={() => setForm((p) => ({ ...p, status: 'pending' }))}
                >
                  En attente
                </Button>
                <Button
                  type="button"
                  variant={form.status === 'paid' ? 'default' : 'outline'}
                  className={form.status === 'paid' ? 'bg-green-600 hover:bg-green-700' : ''}
                  onClick={() => setForm((p) => ({ ...p, status: 'paid' }))}
                >
                  Payée
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(ev) => setForm((p) => ({ ...p, notes: ev.target.value }))}
                  placeholder="Détails..."
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                Annuler
              </Button>
              <Button className="bg-brand-turquoise hover:bg-brand-turquoise-hover" onClick={() => void addExpense()}>
                Ajouter
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
