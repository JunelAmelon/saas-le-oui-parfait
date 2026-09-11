'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Loader2,
  CreditCard,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  Euro,
  Calendar,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { addDocument, deleteDocument, getDocuments, updateDocument, getDocument } from '@/lib/db';
import { toast } from 'sonner';

interface ClientAcompte {
  id: string;
  client_id: string;
  planner_id: string;
  label: string;
  amount: number;
  type: 'acompte' | 'intermediaire' | 'solde';
  due_date: string;
  status: 'scheduled' | 'paid' | 'late';
  paid_date?: string;
  method?: string;
  created_at?: any;
}

export default function ClientAcomptesPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState('');
  const [acomptes, setAcomptes] = useState<ClientAcompte[]>([]);

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    label: '',
    amount: '',
    type: 'acompte' as 'acompte' | 'intermediaire' | 'solde',
    due_date: new Date().toISOString().split('T')[0],
  });

  // Mark paid dialog
  const [paidOpen, setPaidOpen] = useState(false);
  const [paidMethod, setPaidMethod] = useState('virement');
  const [paidCustomMethod, setPaidCustomMethod] = useState('');
  const [paidAcompteId, setPaidAcompteId] = useState<string | null>(null);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [deletingAcompteId, setDeletingAcompteId] = useState<string | null>(null);

  const fetchData = async () => {
    if (!user?.uid || !clientId) return;
    setLoading(true);
    try {
      // Fetch client name
      const clientDoc = (await getDocument('clients', clientId)) as any;
      if (clientDoc) {
        const names = clientDoc.partner
          ? `${clientDoc.name} & ${clientDoc.partner}`
          : clientDoc.name || 'Client';
        setClientName(names);
      }

      // Fetch client acomptes
      const items = await getDocuments('client_acomptes', [
        { field: 'planner_id', operator: '==', value: user.uid },
        { field: 'client_id', operator: '==', value: clientId },
      ]);
      const sorted = (items as any[])
        .sort((a, b) => String(a.due_date || '').localeCompare(String(b.due_date || '')));
      setAcomptes(sorted as ClientAcompte[]);
    } catch (e) {
      console.error('Error fetching acomptes client:', e);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, clientId]);

  const totalPaid = acomptes.filter((a) => a.status === 'paid').reduce((s, a) => s + Number(a.amount || 0), 0);
  const totalScheduled = acomptes.filter((a) => a.status === 'scheduled').reduce((s, a) => s + Number(a.amount || 0), 0);
  const totalLate = acomptes.filter((a) => a.status === 'late').reduce((s, a) => s + Number(a.amount || 0), 0);

  const handleAddAcompte = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    if (!form.label || !form.amount || !form.due_date) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setSaving(true);
    try {
      const data: any = {
        client_id: clientId,
        planner_id: user.uid,
        label: form.label,
        amount: Number(form.amount) || 0,
        type: form.type,
        due_date: form.due_date,
        status: 'scheduled',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = await addDocument('client_acomptes', data);
      setAcomptes((prev) => [...prev, { id: result.id, ...data } as ClientAcompte]);
      toast.success('Échéance ajoutée');
      setAddOpen(false);
      setForm({ label: '', amount: '', type: 'acompte', due_date: new Date().toISOString().split('T')[0] });
    } catch (err: any) {
      console.error('Error adding acompte:', err);
      toast.error(err?.message || 'Erreur lors de l\'ajout');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaid = (acompteId: string) => {
    setPaidAcompteId(acompteId);
    setPaidMethod('virement');
    setPaidCustomMethod('');
    setPaidOpen(true);
  };

  const confirmMarkPaid = async () => {
    if (!paidAcompteId) return;
    const method = paidMethod === 'autre' ? paidCustomMethod.trim() : paidMethod;
    if (!method) {
      toast.error('Veuillez renseigner la méthode de paiement');
      return;
    }
    const acompteId = paidAcompteId;
    const today = new Date().toISOString().split('T')[0];

    setMarkingPaid(true);
    setAcomptes((prev) =>
      prev.map((a) => (a.id === acompteId ? { ...a, status: 'paid', paid_date: today, method } : a))
    );
    try {
      await updateDocument('client_acomptes', acompteId, {
        status: 'paid',
        paid_date: today,
        method,
        updated_at: new Date().toISOString(),
      });
      toast.success('Acompte marqué comme payé');

      // Notify the client
      try {
        const clientDoc = (await getDocument('clients', clientId)) as any;
        const clientUserId = clientDoc?.client_user_id || null;
        const coupleNames = clientDoc
          ? `${clientDoc.name || ''}${clientDoc.name && clientDoc.partner ? ' & ' : ''}${clientDoc.partner || ''}`.trim()
          : '';
        const acompte = acomptes.find((a) => a.id === acompteId);

        if (clientUserId) {
          await addDocument('notifications', {
            recipient_id: clientUserId,
            type: 'client_acompte',
            title: 'Acompte confirmé',
            message: `Votre acompte "${acompte?.label || ''}" a été marqué comme payé (${method}).`,
            link: '/espace-client/paiements',
            read: false,
            created_at: new Date(),
            client_id: clientId,
          });

          try {
            const { sendEmailToUid } = await import('@/lib/email');
            await sendEmailToUid({
              recipientUid: clientUserId,
              subject: 'Acompte confirmé - Le Oui Parfait',
              text: `Bonjour${coupleNames ? ` ${coupleNames}` : ''},\n\nVotre acompte a été confirmé par votre wedding planner :\n\nLibellé : ${acompte?.label || ''}\nMéthode : ${method}\n\nRetrouvez le détail sur votre espace client, page Paiements.\n\nLe Oui Parfait`,
            });
          } catch (e) {
            console.warn('Unable to send client email:', e);
          }

          try {
            const { sendPushToRecipient } = await import('@/lib/push');
            await sendPushToRecipient({
              recipientId: clientUserId,
              title: 'Acompte confirmé',
              body: `${acompte?.label || 'Acompte'} a été reçu (${method}).`,
              link: '/espace-client/paiements',
            });
          } catch (e) {
            console.warn('Unable to send client push:', e);
          }
        }
      } catch (e) {
        console.warn('Unable to notify client:', e);
      }

      setPaidOpen(false);
      setPaidAcompteId(null);
    } catch (e) {
      console.error('Error marking paid:', e);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setMarkingPaid(false);
    }
  };

  const handleMarkScheduled = async (acompteId: string) => {
    setAcomptes((prev) =>
      prev.map((a) => (a.id === acompteId ? { ...a, status: 'scheduled', paid_date: '', method: '' } : a))
    );
    try {
      await updateDocument('client_acomptes', acompteId, {
        status: 'scheduled',
        paid_date: '',
        method: '',
        updated_at: new Date().toISOString(),
      });
      toast.success('Échéance remise en attente');
    } catch (e) {
      console.error('Error updating acompte:', e);
      toast.error('Erreur');
    }
  };

  const handleDeleteAcompte = async (acompteId: string) => {
    if (!confirm('Supprimer cette échéance ?')) return;
    setDeletingAcompteId(acompteId);
    try {
      await deleteDocument('client_acomptes', acompteId);
      setAcomptes((prev) => prev.filter((a) => a.id !== acompteId));
      toast.success('Échéance supprimée');
    } catch (e) {
      console.error('Error deleting acompte:', e);
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeletingAcompteId(null);
    }
  };

  const formatDate = (d: string) => {
    if (!d) return '—';
    return d.split('-').reverse().join('/');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Acomptes Client"
          description={`Échéancier des paiements de ${clientName || 'votre client'}`}
        >
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="w-full sm:w-auto gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
        </PageHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-brand-turquoise" />
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="p-5 shadow-lg border-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-sm font-semibold text-brand-purple">Payé</span>
                </div>
                <div className="text-2xl font-bold text-brand-purple">{totalPaid.toLocaleString('fr-FR')} €</div>
              </Card>
              <Card className="p-5 shadow-lg border-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-orange-600" />
                  </div>
                  <span className="text-sm font-semibold text-brand-purple">À venir</span>
                </div>
                <div className="text-2xl font-bold text-brand-purple">{totalScheduled.toLocaleString('fr-FR')} €</div>
              </Card>
              <Card className="p-5 shadow-lg border-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center">
                    <XCircle className="w-4 h-4 text-red-600" />
                  </div>
                  <span className="text-sm font-semibold text-brand-purple">En retard</span>
                </div>
                <div className="text-2xl font-bold text-brand-purple">{totalLate.toLocaleString('fr-FR')} €</div>
              </Card>
            </div>

            {/* Echeancier */}
            <div className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(75,68,86,0.06)]">
                <h3 className="text-[15px] font-semibold text-[#4B4456] flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-[#88b7b5]" />
                  Échéancier client
                </h3>
                <Button
                  className="bg-[#88b7b5] hover:bg-[#7aa9a7] gap-2 rounded-full"
                  size="sm"
                  onClick={() => setAddOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  Ajouter une échéance
                </Button>
              </div>

              {acomptes.length === 0 ? (
                <div className="text-center py-12">
                  <Euro className="h-10 w-10 text-[#9C97A3] mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-[#9C97A3]">Aucune échéance définie.</p>
                  <p className="text-xs text-[#9C97A3] mt-1">
                    Créez l&apos;échéancier des acomptes que le client doit régler.
                  </p>
                </div>
              ) : (
                <div>
                  {/* Table header (desktop) */}
                  <div className="hidden sm:grid grid-cols-[1fr_140px_140px_120px_110px_90px] items-center gap-4 px-5 py-3 border-b border-[rgba(75,68,86,0.06)] bg-[#FAF9F7]">
                    <span className="text-[11px] font-semibold text-[#9C97A3] uppercase tracking-wide">Libellé</span>
                    <span className="text-[11px] font-semibold text-[#9C97A3] uppercase tracking-wide">Échéance</span>
                    <span className="text-[11px] font-semibold text-[#9C97A3] uppercase tracking-wide">Paiement</span>
                    <span className="text-[11px] font-semibold text-[#9C97A3] uppercase tracking-wide text-right">Montant</span>
                    <span className="text-[11px] font-semibold text-[#9C97A3] uppercase tracking-wide text-center">Statut</span>
                    <span className="text-[11px] font-semibold text-[#9C97A3] uppercase tracking-wide text-right">Actions</span>
                  </div>
                  {/* Table rows */}
                  <div className="divide-y divide-[rgba(75,68,86,0.04)]">
                    {acomptes.map((a) => {
                      const isPaid = a.status === 'paid';
                      const isLate = a.status === 'late';
                      const typeLabel = a.type === 'acompte' ? 'Acompte' : a.type === 'intermediaire' ? 'Intermédiaire' : 'Solde';
                      return (
                        <div
                          key={a.id}
                          className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_140px_140px_120px_110px_90px] items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 hover:bg-[rgba(136,183,181,0.04)] transition-colors"
                        >
                          {/* Libellé */}
                          <div className="min-w-0">
                            <div className="text-[13px] font-semibold text-[#4B4456] truncate">
                              {a.label}
                            </div>
                            <div className="text-[11px] text-[#9C97A3] mt-0.5 flex items-center gap-1.5">
                              <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                                a.type === 'acompte' ? 'bg-[#88b7b5]' : a.type === 'intermediaire' ? 'bg-[#C9A96E]' : 'bg-[#4B4456]'
                              }`} />
                              {typeLabel}
                              {a.method ? ` · ${a.method}` : ''}
                            </div>
                          </div>
                          {/* Échéance (desktop) */}
                          <div className="hidden sm:flex items-center gap-1.5 text-[12px] text-[#9C97A3]">
                            <Calendar className="w-3 h-3 shrink-0" />
                            <span className="truncate">{formatDate(a.due_date)}</span>
                          </div>
                          {/* Paiement (desktop) */}
                          <div className="hidden sm:block text-[12px] text-[#9C97A3]">
                            {isPaid && a.paid_date ? (
                              <span className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3 h-3 text-[#88b7b5]" />
                                {formatDate(a.paid_date)}
                              </span>
                            ) : '—'}
                          </div>
                          {/* Montant (desktop) */}
                          <div className="hidden sm:block text-[13px] font-bold text-[#4B4456] text-right">
                            {Number(a.amount || 0).toLocaleString('fr-FR')} €
                          </div>
                          {/* Statut (desktop) */}
                          <div className="hidden sm:flex items-center justify-center">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#88b7b5] bg-[rgba(136,183,181,0.12)] px-2.5 py-1.5 rounded-full whitespace-nowrap">
                                <CheckCircle2 className="w-3 h-3" />
                                Payé
                              </span>
                            ) : isLate ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#B9847F] bg-[rgba(185,132,127,0.12)] px-2.5 py-1.5 rounded-full whitespace-nowrap">
                                <XCircle className="w-3 h-3" />
                                Retard
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#C9A96E] bg-[rgba(201,169,110,0.12)] px-2.5 py-1.5 rounded-full whitespace-nowrap">
                                <Clock className="w-3 h-3" />
                                À venir
                              </span>
                            )}
                          </div>
                          {/* Actions (desktop) */}
                          <div className="hidden sm:flex items-center justify-end gap-1">
                            {isPaid ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full"
                                onClick={() => handleMarkScheduled(a.id)}
                                title="Remettre en attente"
                              >
                                <Clock className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full text-[#88b7b5] hover:bg-[rgba(136,183,181,0.1)]"
                                onClick={() => handleMarkPaid(a.id)}
                                title="Marquer comme payé"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full text-[#B9847F] hover:bg-[rgba(185,132,127,0.1)]"
                              onClick={() => handleDeleteAcompte(a.id)}
                              title="Supprimer"
                              disabled={deletingAcompteId === a.id}
                            >
                              {deletingAcompteId === a.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          {/* Mobile: montant + statut + actions combined */}
                          <div className="flex sm:hidden flex-col items-end gap-1.5">
                            <span className="text-[13px] font-bold text-[#4B4456]">{Number(a.amount || 0).toLocaleString('fr-FR')} €</span>
                            {isPaid ? (
                              <span className="text-[10px] font-semibold text-[#88b7b5]">Payé le {formatDate(a.paid_date || '')}</span>
                            ) : isLate ? (
                              <span className="text-[10px] font-semibold text-[#B9847F]">En retard</span>
                            ) : (
                              <span className="text-[10px] font-semibold text-[#C9A96E]">Éch. {formatDate(a.due_date)}</span>
                            )}
                            <div className="flex items-center gap-1">
                              {!isPaid && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 rounded-full text-[#88b7b5]"
                                  onClick={() => handleMarkPaid(a.id)}
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-full text-[#B9847F]"
                                onClick={() => handleDeleteAcompte(a.id)}
                                disabled={deletingAcompteId === a.id}
                              >
                                {deletingAcompteId === a.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Add acompte dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-brand-purple">Ajouter une échéance</DialogTitle>
            <DialogDescription>
              Définissez un acompte ou solde que le client devra régler
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddAcompte} className="space-y-4 py-2">
            <div>
              <Label>Libellé *</Label>
              <Input
                placeholder="Ex: Acompte à la signature"
                className="mt-1"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as any })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="acompte">Acompte</SelectItem>
                  <SelectItem value="intermediaire">Intermédiaire</SelectItem>
                  <SelectItem value="solde">Solde</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Montant (€) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="500"
                  className="mt-1"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Échéance *</Label>
                <Input
                  type="date"
                  className="mt-1"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Annuler
              </Button>
              <Button
                type="submit"
                className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2"
                disabled={saving}
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Ajouter
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Mark paid dialog */}
      <Dialog open={paidOpen} onOpenChange={setPaidOpen}>
        <DialogContent className="sm:max-w-[460px] w-[95vw] rounded-[20px]">
          <DialogHeader className="pb-2">
            <div className="w-12 h-12 rounded-full bg-[rgba(136,183,181,0.12)] flex items-center justify-center mb-3">
              <CheckCircle2 className="h-6 w-6 text-[#88b7b5]" />
            </div>
            <DialogTitle className="text-[18px] font-baskerville text-[#4B4456]">
              Marquer comme payé
            </DialogTitle>
            <DialogDescription className="text-[13px] text-[#9C97A3]">
              Renseignez la méthode de paiement utilisée.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-[12px] font-semibold text-[#4B4456]">Méthode de paiement</Label>
              <Select value={paidMethod} onValueChange={(v) => { setPaidMethod(v); if (v !== 'autre') setPaidCustomMethod(''); }}>
                <SelectTrigger className="mt-1.5 rounded-xl border-[rgba(75,68,86,0.1)] h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="virement">Virement</SelectItem>
                  <SelectItem value="chèque">Chèque</SelectItem>
                  <SelectItem value="espèces">Espèces</SelectItem>
                  <SelectItem value="cb">Carte bancaire</SelectItem>
                  <SelectItem value="autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {paidMethod === 'autre' && (
              <div>
                <Label className="text-[12px] font-semibold text-[#4B4456]">Précisez</Label>
                <Input
                  className="mt-1.5 rounded-xl border-[rgba(75,68,86,0.1)] h-10"
                  value={paidCustomMethod}
                  onChange={(e) => setPaidCustomMethod(e.target.value)}
                  placeholder="Ex: PayPal, Lydia..."
                  autoFocus
                />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setPaidOpen(false); setPaidAcompteId(null); }}
              disabled={markingPaid}
              className="rounded-full"
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={confirmMarkPaid}
              disabled={markingPaid || (paidMethod === 'autre' && !paidCustomMethod.trim())}
              className="bg-[#88b7b5] hover:bg-[#7aa9a7] gap-2 rounded-full"
            >
              {markingPaid && <Loader2 className="h-4 w-4 animate-spin" />}
              <CheckCircle2 className="h-4 w-4" />
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
