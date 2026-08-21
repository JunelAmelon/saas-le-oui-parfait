'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { addDocument, deleteDocument, getDocuments, updateDocument, getDocument } from '@/lib/db';
import { toast } from 'sonner';

interface Vendor {
  id: string;
  name: string;
  category?: string;
  logoUrl?: string | null;
  pro_account_uid?: string;
}

interface VendorBooking {
  id: string;
  vendor_id: string;
  vendor_uid?: string;
  planner_id: string;
  client_id: string;
  client_names: string;
  wedding_date: string;
  status: string;
}

interface VendorPayment {
  id: string;
  booking_id: string;
  vendor_id: string;
  vendor_uid?: string;
  client_id: string;
  planner_id: string;
  label: string;
  amount: number;
  type: 'acompte' | 'intermediaire' | 'solde';
  due_date: string;
  status: 'scheduled' | 'paid' | 'late';
  paid_date?: string;
  method?: string;
  proof_url?: string;
  declared_by?: string;
  created_at?: any;
}

export default function ClientAcomptesProPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [bookings, setBookings] = useState<VendorBooking[]>([]);
  const [payments, setPayments] = useState<VendorPayment[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');

  // Add payment dialog
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    label: '',
    amount: '',
    type: 'acompte' as 'acompte' | 'intermediaire' | 'solde',
    due_date: new Date().toISOString().split('T')[0],
  });

  const fetchData = async () => {
    if (!user?.uid || !clientId) return;
    setLoading(true);
    try {
      // Fetch vendor bookings for this client
      const bks = await getDocuments('vendor_bookings', [
        { field: 'planner_id', operator: '==', value: user.uid },
        { field: 'client_id', operator: '==', value: clientId },
      ]);
      const activeBookings = (bks as any[]).filter((b) => b.status !== 'cancelled') as VendorBooking[];
      setBookings(activeBookings);

      // Fetch vendor details
      const vendorIds = Array.from(new Set(activeBookings.map((b) => b.vendor_id)));
      const vendorDetails: Vendor[] = [];
      for (const vid of vendorIds) {
        const v = (await getDocument('vendors', vid)) as any;
        if (v) {
          vendorDetails.push({
            id: v.id,
            name: v.name || 'Prestataire',
            category: v.category,
            logoUrl: v.logo || v.logo_url || v.logoUrl || null,
            pro_account_uid: v.pro_account_uid,
          });
        }
      }
      setVendors(vendorDetails);

      if (vendorDetails.length > 0 && !selectedVendorId) {
        setSelectedVendorId(vendorDetails[0].id);
      }

      // Fetch all payments for this client's bookings
      const allPayments: VendorPayment[] = [];
      for (const bk of activeBookings) {
        const pmts = await getDocuments('vendor_payments', [
          { field: 'booking_id', operator: '==', value: bk.id },
        ]);
        (pmts as any[]).forEach((p) => allPayments.push(p as VendorPayment));
      }
      allPayments.sort((a, b) => String(a.due_date || '').localeCompare(String(b.due_date || '')));
      setPayments(allPayments);
    } catch (e) {
      console.error('Error fetching acomptes data:', e);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, clientId]);

  const selectedBooking = useMemo(() => {
    return bookings.find((b) => b.vendor_id === selectedVendorId) || null;
  }, [bookings, selectedVendorId]);

  const selectedPayments = useMemo(() => {
    if (!selectedBooking) return [];
    return payments.filter((p) => p.booking_id === selectedBooking.id);
  }, [payments, selectedBooking]);

  const totalPaid = selectedPayments.filter((p) => p.status === 'paid').reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalScheduled = selectedPayments.filter((p) => p.status === 'scheduled').reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalLate = selectedPayments.filter((p) => p.status === 'late').reduce((s, p) => s + Number(p.amount || 0), 0);

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !selectedBooking) return;
    if (!form.label || !form.amount || !form.due_date) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setSaving(true);
    try {
      const data: any = {
        booking_id: selectedBooking.id,
        vendor_id: selectedBooking.vendor_id,
        vendor_uid: selectedBooking.vendor_uid || null,
        client_id: clientId,
        planner_id: user.uid,
        label: form.label,
        amount: Number(form.amount) || 0,
        type: form.type,
        due_date: form.due_date,
        status: 'scheduled',
        declared_by: user.uid,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = await addDocument('vendor_payments', data);
      setPayments((prev) => [...prev, { id: result.id, ...data } as VendorPayment]);
      toast.success('Échéance ajoutée');
      setAddOpen(false);
      setForm({ label: '', amount: '', type: 'acompte', due_date: new Date().toISOString().split('T')[0] });
    } catch (err: any) {
      console.error('Error adding payment:', err);
      toast.error(err?.message || 'Erreur lors de l\'ajout');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaid = async (paymentId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const method = prompt('Méthode de paiement ? (ex: virement, chèque, espèces)', 'virement');
    if (method === null) return;

    setPayments((prev) =>
      prev.map((p) => (p.id === paymentId ? { ...p, status: 'paid', paid_date: today, method } : p))
    );
    try {
      await updateDocument('vendor_payments', paymentId, {
        status: 'paid',
        paid_date: today,
        method,
        updated_at: new Date().toISOString(),
      });
      toast.success('Acompte marqué comme payé');
    } catch (e) {
      console.error('Error marking paid:', e);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleMarkScheduled = async (paymentId: string) => {
    setPayments((prev) =>
      prev.map((p) => (p.id === paymentId ? { ...p, status: 'scheduled', paid_date: '', method: '' } : p))
    );
    try {
      await updateDocument('vendor_payments', paymentId, {
        status: 'scheduled',
        paid_date: '',
        method: '',
        updated_at: new Date().toISOString(),
      });
      toast.success('Échéance remise en attente');
    } catch (e) {
      console.error('Error updating payment:', e);
      toast.error('Erreur');
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm('Supprimer cette échéance ?')) return;
    try {
      await deleteDocument('vendor_payments', paymentId);
      setPayments((prev) => prev.filter((p) => p.id !== paymentId));
      toast.success('Échéance supprimée');
    } catch (e) {
      console.error('Error deleting payment:', e);
      toast.error('Erreur lors de la suppression');
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
          title="Acomptes Prestataires"
          description="Gérez les échéanciers et acomptes versés aux prestataires"
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
        ) : vendors.length === 0 ? (
          <Card className="p-12 shadow-xl border-0 text-center">
            <CreditCard className="h-12 w-12 text-brand-gray mx-auto mb-4" />
            <h3 className="text-lg font-bold text-brand-purple mb-2">Aucun prestataire assigné</h3>
            <p className="text-sm text-brand-gray">
              Assignez d&apos;abord des prestataires à ce client pour gérer les acomptes.
            </p>
          </Card>
        ) : (
          <>
            {/* Vendor selector */}
            <Card className="p-6 shadow-xl border-0">
              <Label>Prestataire</Label>
              <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sélectionner un prestataire" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id} textValue={v.name}>
                      <div className="flex items-center gap-2">
                        {v.logoUrl ? (
                          <img src={v.logoUrl} alt="" className="h-5 w-5 rounded-full object-cover" />
                        ) : (
                          <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px]">
                            {v.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {v.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Card>

            {selectedBooking && (
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
                <Card className="p-6 shadow-xl border-0">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-bold text-brand-purple flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-brand-turquoise" />
                      Échéancier
                    </h3>
                    <Button
                      className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2"
                      onClick={() => setAddOpen(true)}
                    >
                      <Plus className="h-4 w-4" />
                      Ajouter une échéance
                    </Button>
                  </div>

                  {selectedPayments.length === 0 ? (
                    <div className="text-center py-10">
                      <Euro className="h-10 w-10 text-brand-gray mx-auto mb-3 opacity-40" />
                      <p className="text-sm text-brand-gray">Aucune échéance définie.</p>
                      <p className="text-xs text-brand-gray mt-1">
                        Créez l&apos;échéancier des acomptes pour ce prestataire.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedPayments.map((p) => {
                        const isPaid = p.status === 'paid';
                        const isLate = p.status === 'late';
                        return (
                          <div
                            key={p.id}
                            className="flex items-center gap-4 p-4 rounded-lg bg-gray-50"
                          >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                              isPaid ? 'bg-green-100' : isLate ? 'bg-red-100' : 'bg-orange-100'
                            }`}>
                              {isPaid ? (
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                              ) : isLate ? (
                                <XCircle className="w-5 h-5 text-red-600" />
                              ) : (
                                <Clock className="w-5 h-5 text-orange-600" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-brand-purple">{p.label}</span>
                                <Badge variant="outline" className="text-xs">{p.type}</Badge>
                              </div>
                              <div className="text-xs text-brand-gray mt-0.5">
                                Échéance : {formatDate(p.due_date)}
                                {isPaid && p.paid_date ? ` · Payé le ${formatDate(p.paid_date)}` : ''}
                                {p.method ? ` · ${p.method}` : ''}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-bold text-brand-purple">
                                {Number(p.amount || 0).toLocaleString('fr-FR')} €
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {isPaid ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMarkScheduled(p.id)}
                                  title="Remettre en attente"
                                >
                                  <Clock className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-green-600 hover:bg-green-50"
                                  onClick={() => handleMarkPaid(p.id)}
                                  title="Marquer comme payé"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:bg-red-50"
                                onClick={() => handleDeletePayment(p.id)}
                                title="Supprimer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </>
            )}
          </>
        )}
      </div>

      {/* Add payment dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-brand-purple">Ajouter une échéance</DialogTitle>
            <DialogDescription>
              Définissez un acompte ou solde pour {vendors.find((v) => v.id === selectedVendorId)?.name || 'le prestataire'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddPayment} className="space-y-4 py-2">
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
    </DashboardLayout>
  );
}
