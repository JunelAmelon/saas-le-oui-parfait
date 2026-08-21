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
  Calendar,
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
  vendor_name?: string;
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
  vendor_name?: string;
  vendor_logo?: string | null;
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

  // Mark paid dialog
  const [paidOpen, setPaidOpen] = useState(false);
  const [paidMethod, setPaidMethod] = useState('virement');
  const [paidCustomMethod, setPaidCustomMethod] = useState('');
  const [paidPaymentId, setPaidPaymentId] = useState<string | null>(null);
  const [markingPaid, setMarkingPaid] = useState(false);

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
      // Fetch vendor name + logo for display on client side
      let vendorName = '';
      let vendorLogo: string | null = null;
      try {
        const vendorDoc = (await getDocument('vendors', selectedBooking.vendor_id)) as any;
        vendorName = vendorDoc?.name || '';
        vendorLogo = vendorDoc?.logo || vendorDoc?.logo_url || vendorDoc?.logoUrl || null;
      } catch {
        // non-blocking
      }

      const data: any = {
        booking_id: selectedBooking.id,
        vendor_id: selectedBooking.vendor_id,
        vendor_uid: selectedBooking.vendor_uid || null,
        vendor_name: vendorName || selectedBooking.vendor_name || '',
        vendor_logo: vendorLogo,
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

  const handleMarkPaid = (paymentId: string) => {
    setPaidPaymentId(paymentId);
    setPaidMethod('virement');
    setPaidCustomMethod('');
    setPaidOpen(true);
  };

  const confirmMarkPaid = async () => {
    if (!paidPaymentId) return;
    const method = paidMethod === 'autre' ? paidCustomMethod.trim() : paidMethod;
    if (!method) {
      toast.error('Veuillez renseigner la méthode de paiement');
      return;
    }
    const paymentId = paidPaymentId;
    const today = new Date().toISOString().split('T')[0];

    const payment = payments.find((p) => p.id === paymentId);
    const booking = bookings.find((b) => b.id === payment?.booking_id);

    setMarkingPaid(true);
    setPayments((prev) =>
      prev.map((p) => (p.id === paymentId ? { ...p, status: 'paid', paid_date: today, method } : p))
    );
    try {
      // Backfill vendor_name and vendor_logo if missing
      const updateData: any = {
        status: 'paid',
        paid_date: today,
        method,
        updated_at: new Date().toISOString(),
      };

      if (payment && (!payment.vendor_name || !('vendor_logo' in payment))) {
        try {
          const vendorDoc = (await getDocument('vendors', payment.vendor_id)) as any;
          if (vendorDoc) {
            if (!payment.vendor_name) updateData.vendor_name = vendorDoc.name || '';
            if (!('vendor_logo' in payment)) updateData.vendor_logo = vendorDoc.logo || vendorDoc.logo_url || vendorDoc.logoUrl || null;
          }
        } catch {
          // non-blocking
        }
      }

      await updateDocument('vendor_payments', paymentId, updateData);
      toast.success('Acompte marqué comme payé');

      // Notify the vendor
      if (payment?.vendor_uid) {
        try {
          await addDocument('notifications', {
            recipient_id: payment.vendor_uid,
            type: 'payment',
            title: 'Acompte reçu',
            message: `${payment.label} de ${Number(payment.amount || 0).toLocaleString('fr-FR')} € pour ${booking?.client_names || 'le mariage'} a été marqué comme payé (${method}).`,
            link: booking ? `/espace-pro/mariages/${booking.id}` : '/espace-pro',
            read: false,
            created_at: new Date(),
          });
        } catch {
          // non-blocking
        }

        // Send email to vendor
        try {
          const { sendEmailToUid } = await import('@/lib/email');
          await sendEmailToUid({
            recipientUid: payment.vendor_uid,
            subject: 'Acompte reçu - Le Oui Parfait',
            text: `Bonjour,\n\nUn acompte a été marqué comme reçu pour vous :\n\nLibellé : ${payment.label}\nMontant : ${Number(payment.amount || 0).toLocaleString('fr-FR')} €\nMéthode : ${method}\nMariage : ${booking?.client_names || 'N/A'}\n\nRetrouvez le détail sur votre espace pro.\n\nLe Oui Parfait`,
          });
        } catch (e) {
          console.warn('Unable to send vendor email:', e);
        }

        // Send push
        try {
          const { sendPushToRecipient } = await import('@/lib/push');
          await sendPushToRecipient({
            recipientId: payment.vendor_uid,
            title: 'Acompte reçu',
            body: `${payment.label} de ${Number(payment.amount || 0).toLocaleString('fr-FR')} € a été reçu.`,
            link: booking ? `/espace-pro/mariages/${booking.id}` : '/espace-pro',
          });
        } catch (e) {
          console.warn('Unable to send vendor push:', e);
        }
      }

      // Notify the couple
      try {
        if (!payment) throw new Error('Payment not found');
        const clientDoc = (await getDocument('clients', payment.client_id)) as any;
        const clientUserId = clientDoc?.client_user_id || null;
        const coupleNames = clientDoc
          ? `${clientDoc.name || ''}${clientDoc.name && clientDoc.partner ? ' & ' : ''}${clientDoc.partner || ''}`.trim()
          : '';

        // Find vendor name
        let vendorName = 'le prestataire';
        try {
          if (payment.vendor_id) {
            const vendorDoc = (await getDocument('vendors', payment.vendor_id)) as any;
            if (vendorDoc?.name) vendorName = vendorDoc.name;
          }
        } catch {
          // non-blocking
        }

        if (clientUserId) {
          await addDocument('notifications', {
            recipient_id: clientUserId,
            type: 'vendor_payment',
            title: 'Acompte prestataire confirmé',
            message: `L'acompte "${payment.label}" de ${Number(payment.amount || 0).toLocaleString('fr-FR')} € pour ${vendorName} a été reçu (${method}).`,
            link: '/espace-client/paiements',
            read: false,
            created_at: new Date(),
            client_id: payment.client_id,
          });

          try {
            const { sendEmailToUid } = await import('@/lib/email');
            await sendEmailToUid({
              recipientUid: clientUserId,
              subject: 'Acompte prestataire confirmé - Le Oui Parfait',
              text: `Bonjour${coupleNames ? ` ${coupleNames}` : ''},\n\nUn acompte prestataire a été confirmé par votre wedding planner :\n\nPrestataire : ${vendorName}\nLibellé : ${payment.label}\nMontant : ${Number(payment.amount || 0).toLocaleString('fr-FR')} €\nMéthode : ${method}\n\nRetrouvez le détail sur votre espace client, page Paiements.\n\nLe Oui Parfait`,
            });
          } catch (e) {
            console.warn('Unable to send client email:', e);
          }

          try {
            const { sendPushToRecipient } = await import('@/lib/push');
            await sendPushToRecipient({
              recipientId: clientUserId,
              title: 'Acompte prestataire confirmé',
              body: `${payment.label} de ${Number(payment.amount || 0).toLocaleString('fr-FR')} € pour ${vendorName} a été reçu.`,
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
      setPaidPaymentId(null);
    } catch (e) {
      console.error('Error marking paid:', e);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setMarkingPaid(false);
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
                <div className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(75,68,86,0.06)]">
                    <h3 className="text-[15px] font-semibold text-[#4B4456] flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-[#88b7b5]" />
                      Échéancier
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

                  {selectedPayments.length === 0 ? (
                    <div className="text-center py-12">
                      <Euro className="h-10 w-10 text-[#9C97A3] mx-auto mb-3 opacity-40" />
                      <p className="text-sm text-[#9C97A3]">Aucune échéance définie.</p>
                      <p className="text-xs text-[#9C97A3] mt-1">
                        Créez l&apos;échéancier des acomptes pour ce prestataire.
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
                        {selectedPayments.map((p) => {
                          const isPaid = p.status === 'paid';
                          const isLate = p.status === 'late';
                          const typeLabel = p.type === 'acompte' ? 'Acompte' : p.type === 'intermediaire' ? 'Intermédiaire' : 'Solde';
                          return (
                            <div
                              key={p.id}
                              className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_140px_140px_120px_110px_90px] items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 hover:bg-[rgba(136,183,181,0.04)] transition-colors"
                            >
                              {/* Libellé */}
                              <div className="min-w-0">
                                <div className="text-[13px] font-semibold text-[#4B4456] truncate">
                                  {p.label}
                                </div>
                                <div className="text-[11px] text-[#9C97A3] mt-0.5 flex items-center gap-1.5">
                                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                                    p.type === 'acompte' ? 'bg-[#88b7b5]' : p.type === 'intermediaire' ? 'bg-[#C9A96E]' : 'bg-[#4B4456]'
                                  }`} />
                                  {typeLabel}
                                  {p.method ? ` · ${p.method}` : ''}
                                </div>
                              </div>
                              {/* Échéance (desktop) */}
                              <div className="hidden sm:flex items-center gap-1.5 text-[12px] text-[#9C97A3]">
                                <Calendar className="w-3 h-3 shrink-0" />
                                <span className="truncate">{formatDate(p.due_date)}</span>
                              </div>
                              {/* Paiement (desktop) */}
                              <div className="hidden sm:block text-[12px] text-[#9C97A3]">
                                {isPaid && p.paid_date ? (
                                  <span className="flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3 h-3 text-[#88b7b5]" />
                                    {formatDate(p.paid_date)}
                                  </span>
                                ) : '—'}
                              </div>
                              {/* Montant (desktop) */}
                              <div className="hidden sm:block text-[13px] font-bold text-[#4B4456] text-right">
                                {Number(p.amount || 0).toLocaleString('fr-FR')} €
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
                                    onClick={() => handleMarkScheduled(p.id)}
                                    title="Remettre en attente"
                                  >
                                    <Clock className="h-4 w-4" />
                                  </Button>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-full text-[#88b7b5] hover:bg-[rgba(136,183,181,0.1)]"
                                    onClick={() => handleMarkPaid(p.id)}
                                    title="Marquer comme payé"
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-full text-[#B9847F] hover:bg-[rgba(185,132,127,0.1)]"
                                  onClick={() => handleDeletePayment(p.id)}
                                  title="Supprimer"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              {/* Mobile: montant + statut + actions combined */}
                              <div className="flex sm:hidden flex-col items-end gap-1.5">
                                <span className="text-[13px] font-bold text-[#4B4456]">{Number(p.amount || 0).toLocaleString('fr-FR')} €</span>
                                {isPaid ? (
                                  <span className="text-[10px] font-semibold text-[#88b7b5]">Payé le {formatDate(p.paid_date || '')}</span>
                                ) : isLate ? (
                                  <span className="text-[10px] font-semibold text-[#B9847F]">En retard</span>
                                ) : (
                                  <span className="text-[10px] font-semibold text-[#C9A96E]">Éch. {formatDate(p.due_date)}</span>
                                )}
                                <div className="flex items-center gap-1">
                                  {!isPaid && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 rounded-full text-[#88b7b5]"
                                      onClick={() => handleMarkPaid(p.id)}
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-full text-[#B9847F]"
                                    onClick={() => handleDeletePayment(p.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
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
              onClick={() => { setPaidOpen(false); setPaidPaymentId(null); }}
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
