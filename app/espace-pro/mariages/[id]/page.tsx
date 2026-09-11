'use client';

import { useEffect, useRef, useState } from 'react';
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
import { addDocument, updateDocument, deleteDocument, getDocument, getDocuments } from '@/lib/db';
import { uploadFile } from '@/lib/storage';
import { auth } from '@/lib/firebase';
import { getIdToken } from 'firebase/auth';
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
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
  MoreVertical,
  Pencil,
  Trash2,
  Users,
  Palette,
  Sparkles,
  HelpCircle,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Tab = 'documents' | 'acomptes' | 'infos' | 'planning';

export default function VendorBookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;
  const { user, loading: authLoading } = useAuth();
  const { vendor, loading: vendorLoading } = useVendorData();

  const [booking, setBooking] = useState<VendorBooking | null>(null);
  const [docs, setDocs] = useState<ProDocument[]>([]);
  const [payments, setPayments] = useState<VendorPayment[]>([]);
  const [clientInfo, setClientInfo] = useState<any>(null);
  const [eventInfo, setEventInfo] = useState<any>(null);
  const [planning, setPlanning] = useState<any[]>([]);
  const [planningInfo, setPlanningInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('documents');
  const tabsRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Upload dialog state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [uploadForm, setUploadForm] = useState({
    type: 'devis' as 'devis' | 'facture',
    reference: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editingDoc, setEditingDoc] = useState<ProDocument | null>(null);

  // Planning validation / modif request state
  const [validationOpen, setValidationOpen] = useState(false);
  const [validating, setValidating] = useState(false);
  const [modifOpen, setModifOpen] = useState(false);
  const [modifText, setModifText] = useState('');
  const [sendingModif, setSendingModif] = useState(false);

  // Question per slot
  const [questionOpen, setQuestionOpen] = useState(false);
  const [questionSlot, setQuestionSlot] = useState<{ day: any; slot: any; dayIdx: number; idx: number } | null>(null);
  const [questionText, setQuestionText] = useState('');
  const [sendingQuestion, setSendingQuestion] = useState(false);

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
        const [d, p, clientDoc, eventDocs, planningDocs, planningGlobal] = await Promise.all([
          getBookingProDocuments(bk.client_id, bk.vendor_id),
          getBookingPayments(bookingId),
          getDocument('clients', bk.client_id).catch(() => null),
          getDocuments('events', [{ field: 'client_id', operator: '==', value: bk.client_id }]).catch(() => []),
          getDocuments('vendor_planning_days', [{ field: 'vendor_id', operator: '==', value: bk.vendor_id }]).catch(() => []),
          getDocuments('vendor_plannings', [{ field: 'vendor_id', operator: '==', value: bk.vendor_id }]).catch(() => []),
        ]);
        setDocs(d);
        setPayments(p);
        setClientInfo(clientDoc);
        // Pick the best event (the one with the most wedding info)
        const events = (eventDocs as any[]) || [];
        const eventDoc = events.find((e) => e?.event_date) || events[0] || null;
        if (eventDoc) setEventInfo(eventDoc);
        // Find planning days for this client, sorted by date
        const foundDays = (planningDocs as any[])
          ?.filter((pl) => pl.client_id === bk.client_id)
          .sort((a, b) => String(a.date || '').localeCompare(String(b.date || ''))) || [];
        setPlanning(foundDays);
        const global = (planningGlobal as any[])?.find((pl) => pl.client_id === bk.client_id) || null;
        setPlanningInfo(global);
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

  const updateScrollArrows = () => {
    const el = tabsRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  };

  const scrollTabs = (direction: 'left' | 'right') => {
    const el = tabsRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === 'left' ? -120 : 120, behavior: 'smooth' });
  };

  useEffect(() => {
    updateScrollArrows();
    const handleResize = () => updateScrollArrows();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleValidatePlanning = async () => {
    if (!booking || !user?.uid) return;
    setValidating(true);
    try {
      const now = new Date().toISOString();
      for (const day of planning) {
        if (day.id) {
          await updateDocument('vendor_planning_days', day.id, {
            status: 'validated',
            validated_by_vendor: true,
            validated_by_vendor_at: now,
            updated_at: now,
          });
        }
      }
      // Update global planning status if available
      if (planningInfo?.id) {
        await updateDocument('vendor_plannings', planningInfo.id, {
          status: 'validated',
          validated_by_vendor: true,
          validated_by_vendor_at: now,
          updated_at: now,
        });
        setPlanningInfo({ ...planningInfo, status: 'validated', validated_by_vendor: true, validated_by_vendor_at: now });
      }
      setPlanning((prev) => prev.map((d) => ({ ...d, status: 'validated', validated_by_vendor: true, validated_by_vendor_at: now })));

      // Notify planner
      try {
        await addDocument('notifications', {
          recipient_id: booking.planner_id,
          type: 'planning_validated',
          title: 'Planning validé',
          message: `${vendor?.name || 'Un prestataire'} a validé le planning du mariage de ${booking.client_names}.`,
          link: `/admin/clients/${booking.client_id}/prestataires`,
          read: false,
          created_at: new Date(),
          planner_id: booking.planner_id,
          client_id: booking.client_id,
          vendor_id: booking.vendor_id,
        });
      } catch { /* non-blocking */ }

      try {
        const { sendEmailToUid } = await import('@/lib/email');
        await sendEmailToUid({
          recipientUid: booking.planner_id,
          subject: `Planning validé - ${booking.client_names}`,
          text: `Bonjour,\n\n${vendor?.name || 'Un prestataire'} a validé le planning du mariage de ${booking.client_names}.\n\nConnectez-vous à votre espace admin pour consulter le planning.\n\nLe Oui Parfait`,
        });
      } catch { /* non-blocking */ }

      toast.success('Planning validé, votre wedding planner est prévenu(e)');
      setValidationOpen(false);
    } catch (e) {
      console.error('Error validating planning:', e);
      toast.error('Erreur lors de la validation');
    } finally {
      setValidating(false);
    }
  };

  const handleRequestPlanningChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking || !user?.uid || !modifText.trim()) return;
    setSendingModif(true);
    try {
      const requestData = {
        vendor_id: booking.vendor_id,
        vendor_uid: user.uid,
        vendor_name: vendor?.name || 'Prestataire',
        client_id: booking.client_id,
        planner_id: booking.planner_id,
        booking_id: booking.id,
        request_type: 'planning_modification',
        message: modifText.trim(),
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      };

      await addDocument('planning_requests', requestData);

      // Notify planner
      try {
        await addDocument('notifications', {
          recipient_id: booking.planner_id,
          type: 'planning_modification_request',
          title: 'Demande de modification de planning',
          message: `${vendor?.name || 'Un prestataire'} demande une modification du planning pour le mariage de ${booking.client_names}.`,
          link: `/admin/clients/${booking.client_id}/prestataires`,
          read: false,
          created_at: new Date(),
          planner_id: booking.planner_id,
          client_id: booking.client_id,
          vendor_id: booking.vendor_id,
        });
      } catch { /* non-blocking */ }

      try {
        const { sendEmailToUid } = await import('@/lib/email');
        await sendEmailToUid({
          recipientUid: booking.planner_id,
          subject: `Demande de modification de planning - ${booking.client_names}`,
          text: `Bonjour,\n\n${vendor?.name || 'Un prestataire'} a fait une demande de modification du planning pour le mariage de ${booking.client_names}.\n\nMessage :\n${modifText.trim()}\n\nConnectez-vous à votre espace admin pour consulter la demande.\n\nLe Oui Parfait`,
        });
      } catch { /* non-blocking */ }

      toast.success('Demande envoyée à votre wedding planner');
      setModifOpen(false);
      setModifText('');
    } catch (e) {
      console.error('Error sending planning change request:', e);
      toast.error("Erreur lors de l'envoi de la demande");
    } finally {
      setSendingModif(false);
    }
  };

  const handleSendQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking || !user?.uid || !questionSlot || !questionText.trim()) return;
    setSendingQuestion(true);
    const { day, slot } = questionSlot;
    try {
      const slotDate = day?.date || '';
      const slotTime = slot?.time || '—';
      const slotTitle = slot?.title || 'Sans titre';

      const requestData = {
        vendor_id: booking.vendor_id,
        vendor_uid: user.uid,
        vendor_name: vendor?.name || 'Prestataire',
        client_id: booking.client_id,
        planner_id: booking.planner_id,
        booking_id: booking.id,
        request_type: 'slot_question',
        wedding_date: booking.wedding_date || '',
        client_names: booking.client_names || '',
        slot_date: slotDate,
        slot_time: slotTime,
        slot_title: slotTitle,
        message: questionText.trim(),
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      };

      await addDocument('planning_requests', requestData);

      // Post the question in the wedding conversation with the planner
      try {
        const convs = await getDocuments('conversations', [
          { field: 'vendor_id', operator: '==', value: booking.vendor_id },
        ]);
        const existing =
          (convs as any[]).find(
            (c) => c.client_id === booking.client_id && c.planner_id === booking.planner_id
          ) || null;
        let conversationId = existing?.id || null;

        if (!conversationId && vendor) {
          const created = await addDocument('conversations', {
            vendor_id: booking.vendor_id,
            vendor_uid: user.uid,
            planner_id: booking.planner_id,
            client_id: booking.client_id,
            type: 'vendor',
            client_name: booking.client_names,
            client_photo: booking.client_photo || null,
            vendor_name: vendor.name,
            vendor_logo: vendor.logo || null,
            participants: [booking.planner_id, user.uid].filter(Boolean),
            last_message: '',
            last_message_at: new Date(),
            unread_count_vendor: 0,
            unread_count_planner: 0,
            created_at: new Date(),
          });
          conversationId = created.id;
        }

        if (conversationId) {
          const dateLabel = slotDate
            ? new Date(slotDate + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })
            : '—';
          const questionContent = `Question sur le créneau du ${dateLabel} à ${slotTime} — ${slotTitle}\n\n${questionText.trim()}`;
          await addDocument('messages', {
            conversation_id: conversationId,
            sender_id: user.uid,
            sender_role: 'vendor',
            sender_name: vendor?.name || 'Prestataire',
            content: questionContent,
            created_at: new Date(),
          });
          await updateDocument('conversations', conversationId, {
            last_message: `Question : ${questionText.trim().slice(0, 120)}`,
            last_message_at: new Date(),
            unread_count_planner: 1,
          });
        }
      } catch (e) {
        console.error('Error posting slot question to conversation:', e);
      }

      // Notify planner
      try {
        await addDocument('notifications', {
          recipient_id: booking.planner_id,
          type: 'slot_question',
          title: 'Question sur un créneau',
          message: `${vendor?.name || 'Un prestataire'} a une question sur le créneau "${slotTitle}" (${slotTime}) du ${slotDate || 'mariage'} pour le mariage de ${booking.client_names}.`,
          link: `/admin/clients/${booking.client_id}/prestataires`,
          read: false,
          created_at: new Date(),
          planner_id: booking.planner_id,
          client_id: booking.client_id,
          vendor_id: booking.vendor_id,
        });
      } catch { /* non-blocking */ }

      // Send email to planner
      try {
        const { sendEmailToUid } = await import('@/lib/email');
        await sendEmailToUid({
          recipientUid: booking.planner_id,
          subject: `Question sur un créneau - ${booking.client_names}`,
          text: `Bonjour,\n\n${vendor?.name || 'Un prestataire'} a une question concernant un créneau du mariage de ${booking.client_names}.\n\nDate du mariage : ${booking.wedding_date ? new Date(booking.wedding_date + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}\nCréneau concerné : ${slotDate ? new Date(slotDate + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'} à ${slotTime}\nMission : ${slotTitle}\n\nMessage :\n${questionText.trim()}\n\nConnectez-vous à votre espace admin pour consulter la demande.\n\nLe Oui Parfait`,
        });
      } catch { /* non-blocking */ }

      toast.success('Question envoyée à votre wedding planner');
      setQuestionOpen(false);
      setQuestionSlot(null);
      setQuestionText('');
    } catch (e) {
      console.error('Error sending slot question:', e);
      toast.error("Erreur lors de l'envoi de la question");
    } finally {
      setSendingQuestion(false);
    }
  };

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
      let fileUrl = '';
      if (selectedFile) {
        toast.info('Upload du fichier...');
        fileUrl = await uploadFile(selectedFile, 'pro_documents') || '';
      }

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
        uploaded_by: 'vendor',
        notes: uploadForm.notes,
        updated_at: new Date().toISOString(),
      };

      if (selectedFile) {
        if (uploadForm.type === 'devis') {
          data.devis_file_url = fileUrl;
        } else {
          data.facture_file_url = fileUrl;
        }
      }

      if (editingDoc) {
        // Update existing document, reset status to submitted
        data.vendor_status = 'submitted';
        data.rejection_reason = '';
        await updateDocument('pro_documents', editingDoc.id, data);
        toast.success('Document mis à jour');
      } else {
        // Create new document
        data.status = 'recu';
        data.vendor_status = 'submitted';
        data.created_at = new Date().toISOString();
        await addDocument('pro_documents', data);

        // Notify the planner (only on new submission)
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
      }

      setUploadOpen(false);
      setEditingDoc(null);
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

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm('Supprimer ce document ?')) return;
    setDeletingDocId(docId);
    try {
      await deleteDocument('pro_documents', docId);
      setDocs((prev) => prev.filter((d) => d.id !== docId));
      toast.success('Document supprimé');
    } catch (e) {
      console.error('Error deleting doc:', e);
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeletingDocId(null);
    }
  };

  const handleEditDoc = (doc: ProDocument) => {
    setEditingDoc(doc);
    setUploadForm({
      type: doc.type || 'devis',
      reference: doc.reference || '',
      amount: String(doc.amount || ''),
      date: doc.date || new Date().toISOString().split('T')[0],
      notes: doc.notes || doc.description || '',
    });
    setSelectedFile(null);
    setUploadOpen(true);
  };

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
        <div className="relative -mx-4 px-4 sm:-mx-0 sm:px-0">
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => scrollTabs('left')}
              className="absolute left-1 top-1/2 -translate-y-1/2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white/80 text-[#9C97A3] shadow-sm sm:hidden"
              aria-label="Défiler à gauche"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          )}
          {canScrollRight && (
            <button
              type="button"
              onClick={() => scrollTabs('right')}
              className="absolute right-1 top-1/2 -translate-y-1/2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white/80 text-[#9C97A3] shadow-sm sm:hidden"
              aria-label="Défiler à droite"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
          <div
            ref={tabsRef}
            onScroll={updateScrollArrows}
            className="overflow-x-auto no-scrollbar scroll-smooth"
          >
            <div className="flex gap-2 border-b border-[rgba(75,68,86,0.08)] min-w-max">
              <button
                onClick={() => setTab('documents')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
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
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
                  tab === 'acomptes'
                    ? 'text-[#4B4456] border-[#88b7b5]'
                    : 'text-[#9C97A3] border-transparent hover:text-[#4B4456]'
                }`}
              >
                <CreditCard className="h-4 w-4" />
                Acomptes
              </button>
              <button
                onClick={() => setTab('infos')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
                  tab === 'infos'
                    ? 'text-[#4B4456] border-[#88b7b5]'
                    : 'text-[#9C97A3] border-transparent hover:text-[#4B4456]'
                }`}
              >
                <Sparkles className="h-4 w-4" />
                Infos mariage
              </button>
              <button
                onClick={() => setTab('planning')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
                  tab === 'planning'
                    ? 'text-[#4B4456] border-[#88b7b5]'
                    : 'text-[#9C97A3] border-transparent hover:text-[#4B4456]'
                }`}
              >
                <Calendar className="h-4 w-4" />
                Planning
              </button>
            </div>
          </div>
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
                onClick={() => { setEditingDoc(null); setUploadForm({ type: 'devis', reference: '', amount: '', date: new Date().toISOString().split('T')[0], notes: '' }); setSelectedFile(null); setUploadOpen(true); }}
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
                  onClick={() => { setEditingDoc(null); setUploadForm({ type: 'devis', reference: '', amount: '', date: new Date().toISOString().split('T')[0], notes: '' }); setSelectedFile(null); setUploadOpen(true); }}
                >
                  <Plus className="h-4 w-4" />
                  Soumettre un document
                </Button>
              </div>
            ) : (
              <div className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] overflow-hidden">
                {/* Table header (desktop) */}
                <div className="hidden sm:grid grid-cols-[120px_1fr_120px_140px_140px_50px] items-center gap-4 px-5 py-3 border-b border-[rgba(75,68,86,0.08)] bg-[#FAF9F7]">
                  <span className="text-[11px] font-semibold text-[#9C97A3] uppercase tracking-wide">Type</span>
                  <span className="text-[11px] font-semibold text-[#9C97A3] uppercase tracking-wide">Référence</span>
                  <span className="text-[11px] font-semibold text-[#9C97A3] uppercase tracking-wide">Montant</span>
                  <span className="text-[11px] font-semibold text-[#9C97A3] uppercase tracking-wide">Date</span>
                  <span className="text-[11px] font-semibold text-[#9C97A3] uppercase tracking-wide">Statut</span>
                  <span></span>
                </div>
                {/* Table rows */}
                <div className="divide-y divide-[rgba(75,68,86,0.04)]">
                  {docs.map((d) => {
                    const fileUrl = d.devis_file_url || d.facture_file_url || d.file_url || '';
                    return (
                      <div
                        key={d.id}
                        className="grid grid-cols-[1fr_auto] sm:grid-cols-[120px_1fr_120px_140px_140px_50px] items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 hover:bg-[rgba(136,183,181,0.04)] transition-colors"
                      >
                        {/* Type */}
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                            d.type === 'devis' ? 'bg-[rgba(136,183,181,0.15)]' : 'bg-[rgba(201,169,110,0.15)]'
                          }`}>
                            <FileText className={`h-4 w-4 ${d.type === 'devis' ? 'text-[#88b7b5]' : 'text-[#C9A96E]'}`} />
                          </div>
                          <span className="text-[13px] font-semibold text-[#4B4456] sm:hidden">
                            {d.type === 'devis' ? 'Devis' : 'Facture'}
                          </span>
                          <span className="hidden sm:block text-[13px] font-semibold text-[#4B4456]">
                            {d.type === 'devis' ? 'Devis' : 'Facture'}
                          </span>
                        </div>
                        {/* Référence */}
                        <div className="min-w-0">
                          <div className="text-[13px] text-[#4B4456] truncate">{d.reference || '—'}</div>
                          {d.uploaded_by === 'vendor' && d.vendor_status === 'rejected' && d.rejection_reason && (
                            <div className="text-[10px] text-red-600 truncate mt-0.5">
                              Rejeté : {d.rejection_reason}
                            </div>
                          )}
                        </div>
                        {/* Montant (desktop) */}
                        <div className="hidden sm:block text-[13px] font-semibold text-[#4B4456]">
                          {Number(d.amount || 0).toLocaleString('fr-FR')} €
                        </div>
                        {/* Date (desktop) */}
                        <div className="hidden sm:block text-[12px] text-[#9C97A3]">
                          {formatFrenchDate(d.date)}
                        </div>
                        {/* Statut (desktop) */}
                        <div className="hidden sm:flex items-center">
                          {vendorStatusBadge(d)}
                        </div>
                        {/* Mobile: montant + statut + date combined */}
                        <div className="flex sm:hidden flex-col items-end gap-1">
                          <span className="text-[13px] font-semibold text-[#4B4456]">{Number(d.amount || 0).toLocaleString('fr-FR')} €</span>
                          {vendorStatusBadge(d)}
                          <span className="text-[10px] text-[#9C97A3]">{formatFrenchDate(d.date)}</span>
                        </div>
                        {/* Action */}
                        <div className="flex items-center justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                className="w-8 h-8 rounded-full bg-[#FAF9F7] border border-[rgba(75,68,86,0.08)] flex items-center justify-center text-[#4B4456] hover:bg-[rgba(75,68,86,0.05)] transition-colors shrink-0"
                                title="Actions"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              {fileUrl && (
                                <DropdownMenuItem onClick={() => window.open(fileUrl, '_blank')}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Voir le document
                                </DropdownMenuItem>
                              )}
                              {d.vendor_status !== 'validated' && (
                                <>
                                  <DropdownMenuItem onClick={() => handleEditDoc(d)}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Modifier
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteDoc(d.id)}
                                    className="text-red-600"
                                    disabled={deletingDocId === d.id}
                                  >
                                    {deletingDocId === d.id ? (
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4 mr-2" />
                                    )}
                                    Supprimer
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
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
            <div className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(75,68,86,0.06)]">
                <h2 className="text-[15px] font-semibold text-[#4B4456]">Échéancier</h2>
                <span className="text-[11px] text-[#9C97A3]">Géré par le planner</span>
              </div>

              {payments.length === 0 ? (
                <div className="text-center py-12">
                  <CreditCard className="h-10 w-10 text-[#9C97A3] mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-[#9C97A3]">
                    Aucun échéancier défini pour le moment.
                  </p>
                  <p className="text-xs text-[#9C97A3] mt-1">
                    Le planner définira les acomptes prochainement.
                  </p>
                </div>
              ) : (
                <div>
                  {/* Table header (desktop) */}
                  <div className="hidden sm:grid grid-cols-[1fr_140px_140px_120px_110px] items-center gap-4 px-5 py-3 border-b border-[rgba(75,68,86,0.06)] bg-[#FAF9F7]">
                    <span className="text-[11px] font-semibold text-[#9C97A3] uppercase tracking-wide">Libellé</span>
                    <span className="text-[11px] font-semibold text-[#9C97A3] uppercase tracking-wide">Échéance</span>
                    <span className="text-[11px] font-semibold text-[#9C97A3] uppercase tracking-wide">Paiement</span>
                    <span className="text-[11px] font-semibold text-[#9C97A3] uppercase tracking-wide text-right">Montant</span>
                    <span className="text-[11px] font-semibold text-[#9C97A3] uppercase tracking-wide text-center">Statut</span>
                  </div>
                  {/* Table rows */}
                  <div className="divide-y divide-[rgba(75,68,86,0.04)]">
                    {payments.map((p) => {
                      const isPaid = p.status === 'paid';
                      const isLate = p.status === 'late';
                      const typeLabel = p.type === 'acompte' ? 'Acompte' : p.type === 'intermediaire' ? 'Intermédiaire' : 'Solde';
                      return (
                        <div
                          key={p.id}
                          className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_140px_140px_120px_110px] items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 hover:bg-[rgba(136,183,181,0.04)] transition-colors"
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
                            <span className="truncate">{formatFrenchDate(p.due_date)}</span>
                          </div>
                          {/* Paiement (desktop) */}
                          <div className="hidden sm:block text-[12px] text-[#9C97A3]">
                            {isPaid && p.paid_date ? (
                              <span className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3 h-3 text-[#88b7b5]" />
                                {formatFrenchDate(p.paid_date)}
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
                          {/* Mobile: montant + statut + dates combined */}
                          <div className="flex sm:hidden flex-col items-end gap-1">
                            <span className="text-[13px] font-bold text-[#4B4456]">{Number(p.amount || 0).toLocaleString('fr-FR')} €</span>
                            {isPaid ? (
                              <span className="text-[10px] font-semibold text-[#88b7b5]">Payé le {formatFrenchDate(p.paid_date || '')}</span>
                            ) : isLate ? (
                              <span className="text-[10px] font-semibold text-[#B9847F]">En retard</span>
                            ) : (
                              <span className="text-[10px] font-semibold text-[#C9A96E]">Éch. {formatFrenchDate(p.due_date)}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Infos mariage tab */}
        {tab === 'infos' && (
          <div className="space-y-5">
            {(() => {
              const ev = eventInfo || {};
              const cl = clientInfo || {};
              const location = ev?.location || cl?.event_location || cl?.location || cl?.venue || '';
              const guestCount = ev?.guest_count ?? cl?.guest_count ?? cl?.guests ?? 0;
              const themeStyle = ev?.theme?.style || cl?.theme?.style || cl?.theme_style || '';
              const themeDescription = ev?.theme?.description || cl?.theme?.description || cl?.theme_description || '';
              const themeColors: string[] = ev?.theme?.colors || cl?.theme?.colors || cl?.theme_colors || [];
              const eventDate = ev?.event_date || cl?.event_date || booking.wedding_date || '';
              const eventTime = ev?.event_time || cl?.event_time || '';

              const infoCards = [
                { icon: MapPin, label: 'Lieu', value: location, color: '#B98A96', bg: 'rgba(185,138,150,0.1)' },
                { icon: Users, label: 'Invités', value: guestCount ? `${guestCount} personnes` : '', color: '#88b7b5', bg: 'rgba(136,183,181,0.1)' },
                { icon: Palette, label: 'Thème & Décoration', value: themeStyle, color: '#C9A96E', bg: 'rgba(201,169,110,0.1)' },
                { icon: Calendar, label: 'Date', value: eventDate ? formatFrenchDate(eventDate) : '', color: '#4B4456', bg: 'rgba(75,68,86,0.08)' },
              ].filter((c) => c.value);

              return (
                <>
                  {/* Info cards - 2 par ligne sur tous les écrans */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {infoCards.map((card) => {
                      const Icon = card.icon;
                      return (
                        <div key={card.label} className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] p-4 sm:p-5">
                          <div className="flex items-center gap-2.5 sm:gap-3 mb-2.5 sm:mb-3">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: card.bg }}>
                              <Icon className="w-4 h-4" style={{ color: card.color }} />
                            </div>
                            <span className="text-[10px] sm:text-[11px] font-semibold text-[#9C97A3] uppercase tracking-wide truncate">{card.label}</span>
                          </div>
                          <p className="text-[13px] sm:text-[15px] font-semibold text-[#4B4456] font-baskerville truncate">
                            {card.value}
                          </p>
                          {card.label === 'Date' && eventTime && (
                            <p className="text-[11px] sm:text-[12px] text-[#9C97A3] mt-1">À {eventTime}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Palette de couleurs */}
                  {themeColors.length > 0 && (
                    <div className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <Palette className="w-4 h-4 text-[#C9A96E]" />
                        <span className="text-[11px] font-semibold text-[#9C97A3] uppercase tracking-wide">Palette de couleurs</span>
                      </div>
                      <div className="flex gap-3 flex-wrap">
                        {themeColors.map((c) => (
                          <div key={c} className="flex flex-col items-center gap-1.5">
                            <div
                              className="w-12 h-12 rounded-full border-2 border-white shadow-sm"
                              style={{ background: c }}
                            />
                            <span className="text-[10px] text-[#9C97A3]">{c}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Description du thème */}
                  {themeDescription && (
                    <div className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-4 h-4 text-[#C9A96E]" />
                        <span className="text-[11px] font-semibold text-[#9C97A3] uppercase tracking-wide">Style & Description</span>
                      </div>
                      <p className="text-[14px] text-[#4B4456] leading-relaxed whitespace-pre-wrap">
                        {themeDescription}
                      </p>
                    </div>
                  )}

                  {/* Empty state */}
                  {!location && !guestCount && !themeStyle && !themeDescription && themeColors.length === 0 && (
                    <div className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] p-12 text-center">
                      <Sparkles className="h-10 w-10 text-[#9C97A3] mx-auto mb-3 opacity-40" />
                      <p className="text-sm text-[#9C97A3]">
                        Aucune information complémentaire disponible pour ce mariage.
                      </p>
                      <p className="text-xs text-[#9C97A3] mt-1">
                        Le planner complétera ces informations prochainement.
                      </p>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* Planning tab */}
        {tab === 'planning' && (
          <div className="space-y-5">
            {planning.length > 0 ? (
              <>
                {planning.map((day: any, dayIdx: number) => (
                  <div key={day.id || dayIdx} className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] overflow-hidden">
                    <div className="px-5 py-4 bg-[#FAF9F7] border-b border-[rgba(75,68,86,0.06)] flex items-center justify-between gap-3">
                      <div className="flex items-center flex-wrap gap-2">
                        <Calendar className="w-4 h-4 text-[#88b7b5] shrink-0" />
                        <h3 className="text-[14px] font-semibold text-[#4B4456] uppercase tracking-wide">
                          {day.date ? new Date(day.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                        </h3>
                        {day.validated_by_vendor && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-[#88b7b5]/10 text-[#88b7b5] px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> Validé
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Créneaux */}
                    {day.slots?.length > 0 && (
                      <div className="divide-y divide-[rgba(75,68,86,0.04)]">
                        {day.slots
                          .slice()
                          .sort((a: any, b: any) => String(a.time || '').localeCompare(String(b.time || '')))
                          .map((slot: any, idx: number) => (
                            <div key={idx} className="flex items-start sm:items-center justify-between gap-3 px-5 py-4 hover:bg-[rgba(136,183,181,0.03)] transition-colors">
                              <div className="flex items-start gap-4 min-w-0 flex-1">
                                <div className="shrink-0 w-[70px]">
                                  <span className="text-[14px] font-bold text-[#88b7b5] font-baskerville">
                                    {slot.time || '—'}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[14px] font-semibold text-[#4B4456]">
                                    {slot.title || 'Sans titre'}
                                  </p>
                                  {slot.description && (
                                    <p className="text-[12px] text-[#9C97A3] mt-0.5">{slot.description}</p>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1 shrink-0 text-[#88b7b5] border-[#88b7b5]/30 hover:bg-[#88b7b5]/5"
                                onClick={() => { setQuestionSlot({ day, slot, dayIdx, idx }); setQuestionText(''); setQuestionOpen(true); }}
                              >
                                <HelpCircle className="h-3.5 w-3.5" />
                                Question
                              </Button>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Consignes générales */}
                {planningInfo?.notes && (
                  <div className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-4 h-4 text-[#C9A96E]" />
                      <span className="text-[11px] font-semibold text-[#9C97A3] uppercase tracking-wide">Consignes générales</span>
                    </div>
                    <p className="text-[14px] text-[#4B4456] leading-relaxed whitespace-pre-wrap">
                      {planningInfo.notes}
                    </p>
                  </div>
                )}

                {/* Document de planning */}
                {planningInfo?.doc_url && (
                  <div className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-4 h-4 text-[#88b7b5]" />
                      <span className="text-[11px] font-semibold text-[#9C97A3] uppercase tracking-wide">Document de planning</span>
                    </div>
                    <a
                      href={planningInfo.doc_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[rgba(136,183,181,0.1)] text-[#88b7b5] hover:bg-[rgba(136,183,181,0.18)] transition-colors text-sm font-medium"
                    >
                      <FileText className="w-4 h-4" />
                      {planningInfo.doc_name || 'Télécharger le document'}
                    </a>
                  </div>
                )}

                {planning[0]?.updated_at && (
                  <p className="text-[11px] text-[#9C97A3] text-center">
                    Dernière mise à jour : {new Date(planning[0].updated_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}

                {/* Actions */}
                {planning.every((d) => d.validated_by_vendor) && (
                  <div className="bg-white rounded-[18px] border border-[rgba(136,183,181,0.2)] p-5 text-center">
                    <div className="flex items-center justify-center gap-2 text-[#88b7b5] mb-2">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="text-sm font-semibold">Planning validé</span>
                    </div>
                    <p className="text-[12px] text-[#9C97A3]">Vous avez confirmé ce planning. Vous pouvez toujours poser une question ou demander une modification.</p>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="w-full gap-2 border-[#C9A96E] text-[#C9A96E] hover:bg-[#C9A96E]/5"
                    onClick={() => setModifOpen(true)}
                  >
                    <Pencil className="h-4 w-4" />
                    Demander une modification
                  </Button>
                  <Button
                    className="w-full gap-2 bg-[#88b7b5] hover:bg-[#7aa9a7]"
                    onClick={() => setValidationOpen(true)}
                    disabled={planning.every((d) => d.validated_by_vendor)}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Valider le planning
                  </Button>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] p-12 text-center">
                <Calendar className="h-10 w-10 text-[#9C97A3] mx-auto mb-3 opacity-40" />
                <p className="text-sm text-[#9C97A3]">
                  Aucun planning disponible pour ce mariage.
                </p>
                <p className="text-xs text-[#9C97A3] mt-1">
                  Votre wedding planner vous enverra le planning prochainement.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upload dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#4B4456]">{editingDoc ? 'Modifier le document' : 'Soumettre un document'}</DialogTitle>
            <DialogDescription>
              {editingDoc ? 'Modifiez les informations de ce document.' : `Uploadez un devis ou une facture pour ${booking.client_names}`}
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
                {editingDoc ? 'Enregistrer' : 'Soumettre'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Validate planning dialog */}
      <Dialog open={validationOpen} onOpenChange={setValidationOpen}>
        <DialogContent className="sm:max-w-md rounded-[20px]">
          <DialogHeader>
            <DialogTitle className="text-[#4B4456]">Valider le planning</DialogTitle>
            <DialogDescription>
              Confirmez que ce planning vous convient. Votre wedding planner sera notifié(e).
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-[#9C97A3]">
              En validant, vous indiquez que les jours et créneaux proposés correspondent à vos attentes.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setValidationOpen(false)}>
              Annuler
            </Button>
            <Button
              type="button"
              className="bg-[#88b7b5] hover:bg-[#7aa9a7] gap-2"
              onClick={handleValidatePlanning}
              disabled={validating}
            >
              {validating && <Loader2 className="h-4 w-4 animate-spin" />}
              <CheckCircle2 className="h-4 w-4" />
              Valider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request planning change dialog */}
      <Dialog open={modifOpen} onOpenChange={setModifOpen}>
        <DialogContent className="sm:max-w-md rounded-[20px]">
          <DialogHeader>
            <DialogTitle className="text-[#4B4456]">Demander une modification</DialogTitle>
            <DialogDescription>
              Décrivez ce que vous souhaitez modifier. Votre wedding planner sera notifié(e).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRequestPlanningChange} className="space-y-4 py-2">
            <Textarea
              value={modifText}
              onChange={(e) => setModifText(e.target.value)}
              placeholder="Je souhaite modifier l'heure d'intervention du jour J..."
              className="min-h-[120px] resize-none"
              required
            />
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setModifOpen(false)}>
                Annuler
              </Button>
              <Button
                type="submit"
                className="bg-[#C9A96E] hover:bg-[#b89a62] gap-2"
                disabled={sendingModif}
              >
                {sendingModif && <Loader2 className="h-4 w-4 animate-spin" />}
                <Pencil className="h-4 w-4" />
                Envoyer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Question per slot dialog */}
      <Dialog open={questionOpen} onOpenChange={setQuestionOpen}>
        <DialogContent className="sm:max-w-md rounded-[20px]">
          <DialogHeader>
            <DialogTitle className="text-[#4B4456]">Poser une question</DialogTitle>
            <DialogDescription>
              {questionSlot ? (
                <>
                  Créneau concerné : <span className="font-medium text-[#4B4456]">{questionSlot.slot.time || '—'}</span> — {questionSlot.slot.title || 'Sans titre'}
                  <br />
                  <span className="text-[#9C97A3]">
                    {questionSlot.day.date ? new Date(questionSlot.day.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : ''}
                  </span>
                </>
              ) : 'Sélectionnez un créneau.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSendQuestion} className="space-y-4 py-2">
            <Textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Votre question pour ce créneau..."
              className="min-h-[120px] resize-none"
              required
            />
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setQuestionOpen(false)}>
                Annuler
              </Button>
              <Button
                type="submit"
                className="bg-[#88b7b5] hover:bg-[#7aa9a7] gap-2"
                disabled={sendingQuestion}
              >
                {sendingQuestion && <Loader2 className="h-4 w-4 animate-spin" />}
                <HelpCircle className="h-4 w-4" />
                Envoyer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </VendorDashboardLayout>
  );
}
