'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useVendorData } from '@/contexts/VendorDataContext';
import { VendorDashboardLayout } from '@/components/layout/VendorDashboardLayout';
import {
  getVendorBookingById,
  getBookingProDocuments,
  getBookingPayments,
  calculateDaysUntil,
  formatFrenchDate,
  VendorBooking,
  ProDocument,
  VendorPayment,
} from '@/lib/vendor-helpers';
import { addDocument, updateDocument } from '@/lib/db';
import { uploadFile } from '@/lib/storage';
import { auth } from '@/lib/firebase';
import { getIdToken } from 'firebase/auth';
import {
  Loader2,
  ChevronLeft,
  Heart,
  Calendar,
  MapPin,
  FileText,
  CreditCard,
  Plus,
  Upload,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  Euro,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Tab = 'documents' | 'acomptes';

export default function VendorBookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;
  const { user, loading: authLoading } = useAuth();
  const { vendor, loading: vendorLoading } = useVendorData();

  const [booking, setBooking] = useState<VendorBooking | null>(null);
  const [docs, setDocs] = useState<ProDocument[]>([]);
  const [payments, setPayments] = useState<VendorPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('documents');

  // Upload dialog state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    type: 'devis' as 'devis' | 'facture',
    reference: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'vendor') {
        router.push('/');
      }
    }
  }, [user, authLoading, router]);

  const fetchData = async () => {
    if (!bookingId) return;
    setLoading(true);
    try {
      const bk = await getVendorBookingById(bookingId);
      if (!bk) {
        toast.error('Mariage introuvable');
        router.push('/espace-pro/mariages');
        return;
      }
      setBooking(bk);

      if (bk.client_id && bk.vendor_id) {
        const [d, p] = await Promise.all([
          getBookingProDocuments(bk.client_id, bk.vendor_id),
          getBookingPayments(bookingId),
        ]);
        setDocs(d);
        setPayments(p);
      }
    } catch (e) {
      console.error('Error fetching booking detail:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !booking || !vendor) return;
    if (!selectedFile) {
      toast.error('Veuillez sélectionner un fichier');
      return;
    }
    if (!uploadForm.amount || !uploadForm.date) {
      toast.error('Montant et date sont obligatoires');
      return;
    }

    setUploading(true);
    try {
      toast.info('Upload du fichier...');
      const fileUrl = await uploadFile(selectedFile, 'pro_documents');

      const data: any = {
        client_id: booking.client_id,
        planner_id: booking.planner_id,
        vendor_id: booking.vendor_id,
        vendor_uid: user.uid,
        type: uploadForm.type,
        pro_name: vendor.name,
        vendor_name: vendor.name,
        vendor_logo_url: vendor.logo || null,
        reference: uploadForm.reference,
        amount: Number(uploadForm.amount) || 0,
        date: uploadForm.date,
        status: 'recu',
        uploaded_by: 'vendor',
        vendor_status: 'submitted',
        notes: uploadForm.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (uploadForm.type === 'devis') {
        data.devis_file_url = fileUrl;
      } else {
        data.facture_file_url = fileUrl;
      }

      await addDocument('pro_documents', data);

      // Notify the planner
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          const token = await getIdToken(currentUser);
          await fetch('/api/notifications/vendor-doc-submitted', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              planner_id: booking.planner_id,
              vendor_name: vendor.name,
              doc_type: uploadForm.type,
              client_names: booking.client_names,
              client_id: booking.client_id,
            }),
          });
        }
      } catch (notifErr) {
        console.error('Error sending notification:', notifErr);
      }

      toast.success(uploadForm.type === 'devis' ? 'Devis soumis' : 'Facture soumise');
      setUploadOpen(false);
      setUploadForm({
        type: 'devis',
        reference: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      setSelectedFile(null);
      await fetchData();
    } catch (err: any) {
      console.error('Error uploading document:', err);
      toast.error(err?.message || 'Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  if (authLoading || !user || user.role !== 'vendor' || vendorLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-beige">
        <Loader2 className="animate-spin h-8 w-8 text-brand-turquoise" />
      </div>
    );
  }

  if (!booking) return null;

  const days = calculateDaysUntil(booking.wedding_date);
  const isPast = days < 0;

  const totalPaid = payments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalScheduled = payments
    .filter((p) => p.status === 'scheduled')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalAmount = totalPaid + totalScheduled;

  const vendorStatusBadge = (doc: ProDocument) => {
    if (doc.uploaded_by !== 'vendor') return null;
    const st = doc.vendor_status || 'submitted';
    if (st === 'validated') {
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0"><CheckCircle2 className="h-3 w-3 mr-1" />Validé</Badge>;
    }
    if (st === 'rejected') {
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0"><XCircle className="h-3 w-3 mr-1" />Rejeté</Badge>;
    }
    return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-0"><Clock className="h-3 w-3 mr-1" />En attente</Badge>;
  };

  return (
    <VendorDashboardLayout vendorName={vendor?.name}>
      <div className="space-y-6">
        {/* Back button */}
        <button
          onClick={() => router.push('/espace-pro/mariages')}
          className="flex items-center gap-2 text-sm text-[#9C97A3] hover:text-[#4B4456] transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Retour aux mariages
        </button>

        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-[#4B4456] px-7 py-7 sm:px-8 sm:py-8">
          <span className="inline-block text-[10px] tracking-[0.15em] uppercase text-[#4B4456] bg-white/90 px-3 py-1.5 rounded-full mb-4">
            {isPast ? 'Mariage passé' : `J-${days}`}
          </span>
          <h1 className="font-baskerville text-[#FAF9F7] text-2xl sm:text-[28px] leading-tight mb-3">
            {booking.client_names}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-[#FAF9F7]/80 text-sm">
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {formatFrenchDate(booking.wedding_date)}
            </span>
            {booking.planner_name && (
              <span className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                {booking.planner_name}
              </span>
            )}
          </div>
          <svg
            className="absolute right-6 top-1/2 -translate-y-1/2 opacity-[0.18] hidden sm:block"
            width="140"
            height="140"
            viewBox="0 0 100 100"
            fill="none"
          >
            <path d="M50 5 L56 44 L95 50 L56 56 L50 95 L44 56 L5 50 L44 44 Z" fill="#fff" />
          </svg>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-[rgba(75,68,86,0.08)]">
          <button
            onClick={() => setTab('documents')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === 'documents'
                ? 'text-[#4B4456] border-[#88b7b5]'
                : 'text-[#9C97A3] border-transparent hover:text-[#4B4456]'
            }`}
          >
            <FileText className="h-4 w-4" />
            Devis & Factures
          </button>
          <button
            onClick={() => setTab('acomptes')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === 'acomptes'
                ? 'text-[#4B4456] border-[#88b7b5]'
                : 'text-[#9C97A3] border-transparent hover:text-[#4B4456]'
            }`}
          >
            <CreditCard className="h-4 w-4" />
            Acomptes
          </button>
        </div>

        {/* Documents tab */}
        {tab === 'documents' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-[#4B4456]">
                Documents ({docs.length})
              </h2>
              <Button
                className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2"
                onClick={() => setUploadOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Soumettre un document
              </Button>
            </div>

            {docs.length === 0 ? (
              <div className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] p-12 text-center">
                <FileText className="h-12 w-12 text-[#9C97A3] mx-auto mb-4 opacity-40" />
                <h3 className="text-lg font-semibold text-[#4B4456] mb-2">Aucun document</h3>
                <p className="text-sm text-[#9C97A3] mb-4">
                  Soumettez vos devis et factures pour ce mariage.
                </p>
                <Button
                  className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2"
                  onClick={() => setUploadOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  Soumettre un document
                </Button>
              </div>
            ) : (
              <div className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] p-5">
                <div className="space-y-3">
                  {docs.map((d) => {
                    const fileUrl = d.devis_file_url || d.facture_file_url || d.file_url || '';
                    return (
                      <div
                        key={d.id}
                        className="flex items-center gap-4 p-4 rounded-xl bg-[#FAF9F7]"
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          d.type === 'devis' ? 'bg-[rgba(136,183,181,0.15)]' : 'bg-[rgba(201,169,110,0.15)]'
                        }`}>
                          <FileText className={`h-5 w-5 ${d.type === 'devis' ? 'text-[#88b7b5]' : 'text-[#C9A96E]'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] font-semibold text-[#4B4456]">
                              {d.type === 'devis' ? 'Devis' : 'Facture'}
                            </span>
                            {vendorStatusBadge(d)}
                          </div>
                          <div className="text-[11.5px] text-[#9C97A3] mt-0.5">
                            {d.reference ? `${d.reference} · ` : ''}
                            {Number(d.amount || 0).toLocaleString('fr-FR')} € · {formatFrenchDate(d.date)}
                          </div>
                          {d.uploaded_by === 'vendor' && d.vendor_status === 'rejected' && d.rejection_reason && (
                            <div className="text-[11px] text-red-600 mt-1">
                              Motif du rejet : {d.rejection_reason}
                            </div>
                          )}
                        </div>
                        {fileUrl && (
                          <button
                            onClick={() => window.open(fileUrl, '_blank')}
                            className="w-9 h-9 rounded-full bg-white border border-[rgba(75,68,86,0.1)] flex items-center justify-center text-[#4B4456] hover:bg-[rgba(75,68,86,0.05)] transition-colors shrink-0"
                            title="Voir le document"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Acomptes tab */}
        {tab === 'acomptes' && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-full bg-[rgba(136,183,181,0.15)] flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-[#88b7b5]" />
                  </div>
                  <span className="text-[13px] font-semibold text-[#4B4456]">Reçu</span>
                </div>
                <div className="text-2xl font-bold text-[#4B4456] font-baskerville">
                  {totalPaid.toLocaleString('fr-FR')} €
                </div>
              </div>
              <div className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-full bg-[rgba(201,169,110,0.15)] flex items-center justify-center">
                    <Clock className="w-4 h-4 text-[#C9A96E]" />
                  </div>
                  <span className="text-[13px] font-semibold text-[#4B4456]">À percevoir</span>
                </div>
                <div className="text-2xl font-bold text-[#4B4456] font-baskerville">
                  {totalScheduled.toLocaleString('fr-FR')} €
                </div>
              </div>
              <div className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-full bg-[rgba(75,68,86,0.08)] flex items-center justify-center">
                    <Euro className="w-4 h-4 text-[#4B4456]" />
                  </div>
                  <span className="text-[13px] font-semibold text-[#4B4456]">Total</span>
                </div>
                <div className="text-2xl font-bold text-[#4B4456] font-baskerville">
                  {totalAmount.toLocaleString('fr-FR')} €
                </div>
              </div>
            </div>

            {/* Echeancier */}
            <div className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] p-5">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[15px] font-semibold text-[#4B4456]">Échéancier</h2>
                <span className="text-[11px] text-[#9C97A3]">Géré par le planner</span>
              </div>

              {payments.length === 0 ? (
                <div className="text-center py-10">
                  <CreditCard className="h-10 w-10 text-[#9C97A3] mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-[#9C97A3]">
                    Aucun échéancier défini pour le moment.
                  </p>
                  <p className="text-xs text-[#9C97A3] mt-1">
                    Le planner définira les acomptes prochainement.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((p) => {
                    const isPaid = p.status === 'paid';
                    const isLate = p.status === 'late';
                    return (
                      <div
                        key={p.id}
                        className="flex items-center gap-4 p-4 rounded-xl bg-[#FAF9F7]"
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          isPaid ? 'bg-[rgba(136,183,181,0.15)]' : isLate ? 'bg-[rgba(185,132,127,0.15)]' : 'bg-[rgba(201,169,110,0.15)]'
                        }`}>
                          {isPaid ? (
                            <CheckCircle2 className="w-5 h-5 text-[#88b7b5]" />
                          ) : isLate ? (
                            <XCircle className="w-5 h-5 text-[#B9847F]" />
                          ) : (
                            <Clock className="w-5 h-5 text-[#C9A96E]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[14px] font-semibold text-[#4B4456]">
                            {p.label}
                          </div>
                          <div className="text-[11.5px] text-[#9C97A3] mt-0.5">
                            Échéance : {formatFrenchDate(p.due_date)}
                            {isPaid && p.paid_date ? ` · Payé le ${formatFrenchDate(p.paid_date)}` : ''}
                            {p.method ? ` · ${p.method}` : ''}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-[14px] font-bold text-[#4B4456]">
                            {Number(p.amount || 0).toLocaleString('fr-FR')} €
                          </div>
                          <div className={`text-[10px] font-semibold mt-0.5 ${
                            isPaid ? 'text-[#88b7b5]' : isLate ? 'text-[#B9847F]' : 'text-[#C9A96E]'
                          }`}>
                            {isPaid ? 'Payé' : isLate ? 'En retard' : 'À venir'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Upload dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#4B4456]">Soumettre un document</DialogTitle>
            <DialogDescription>
              Uploadez un devis ou une facture pour {booking.client_names}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpload} className="space-y-4 py-2">
            <div>
              <Label>Type de document</Label>
              <Select
                value={uploadForm.type}
                onValueChange={(v) => setUploadForm({ ...uploadForm, type: v as 'devis' | 'facture' })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="devis">Devis</SelectItem>
                  <SelectItem value="facture">Facture</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Référence (optionnel)</Label>
              <Input
                placeholder="N° de devis/facture"
                className="mt-1"
                value={uploadForm.reference}
                onChange={(e) => setUploadForm({ ...uploadForm, reference: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Montant (€) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="1500"
                  className="mt-1"
                  value={uploadForm.amount}
                  onChange={(e) => setUploadForm({ ...uploadForm, amount: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Date *</Label>
                <Input
                  type="date"
                  className="mt-1"
                  value={uploadForm.date}
                  onChange={(e) => setUploadForm({ ...uploadForm, date: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <Label>Fichier (PDF) *</Label>
              <Input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                className="mt-1"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                required
              />
            </div>
            <div>
              <Label>Notes (optionnel)</Label>
              <Textarea
                placeholder="Informations complémentaires..."
                className="mt-1"
                rows={2}
                value={uploadForm.notes}
                onChange={(e) => setUploadForm({ ...uploadForm, notes: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setUploadOpen(false)}>
                Annuler
              </Button>
              <Button
                type="submit"
                className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2"
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Soumettre
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </VendorDashboardLayout>
  );
}
