'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Users, Calendar, Plus, Trash2, Clock, Upload, FileText, X, CheckCircle2, Bell } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { addDocument, deleteDocument, getDocuments, getDocument, updateDocument } from '@/lib/db';
import { uploadFile } from '@/lib/storage';
import { getCategoryLabel } from '@/lib/discovery';
import { toast } from 'sonner';
import { auth } from '@/lib/firebase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

function getRelativeDayLabel(dateStr: string, refStr: string | null): string | null {
  if (!refStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  const ref = new Date(refStr + 'T00:00:00');
  if (Number.isNaN(d.getTime()) || Number.isNaN(ref.getTime())) return null;
  const diff = Math.round((d.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Jour J';
  return diff > 0 ? `J+${diff}` : `J${diff}`;
}

interface Vendor {
  id: string;
  name: string;
  category: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  city?: string;
  logoUrl?: string | null;
  pro_account_uid?: string;
  pro_account_status?: 'none' | 'invited' | 'active';
}

interface ClientVendorLink {
  id: string;
  client_id: string;
  vendor_id: string;
  planner_id: string;
  vendor_name?: string;
  vendor_category?: string;
  created_at?: any;
  notified_at?: any;
}

export default function ClientPrestatairesAdminPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [assignedLinks, setAssignedLinks] = useState<ClientVendorLink[]>([]);
  const [search, setSearch] = useState('');
  const [assigningVendorId, setAssigningVendorId] = useState<string | null>(null);
  const [unassigningVendorId, setUnassigningVendorId] = useState<string | null>(null);

  // Planning state
  const [planningOpen, setPlanningOpen] = useState(false);
  const [planningVendor, setPlanningVendor] = useState<Vendor | null>(null);
  const [weddingDate, setWeddingDate] = useState<string | null>(null);
  const [clientNames, setClientNames] = useState<string>('');

  const [planningDays, setPlanningDays] = useState<Array<{
    id?: string;
    date: string;
    slots: { time: string; title: string; description: string }[];
    isOpen: boolean;
    isNew?: boolean;
  }>>([]);
  const [newDayDate, setNewDayDate] = useState('');
  const [planningNotes, setPlanningNotes] = useState('');
  const [planningDocUrl, setPlanningDocUrl] = useState<string | null>(null);
  const [planningDocName, setPlanningDocName] = useState<string | null>(null);
  const [planningGlobalId, setPlanningGlobalId] = useState<string | null>(null);
  const [planningGlobal, setPlanningGlobal] = useState<any>(null);
  const [planningRequests, setPlanningRequests] = useState<any[]>([]);
  const [notifyingVendorId, setNotifyingVendorId] = useState<string | null>(null);
  const [notifyTarget, setNotifyTarget] = useState<Vendor | null>(null);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [replyTextByRequest, setReplyTextByRequest] = useState<Record<string, string>>({});
  const [sendingReplyId, setSendingReplyId] = useState<string | null>(null);
  const [savingPlanning, setSavingPlanning] = useState(false);
  const [uploadingPlanning, setUploadingPlanning] = useState(false);

  const fetchAll = async (withLoading = true) => {
    if (!user?.uid || !clientId) return;
    if (withLoading) setLoading(true);
    try {
      // Fetch vendors and links separately so one failing doesn't block the other
      let allVendors: any[] = [];
      let links: any[] = [];

      try {
        allVendors = await getDocuments('vendors', [{ field: 'planner_id', operator: '==', value: user.uid }]);
      } catch (e) {
        console.error('Error fetching vendors:', e);
      }

      try {
        // Single-field query to avoid composite index requirement
        const allLinks = await getDocuments('client_vendors', [
          { field: 'planner_id', operator: '==', value: user.uid },
        ]);
        links = (allLinks as any[]).filter((l) => l.client_id === clientId);
      } catch (e) {
        console.error('Error fetching client_vendors:', e);
        // Fallback: try by client_id only
        try {
          const allLinks2 = await getDocuments('client_vendors', [
            { field: 'client_id', operator: '==', value: clientId },
          ]);
          links = (allLinks2 as any[]).filter((l) => l.planner_id === user.uid);
        } catch (e2) {
          console.error('Error fetching client_vendors (fallback):', e2);
        }
      }

      const mappedVendors = (allVendors as any[]).map((d: any) => ({
        id: d.id,
        name: d.name || 'Prestataire',
        category: d.category || 'other',
        contact_name: d.contact_name,
        email: d.email,
        phone: d.phone,
        city: d.city,
        logoUrl: d.logo || d.logo_url || d.logoUrl || d.logoURL || null,
        pro_account_uid: d.pro_account_uid || undefined,
        pro_account_status: d.pro_account_status || 'none',
      })) as Vendor[];

      const mappedLinks = (links as any[]).map((d: any) => ({
        id: d.id,
        client_id: d.client_id,
        vendor_id: d.vendor_id,
        planner_id: d.planner_id,
        vendor_name: d.vendor_name,
        vendor_category: d.vendor_category,
        created_at: d.created_at,
        notified_at: d.notified_at,
      })) as ClientVendorLink[];

      setVendors(mappedVendors);
      setAssignedLinks(mappedLinks);

      // Backfill : les bookings crees avant le flag notified_at sont consideres
      // "non notifies" -> on ecrit notified_at: null pour les masquer dans
      // l'espace pro tant que le bouton Notifier n'a pas ete actionne.
      try {
        const clientBookings = await getDocuments('vendor_bookings', [
          { field: 'client_id', operator: '==', value: clientId },
        ]);
        const stale = (clientBookings as any[]).filter(
          (b) => b.notified_at === undefined && b.status !== 'cancelled',
        );
        await Promise.all(
          stale.map((b) => updateDocument('vendor_bookings', b.id, { notified_at: null })),
        );
      } catch (e) {
        console.warn('Backfill notified_at failed:', e);
      }
    } catch (e) {
      console.error('Error fetching client vendors:', e);
      toast.error('Erreur lors du chargement des prestataires');
      setVendors([]);
      setAssignedLinks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAll(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, clientId]);

  const assignedVendorIds = useMemo(() => new Set(assignedLinks.map((l) => l.vendor_id)), [assignedLinks]);

  const filteredVendors = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = vendors.slice().sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    if (!q) return list;
    return list.filter((v) => {
      const hay = `${v.name} ${getCategoryLabel(v.category)} ${v.city || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [vendors, search]);

  const assignVendor = async (vendor: Vendor) => {
    if (!user?.uid || assigningVendorId || unassigningVendorId) return;
    if (assignedVendorIds.has(vendor.id)) return;

    setAssigningVendorId(vendor.id);
    try {
      await addDocument('client_vendors', {
        planner_id: user.uid,
        client_id: clientId,
        vendor_id: vendor.id,
        vendor_name: vendor.name,
        vendor_category: vendor.category,
        created_at: new Date(),
      });

      // Also create a vendor_booking for the pro space
      await syncVendorBooking(vendor, clientId, user.uid);

      toast.success('Prestataire assigné au client');
      await fetchAll(false);
    } catch (e) {
      console.error('Error assigning vendor:', e);
      toast.error("Impossible d'assigner le prestataire");
    } finally {
      setAssigningVendorId(null);
    }
  };

  // Create or update a vendor_booking with denormalized client/event data
  const syncVendorBooking = async (vendor: Vendor, clId: string, plannerId: string) => {
    try {
      console.log('[syncVendorBooking] vendor:', { id: vendor.id, name: vendor.name, pro_account_uid: vendor.pro_account_uid, pro_account_status: vendor.pro_account_status });
      // Fetch client data for couple names
      const clientDoc = (await getDocument('clients', clId)) as any;
      const clientNames = clientDoc
        ? `${clientDoc.name || ''}${clientDoc.name && clientDoc.partner ? ' & ' : ''}${clientDoc.partner || ''}`.trim() || 'Client'
        : 'Client';

      // Fetch event data for wedding date
      const events = await getDocuments('events', [
        { field: 'client_id', operator: '==', value: clId },
      ]);
      const event = (events as any[])[0] || null;
      const weddingDate = event?.event_date || clientDoc?.event_date || '';
      const eventId = event?.id || '';

      // Fetch planner name
      const plannerDoc = (await getDocument('profiles', plannerId)) as any;
      const plannerName = plannerDoc?.full_name || plannerDoc?.email || '';

      // Check if a booking already exists for this vendor + client
      // Use single-field query to avoid composite index requirement
      const allVendorBookings = await getDocuments('vendor_bookings', [
        { field: 'vendor_id', operator: '==', value: vendor.id },
      ]);
      const existing = (allVendorBookings as any[]).filter((b) => b.client_id === clId);

      const existingId = (existing as any[]).length > 0 ? (existing as any[])[0].id : null;
      const existingGoogleEventId =
        (existing as any[]).length > 0 ? (existing as any[])[0].google_event_id || null : null;

      let googleEventId = existingGoogleEventId;

      // Create a private, minimal Google Calendar event for the vendor (no email notification)
      if (vendor.email && weddingDate && !googleEventId) {
        try {
          const currentUser = auth.currentUser;
          if (currentUser) {
            const idToken = await currentUser.getIdToken();
            const guestCount = event?.guest_count ?? clientDoc?.guest_count ?? null;
            const location =
              event?.location || clientDoc?.event_location || clientDoc?.location || '';
            const description = guestCount != null ? `Nombre d'invités : ${guestCount}` : '';
            const res = await fetch('/api/google/sync-event', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
              body: JSON.stringify({
                action: 'create',
                userId: plannerId,
                event: {
                  summary: 'Mariage',
                  description,
                  startDate: weddingDate,
                  endDate: weddingDate,
                  location,
                  attendees: [vendor.email],
                  // Silencieux : aucune notif Google avant le bouton "Notifier"
                  sendUpdates: 'none',
                  guestsCanSeeOtherGuests: false,
                },
              }),
            });
            const json = await res.json();
            if (json?.ok && json?.googleEventId) {
              googleEventId = json.googleEventId;
            }
          }
        } catch (e) {
          console.warn('Vendor Google Calendar event creation failed:', e);
        }
      }

      const bookingData = {
        vendor_id: vendor.id,
        vendor_uid: vendor.pro_account_uid || null,
        planner_id: plannerId,
        client_id: clId,
        event_id: eventId,
        client_names: clientNames,
        client_photo: clientDoc?.photo || clientDoc?.photo_url || null,
        wedding_date: weddingDate,
        planner_name: plannerName,
        status: 'confirmed',
        google_event_id: googleEventId || null,
        // null = le pro n'a pas encore ete notifie -> mariage masque dans
        // son espace ; conserve la valeur existante sur mise a jour.
        notified_at: existing[0]?.notified_at ?? null,
        updated_at: new Date().toISOString(),
      };

      if (existingId) {
        await updateDocument('vendor_bookings', existingId, bookingData);
      } else {
        await addDocument('vendor_bookings', {
          ...bookingData,
          created_at: new Date().toISOString(),
        });
      }
    } catch (e: any) {
      console.error('Error syncing vendor booking:', e);
      toast.error(`Erreur sync booking pro: ${e?.message || 'Erreur inconnue'}. Le prestataire est assigné mais son espace pro n'est pas mis à jour.`);
    }
  };

  // Notification explicite : rend le mariage visible dans l'espace pro et
  // envoie notif in-app + email + push. Jamais appelee automatiquement.
  const sendVendorNotification = async (vendor: Vendor) => {
    if (!user?.uid || notifyingVendorId) return;
    const link = assignedLinks.find((l) => l.vendor_id === vendor.id);
    if (!link) return;
    setNotifyingVendorId(vendor.id);
    try {
      const [clientDoc, eventsRaw] = await Promise.all([
        getDocument('clients', clientId).catch(() => null) as Promise<any>,
        getDocuments('events', [{ field: 'client_id', operator: '==', value: clientId }]).catch(() => []),
      ]);
      const couple = [clientDoc?.partner1_first_name || '', clientDoc?.partner2_first_name || ''].filter(Boolean).join(' & ');
      const names = couple || [clientDoc?.first_name, clientDoc?.last_name].filter(Boolean).join(' ') || 'ce mariage';
      const wedding = (eventsRaw as any[])
        .filter((e) => e?.date)
        .sort((a, b) => String(a.date).localeCompare(String(b.date)))[0];
      const wDate: string | undefined = wedding?.date;
      const wDateFr = wDate ? wDate.split('-').reverse().join('/') : '';
      const notifiedAt = new Date().toISOString();

      // Devoiler le mariage dans l'espace pro + marquer le lien comme notifie
      const bookings = await getDocuments('vendor_bookings', [
        { field: 'client_id', operator: '==', value: clientId },
      ]).catch(() => []);
      await Promise.all(
        (bookings as any[])
          .filter((b) => b.vendor_id === vendor.id || (vendor.pro_account_uid && b.vendor_uid === vendor.pro_account_uid))
          .map((b) => updateDocument('vendor_bookings', b.id, { notified_at: notifiedAt })),
      );
      await updateDocument('client_vendors', link.id, { notified_at: notifiedAt });

      if (vendor.pro_account_uid) {
        try {
          await addDocument('notifications', {
            recipient_id: vendor.pro_account_uid,
            type: 'booking',
            title: 'Invitation au mariage',
            message: `Vous avez été invité(e) à intervenir au mariage de ${names}${wDateFr ? ` le ${wDateFr}` : ''}. Consultez les détails dans votre espace pro.`,
            link: '/espace-pro/mariages',
            read: false,
            created_at: new Date(),
          });
        } catch {
          // non-blocking
        }

        try {
          const { sendEmailToUid } = await import('@/lib/email');
          const firstName = (vendor.contact_name || vendor.name || '').split(' ')[0] || 'Bonjour';
          await sendEmailToUid({
            recipientUid: vendor.pro_account_uid,
            subject: `Invitation au mariage de ${names} — Le Oui Parfait`,
            text: `Bonjour ${firstName},\n\nVous avez été invité(e) à intervenir au mariage de ${names}.\n\nTous les détails sont disponibles dès maintenant dans votre espace pro, onglet Mariages.\n\nPour toute question ou information complémentaire, n'hésitez pas à nous contacter. Nous restons à votre disposition.\n\nCordialement,\nL'équipe Le Oui Parfait`,
          });
        } catch (e) {
          console.warn('Unable to send vendor booking email:', e);
        }

        try {
          const { sendPushToRecipient } = await import('@/lib/push');
          await sendPushToRecipient({
            recipientId: vendor.pro_account_uid,
            title: 'Invitation au mariage',
            body: `Vous avez été invité(e) à intervenir au mariage de ${names}.`,
            link: '/espace-pro/mariages',
          });
        } catch (e) {
          console.warn('Unable to send vendor push:', e);
        }
      } else {
        toast.success('Mariage dévoilé dans l\'espace pro. Ce prestataire n\'a pas de compte pro : aucune notification envoyée.');
      }

      setAssignedLinks((prev) => prev.map((l) => (l.id === link.id ? { ...l, notified_at: notifiedAt } : l)));
      setNotifyTarget(null);
      if (vendor.pro_account_uid) toast.success(`Notification envoyée à ${vendor.name}.`);
    } catch (e: any) {
      console.error('Error notifying vendor:', e);
      toast.error(`Erreur lors de la notification : ${e?.message || 'inconnue'}`);
    } finally {
      setNotifyingVendorId(null);
    }
  };

  const unassignVendor = async (vendorId: string) => {
    if (unassigningVendorId || assigningVendorId) return;
    const link = assignedLinks.find((l) => l.vendor_id === vendorId);
    if (!link) return;

    if (!confirm('Retirer ce prestataire du client ?')) return;

    setUnassigningVendorId(vendorId);
    try {
      await deleteDocument('client_vendors', link.id);

      // Cancel the vendor_booking (single-field query to avoid composite index)
      const allBookings = await getDocuments('vendor_bookings', [
        { field: 'vendor_id', operator: '==', value: vendorId },
      ]);
      const bookings = (allBookings as any[]).filter((b) => b.client_id === clientId);
      for (const bk of bookings) {
        // Delete the private Google Calendar event if it exists
        if (bk.google_event_id) {
          try {
            const currentUser = auth.currentUser;
            if (currentUser) {
              const idToken = await currentUser.getIdToken();
              await fetch('/api/google/sync-event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({
                  action: 'delete',
                  userId: user?.uid,
                  eventId: bk.google_event_id,
                  sendUpdates: 'none',
                }),
              });
            }
          } catch (e) {
            console.warn('Vendor Google Calendar event deletion failed:', e);
          }
        }

        await updateDocument('vendor_bookings', bk.id, {
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        });
      }

      toast.success('Prestataire retiré');
      await fetchAll(false);
    } catch (e) {
      console.error('Error unassigning vendor:', e);
      toast.error('Erreur lors du retrait');
    } finally {
      setUnassigningVendorId(null);
    }
  };

  const assignedVendors = useMemo(() => {
    const byId = new Map(vendors.map((v) => [v.id, v] as const));
    return assignedLinks
      .map((l) => byId.get(l.vendor_id) || null)
      .filter(Boolean) as Vendor[];
  }, [assignedLinks, vendors]);

  // ---- Planning management ----
  const openPlanning = async (vendor: Vendor) => {
    setPlanningVendor(vendor);
    setPlanningOpen(true);
    setPlanningDays([]);
    setPlanningRequests([]);
    setNewDayDate('');
    setPlanningNotes('');
    setPlanningDocUrl(null);
    setPlanningDocName(null);
    setPlanningGlobalId(null);
    setClientNames('');

    // Load client names and wedding date for context
    try {
      const clientDoc = (await getDocument('clients', clientId)) as any;
      const couple = `${clientDoc?.name || ''}${clientDoc?.name && clientDoc?.partner ? ' & ' : ''}${clientDoc?.partner || ''}`.trim();
      setClientNames(couple);
    } catch { /* non-blocking */ }

    let wDate: string | null = null;
    try {
      const events = await getDocuments('events', [{ field: 'client_id', operator: '==', value: clientId }]);
      const event = (events as any[])[0] || null;
      wDate = event?.event_date || null;
    } catch { /* non-blocking */ }
    setWeddingDate(wDate);

    // Load existing planning global info
    try {
      const allGlobals = await getDocuments('vendor_plannings', [
        { field: 'vendor_id', operator: '==', value: vendor.id },
      ]);
      const global = (allGlobals as any[]).find((p) => p.client_id === clientId);
      if (global) {
        setPlanningGlobalId(global.id);
        setPlanningGlobal(global);
        setPlanningNotes(global.notes || '');
        setPlanningDocUrl(global.doc_url || null);
        setPlanningDocName(global.doc_name || null);
      } else {
        setPlanningGlobal(null);
      }
    } catch (e) {
      console.error('Error loading planning global:', e);
    }

    // Load existing planning days
    try {
      const all = await getDocuments('vendor_planning_days', [
        { field: 'vendor_id', operator: '==', value: vendor.id },
      ]);
      let days: Array<{
        id?: string;
        date: string;
        slots: { time: string; title: string; description: string }[];
        isOpen: boolean;
        isNew?: boolean;
      }> = (all as any[])
        .filter((p) => p.client_id === clientId)
        .map((p: any) => ({
          id: p.id,
          date: p.date || '',
          slots: p.slots?.length ? p.slots : [],
          isOpen: false,
        }))
        .sort((a, b) => String(a.date).localeCompare(String(b.date)));
      // Add the wedding day (Jour J) by default if not already present
      if (wDate && !days.some((d) => d.date === wDate)) {
        days = [...days, { date: wDate, slots: [], isOpen: true, isNew: true }].sort((a, b) =>
          String(a.date).localeCompare(String(b.date))
        );
      }
      setPlanningDays(days);
    } catch (e) {
      console.error('Error loading planning:', e);
    }

    // Load pending modification requests for this planning
    try {
      const allRequests = await getDocuments('planning_requests', [
        { field: 'vendor_id', operator: '==', value: vendor.id },
      ]);
      const requests = (allRequests as any[])
        .filter((r) => r.client_id === clientId && r.status === 'pending')
        .sort((a, b) => b.created_at?.toMillis?.() - a.created_at?.toMillis?.() || String(b.created_at).localeCompare(String(a.created_at)));
      setPlanningRequests(requests);
    } catch (e) {
      console.error('Error loading planning requests:', e);
    }
  };

  const addDay = () => {
    if (!newDayDate) return;
    if (planningDays.some((d) => d.date === newDayDate)) {
      toast.error('Cette date est déjà présente');
      return;
    }
    setPlanningDays([...planningDays, { date: newDayDate, slots: [], isOpen: true, isNew: true }]);
    setNewDayDate('');
  };

  const toggleDayOpen = (idx: number) => {
    setPlanningDays(planningDays.map((d, i) => (i === idx ? { ...d, isOpen: !d.isOpen } : d)));
  };

  const removeDay = (idx: number) => {
    if (typeof window !== 'undefined' && window.confirm('Voulez-vous vraiment supprimer ce jour et tous ses créneaux ?')) {
      setPlanningDays(planningDays.filter((_, i) => i !== idx));
    }
  };

  const addSlot = (dayIdx: number) => {
    setPlanningDays(planningDays.map((d, i) => (i === dayIdx ? { ...d, slots: [...d.slots, { time: '', title: '', description: '' }] } : d)));
  };

  const updateSlot = (dayIdx: number, idx: number, field: 'time' | 'title' | 'description', value: string) => {
    setPlanningDays(planningDays.map((d, i) => (i === dayIdx ? { ...d, slots: d.slots.map((s, j) => (j === idx ? { ...s, [field]: value } : s)) } : d)));
  };

  const removeSlot = (dayIdx: number, idx: number) => {
    setPlanningDays(planningDays.map((d, i) => (i === dayIdx ? { ...d, slots: d.slots.filter((_, j) => j !== idx) } : d)));
  };

  const handlePlanningDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !planningVendor) return;
    setUploadingPlanning(true);
    try {
      const path = `vendor-plannings/${clientId}/${planningVendor.id}/${Date.now()}-${file.name}`;
      const url = await uploadFile(file, path);
      setPlanningDocUrl(url);
      setPlanningDocName(file.name);
      toast.success('Document uploadé');
    } catch (err: any) {
      console.error('Error uploading planning doc:', err);
      toast.error(err?.message || "Erreur lors de l'upload");
    } finally {
      setUploadingPlanning(false);
    }
  };

  const removePlanningDoc = () => {
    setPlanningDocUrl(null);
    setPlanningDocName(null);
  };

  const handleProcessPlanningRequest = async (requestId: string) => {
    if (!requestId || !user?.uid) return;
    setProcessingRequestId(requestId);
    try {
      await updateDocument('planning_requests', requestId, { status: 'processed', updated_at: new Date() });
      setPlanningRequests((prev) => prev.filter((r) => r.id !== requestId));
      toast.success('Demande traitée');
    } catch (e) {
      console.error('Error processing planning request:', e);
      toast.error('Erreur lors du traitement');
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleReplyToQuestion = async (requestId: string) => {
    if (!planningVendor || !clientId || !user?.uid) return;
    const text = (replyTextByRequest[requestId] || '').trim();
    if (!text) return;
    setSendingReplyId(requestId);
    try {
      const req = planningRequests.find((r) => r.id === requestId);
      if (!req) return;

      const slotDate = req.slot_date || '';
      const slotTime = req.slot_time || '—';
      const slotTitle = req.slot_title || 'Sans titre';

      const convs = await getDocuments('conversations', [
        { field: 'vendor_id', operator: '==', value: planningVendor.id },
      ]);
      const existing =
        (convs as any[]).find(
          (c) => c.client_id === clientId && c.planner_id === user.uid
        ) || null;
      let conversationId = existing?.id || null;

      if (!conversationId) {
        const created = await addDocument('conversations', {
          vendor_id: planningVendor.id,
          vendor_uid: planningVendor.pro_account_uid || null,
          planner_id: user.uid,
          client_id: clientId,
          type: 'vendor',
          client_name: clientNames,
          client_photo: null,
          vendor_name: planningVendor.name,
          vendor_logo: planningVendor.logoUrl || null,
          participants: [user.uid, planningVendor.pro_account_uid].filter(Boolean),
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
        const responseContent = `Re : créneau du ${dateLabel} à ${slotTime} — ${slotTitle}\n\n${text}`;
        await addDocument('messages', {
          conversation_id: conversationId,
          sender_id: user.uid,
          sender_role: 'planner',
          sender_name: 'Moi',
          content: responseContent,
          created_at: new Date(),
        });
        await updateDocument('conversations', conversationId, {
          last_message: `Re : ${text.slice(0, 120)}`,
          last_message_at: new Date(),
          unread_count_vendor: 1,
        });
      }

      await updateDocument('planning_requests', requestId, {
        status: 'answered',
        response: text,
        responded_at: new Date(),
        responded_by: user.uid,
        updated_at: new Date(),
      });

      setPlanningRequests((prev) => prev.filter((r) => r.id !== requestId));
      setReplyTextByRequest((prev) => {
        const next = { ...prev };
        delete next[requestId];
        return next;
      });

      // Notify vendor
      try {
        if (req.vendor_uid) {
          await addDocument('notifications', {
            recipient_id: req.vendor_uid,
            type: 'slot_question_reply',
            title: 'Réponse à votre question',
            message: `Votre wedding planner a répondu à votre question sur le créneau "${slotTitle}" (${slotTime}) du ${slotDate || 'mariage'}.`,
            link: '/espace-pro/messages',
            read: false,
            created_at: new Date(),
            planner_id: user.uid,
            client_id: clientId,
            vendor_id: planningVendor.id,
          });
        }
      } catch { /* non-blocking */ }

      try {
        if (req.vendor_uid) {
          const { sendEmailToUid } = await import('@/lib/email');
          await sendEmailToUid({
            recipientUid: req.vendor_uid,
            subject: `Réponse à votre question - ${clientNames}`,
            text: `Bonjour,\n\nVotre wedding planner a répondu à votre question concernant le créneau du ${slotDate ? new Date(slotDate + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'} à ${slotTime} — ${slotTitle}.\n\nRéponse :\n${text}\n\nConnectez-vous à votre espace pro pour consulter la conversation.\n\nLe Oui Parfait`,
          });
        }
      } catch { /* non-blocking */ }

      toast.success('Réponse envoyée au prestataire');
    } catch (e) {
      console.error('Error replying to slot question:', e);
      toast.error("Erreur lors de l'envoi de la réponse");
    } finally {
      setSendingReplyId(null);
    }
  };

  const savePlanning = async () => {
    if (!planningVendor || !user?.uid) return;
    if (planningDays.length === 0) {
      toast.error('Ajoutez au moins un jour');
      return;
    }
    const daysToSave = planningDays.filter((d) => d.date);
    const hasContent = daysToSave.some((d) => d.slots.some((s) => s.time || s.title)) || planningNotes || planningDocUrl;
    if (!hasContent) {
      toast.error('Ajoutez au moins un créneau, une note ou un document');
      return;
    }
    setSavingPlanning(true);
    try {
      // Save or update global planning info (notes + doc)
      const globalData: any = {
        vendor_id: planningVendor.id,
        vendor_uid: planningVendor.pro_account_uid || null,
        planner_id: user.uid,
        client_id: clientId,
        vendor_name: planningVendor.name,
        notes: planningNotes,
        doc_url: planningDocUrl,
        doc_name: planningDocName,
        updated_at: new Date().toISOString(),
      };

      if (planningGlobalId) {
        await updateDocument('vendor_plannings', planningGlobalId, globalData);
        setPlanningGlobal((prev: any) => ({ ...prev, ...globalData }));
      } else {
        const created = await addDocument('vendor_plannings', {
          ...globalData,
          created_at: new Date().toISOString(),
        });
        setPlanningGlobalId(created.id);
        setPlanningGlobal({ ...globalData, id: created.id });
      }

      // Save days
      for (const day of daysToSave) {
        const validSlots = day.slots.filter((s) => s.time || s.title);
        const data: any = {
          vendor_id: planningVendor.id,
          vendor_uid: planningVendor.pro_account_uid || null,
          planner_id: user.uid,
          client_id: clientId,
          vendor_name: planningVendor.name,
          date: day.date,
          slots: validSlots,
          updated_at: new Date().toISOString(),
        };

        if (day.id) {
          await updateDocument('vendor_planning_days', day.id, data);
        } else {
          await addDocument('vendor_planning_days', {
            ...data,
            created_at: new Date().toISOString(),
          });
        }
      }

      // Notify the vendor
      if (planningVendor.pro_account_uid) {
        // Fetch client names for context
        let coupleNames = '';
        try {
          const clientDoc = (await getDocument('clients', clientId)) as any;
          if (clientDoc) {
            coupleNames = `${clientDoc.name || ''}${clientDoc.name && clientDoc.partner ? ' & ' : ''}${clientDoc.partner || ''}`.trim();
          }
        } catch {
          // non-blocking
        }

        try {
          await addDocument('notifications', {
            recipient_id: planningVendor.pro_account_uid,
            type: 'planning',
            title: 'Planning du mariage mis à jour',
            message: `Le planning du mariage${coupleNames ? ` de ${coupleNames}` : ''} a été mis à jour par votre wedding planner.`,
            link: '/espace-pro/mariages',
            read: false,
            created_at: new Date(),
          });
        } catch {
          // non-blocking
        }

        try {
          const { sendEmailToUid } = await import('@/lib/email');
          await sendEmailToUid({
            recipientUid: planningVendor.pro_account_uid,
            subject: `Planning du mariage${coupleNames ? ` de ${coupleNames}` : ''} mis à jour - Le Oui Parfait`,
            text: `Bonjour ${planningVendor.name},\n\nVotre wedding planner a mis à jour le planning du mariage${coupleNames ? ` de ${coupleNames}` : ''}.\n\nConnectez-vous à votre espace pro pour le consulter.\n\nLe Oui Parfait`,
          });
        } catch (e) {
          console.warn('Unable to send planning email:', e);
        }

        try {
          const { sendPushToRecipient } = await import('@/lib/push');
          await sendPushToRecipient({
            recipientId: planningVendor.pro_account_uid,
            title: 'Planning mis à jour',
            body: `Le planning du mariage${coupleNames ? ` de ${coupleNames}` : ''} a été mis à jour.`,
            link: '/espace-pro/mariages',
          });
        } catch (e) {
          console.warn('Unable to send planning push:', e);
        }
      }

      toast.success('Planning enregistré et envoyé au prestataire');
      setPlanningOpen(false);
    } catch (e: any) {
      console.error('Error saving planning:', e);
      toast.error(e?.message || "Erreur lors de l'enregistrement");
    } finally {
      setSavingPlanning(false);
    }
  };

  const handleExportPlanning = () => {
    if (!planningVendor || planningDays.length === 0) return;

    const clientDocName = vendors.find((v) => v.id === planningVendor.id)?.name || '';
    const rows = planningDays.map((day) => {
      const dateStr = day.date
        ? new Date(day.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        : '—';
      const slotsHtml = day.slots.length
        ? day.slots
            .slice()
            .sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')))
            .map((s) => `
              <tr>
                <td style="padding: 10px 12px; border-bottom: 1px solid #eee; white-space: nowrap; font-weight: 600; color: #88b7b5;">${s.time || '—'}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #eee;">
                  <div style="font-weight: 600; color: #4B4456;">${s.title || 'Sans titre'}</div>
                  ${s.description ? `<div style="font-size: 12px; color: #9C97A3; margin-top: 4px;">${s.description}</div>` : ''}
                </td>
              </tr>
            `)
            .join('')
        : '<tr><td colspan="2" style="padding: 12px; color: #9C97A3; text-align: center;">Aucun créneau</td></tr>';
      return `
        <div style="margin-bottom: 32px; page-break-inside: avoid;">
          <h2 style="font-size: 18px; color: #4B4456; margin: 0 0 12px; border-bottom: 2px solid #88b7b5; padding-bottom: 6px;">${dateStr}</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr style="background: #FAF9F7;">
                <th style="width: 100px; padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #9C97A3;">Heure</th>
                <th style="padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #9C97A3;">Détail</th>
              </tr>
            </thead>
            <tbody>
              ${slotsHtml}
            </tbody>
          </table>
        </div>
      `;
    }).join('');

    const globalNotesHtml = planningNotes ? `<div style="margin-bottom: 24px; padding: 16px; background: #FAF9F7; border-radius: 8px;"><h3 style="font-size: 14px; margin: 0 0 8px; color: #4B4456;">Consignes générales</h3><p style="margin: 0; font-size: 13px; color: #4B4456; white-space: pre-wrap;">${planningNotes}</p></div>` : '';
    const globalDocHtml = planningDocUrl ? `<div style="margin-bottom: 24px;"><h3 style="font-size: 14px; margin: 0 0 8px; color: #4B4456;">Document de planning</h3><a href="${planningDocUrl}" target="_blank" style="color: #88b7b5; font-size: 13px;">${planningDocName || 'Télécharger le document'}</a></div>` : '';

    const html = `
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="utf-8">
          <title>Planning — ${clientDocName}</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 40px; color: #4B4456; }
            h1 { font-size: 24px; margin-bottom: 8px; }
            .subtitle { font-size: 14px; color: #9C97A3; margin-bottom: 32px; }
            @media print {
              body { margin: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body onload="setTimeout(function(){ window.print(); }, 100);">
          <script>
            window.onafterprint = function() {
              if (window.opener) window.opener.focus();
              window.close();
            };
          </script>
          <div class="no-print" style="margin-bottom: 24px; text-align: right;">
            <button onclick="window.print()" style="padding: 10px 18px; background: #88b7b5; color: white; border: none; border-radius: 999px; cursor: pointer; font-weight: 600;">Imprimer / Enregistrer en PDF</button>
          </div>
          <h1>Planning — ${clientDocName}</h1>
          <p class="subtitle">${clientNames ? `Mariage de ${clientNames}` : 'Mariage du client'}${weddingDate ? ` — ${new Date(weddingDate + 'T00:00:00').toLocaleDateString('fr-FR')}` : ''}</p>
          ${globalNotesHtml}
          ${globalDocHtml}
          ${rows}
          <p style="margin-top: 40px; font-size: 11px; color: #9C97A3; text-align: center;">Le Oui Parfait — Exporté le ${new Date().toLocaleDateString('fr-FR')}</p>
        </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
      toast.error('Veuillez autoriser les popups pour exporter le planning');
      return;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title={
            <span className="flex items-center gap-2 sm:gap-3">
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-brand-turquoise" />
              Prestataires
            </span>
          }
          description="Assignez les prestataires qui doivent apparaître côté client."
        >
          <Button variant="outline" onClick={() => router.back()} className="w-full sm:w-auto gap-2">
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
        </PageHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-brand-turquoise" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 shadow-xl border-0">
              <h3 className="text-lg font-bold text-brand-purple mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-brand-turquoise" />
                Assignés ({assignedVendors.length})
              </h3>

              {assignedVendors.length === 0 ? (
                <p className="text-sm text-brand-gray">Aucun prestataire assigné.</p>
              ) : (
                <div className="space-y-2">
                  {assignedVendors.map((v) => {
                    const link = assignedLinks.find((l) => l.vendor_id === v.id);
                    const notifiedAt = link?.notified_at;
                    const notifiedDate = notifiedAt
                      ? new Date(notifiedAt?.toDate ? notifiedAt.toDate() : notifiedAt).toLocaleDateString('fr-FR')
                      : '';
                    return (
                      <div key={v.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 p-3 rounded-lg bg-gray-50">
                        <div className="min-w-0 flex-1 flex items-center gap-3">
                          <div className="relative h-10 w-10 rounded-full bg-white border border-gray-200 overflow-hidden flex-shrink-0">
                            {v.logoUrl ? (
                              <Image src={v.logoUrl} alt={v.name} fill sizes="40px" className="object-cover" />
                            ) : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-brand-purple text-sm">{v.name}</p>
                            <p className="flex flex-wrap items-center gap-x-2 text-xs">
                              {notifiedAt ? (
                                <span className="inline-flex items-center gap-1 font-medium text-brand-turquoise">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Notifié le {notifiedDate}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 font-medium text-amber-600">
                                  <Clock className="h-3 w-3" />
                                  Non notifié
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Button
                            size="icon"
                            className="h-8 w-8 bg-brand-purple hover:bg-brand-purple/90"
                            title={notifiedAt ? 'Renvoyer la notification' : 'Notifier le prestataire'}
                            onClick={() => setNotifyTarget(v)}
                            disabled={!!notifyingVendorId || !!assigningVendorId || !!unassigningVendorId}
                          >
                            {notifyingVendorId === v.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Bell className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8 text-brand-turquoise border-brand-turquoise/30 hover:bg-brand-turquoise/5"
                            title="Planning"
                            onClick={() => void openPlanning(v)}
                          >
                            <Calendar className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                            title="Retirer du mariage"
                            onClick={() => void unassignVendor(v.id)}
                            disabled={!!unassigningVendorId || !!assigningVendorId || !!notifyingVendorId}
                          >
                            {unassigningVendorId === v.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card className="p-6 shadow-xl border-0">
              <h3 className="text-lg font-bold text-brand-purple mb-4">Catalogue prestataires</h3>

              <Input
                placeholder="Rechercher un prestataire..."
                className="mb-4"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              {filteredVendors.length === 0 ? (
                <p className="text-sm text-brand-gray">Aucun prestataire.</p>
              ) : (
                <div className="space-y-2">
                  {filteredVendors.map((v) => {
                    const assigned = assignedVendorIds.has(v.id);
                    return (
                      <div key={v.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-gray-50 gap-3">
                        <div className="min-w-0 flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-white border border-gray-200 overflow-hidden flex-shrink-0">
                            {v.logoUrl ? (
                              <img src={v.logoUrl} alt={v.name} className="h-full w-full object-cover" />
                            ) : null}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-brand-purple text-sm truncate">{v.name}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 leading-4">{getCategoryLabel(v.category)}</Badge>
                              {v.city ? <span className="text-xs text-brand-gray">{v.city}</span> : null}
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={assigned ? 'outline' : 'default'}
                          className={assigned ? 'w-full sm:w-auto' : 'bg-brand-turquoise hover:bg-brand-turquoise-hover w-full sm:w-auto'}
                          onClick={() => void assignVendor(v)}
                          disabled={assigned || !!assigningVendorId || !!unassigningVendorId}
                        >
                          {assigningVendorId === v.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : assigned ? (
                            'Assigné'
                          ) : (
                            'Assigner'
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>

      {/* Planning dialog */}
      <Dialog open={planningOpen} onOpenChange={setPlanningOpen}>
        <DialogContent className="sm:max-w-[700px] w-[95vw] rounded-[20px] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <div className="w-12 h-12 rounded-full bg-[rgba(136,183,181,0.12)] flex items-center justify-center mb-3">
              <Calendar className="h-6 w-6 text-[#88b7b5]" />
            </div>
            <DialogTitle className="text-[18px] font-baskerville text-[#4B4456]">
              Planning — {planningVendor?.name}
              {clientNames && (
                <span className="block text-sm font-medium text-[#88b7b5] mt-1">
                  {clientNames}
                </span>
              )}
              {(planningGlobal?.status === 'validated' || planningGlobal?.validated_by_vendor) && (
                <span className="inline-flex items-center gap-1 mt-2 text-[11px] font-bold uppercase tracking-wide bg-[#88b7b5] text-white px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Validé par le prestataire
                </span>
              )}
            </DialogTitle>
            <DialogDescription className="text-[13px] text-[#9C97A3]">
              Ajoutez les jours et créneaux du planning pour ce prestataire. Il verra la mise à jour sur son espace pro.
              {weddingDate ? ` Jour J : ${weddingDate.split('-').reverse().join('/')}` : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {planningRequests.length > 0 && (
              <div className="space-y-3">
                {planningRequests.map((req) => (
                  <div key={req.id} className="rounded-xl border border-[#C9A96E]/25 bg-[#FFFBF3] p-4">
                    <div className="flex items-start gap-3">
                      <FileText className="w-4 h-4 text-[#C9A96E] shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-[#4B4456] mb-1">
                          {req.request_type === 'slot_question' ? 'Question sur un créneau' : 'Demande de modification'} {req.vendor_name ? `— ${req.vendor_name}` : ''}
                        </p>
                        {req.request_type === 'slot_question' && (
                          <p className="text-[11px] text-[#9C97A3] mb-1">
                            {req.wedding_date ? `Mariage le ${req.wedding_date.split('-').reverse().join('/')} · ` : ''}
                            {req.slot_date ? `${req.slot_date.split('-').reverse().join('/')} · ` : ''}
                            {req.slot_time || '—'} · {req.slot_title || 'Sans titre'}
                          </p>
                        )}
                        <p className="text-[13px] text-[#4B4456] whitespace-pre-wrap">{req.message}</p>
                        {req.request_type === 'slot_question' && req.status === 'answered' && req.response && (
                          <div className="mt-2 p-2.5 rounded-lg bg-[#88b7b5]/10 border border-[#88b7b5]/20">
                            <p className="text-[10px] font-semibold text-[#88b7b5] uppercase tracking-wide mb-1">Réponse envoyée</p>
                            <p className="text-[13px] text-[#4B4456] whitespace-pre-wrap">{req.response}</p>
                          </div>
                        )}
                        {req.created_at && (
                          <p className="text-[11px] text-[#9C97A3] mt-2">
                            {(() => {
                              try {
                                const d = req.created_at.toDate ? req.created_at.toDate() : new Date(req.created_at);
                                return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
                              } catch { return ''; }
                            })()}
                          </p>
                        )}
                      </div>
                      {req.status === 'answered' ? (
                        <span className="text-[10px] font-bold uppercase tracking-wide bg-[#88b7b5] text-white px-2 py-0.5 rounded-full shrink-0">Répondu</span>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          className="bg-[#C9A96E] hover:bg-[#b89a62] text-white rounded-full shrink-0"
                          onClick={() => handleProcessPlanningRequest(req.id)}
                          disabled={processingRequestId === req.id}
                        >
                          {processingRequestId === req.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Traiter'}
                        </Button>
                      )}
                    </div>

                    {req.request_type === 'slot_question' && req.status !== 'answered' && (
                      <div className="mt-3 space-y-2 border-t border-[#C9A96E]/15 pt-3">
                        <Textarea
                          value={replyTextByRequest[req.id] || ''}
                          onChange={(e) => setReplyTextByRequest((prev) => ({ ...prev, [req.id]: e.target.value }))}
                          placeholder="Votre réponse au prestataire..."
                          className="min-h-[80px] text-sm resize-none border-[#C9A96E]/20 bg-white"
                        />
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            size="sm"
                            className="bg-[#88b7b5] hover:bg-[#7aa9a7] text-white gap-1"
                            onClick={() => handleReplyToQuestion(req.id)}
                            disabled={!replyTextByRequest[req.id]?.trim() || sendingReplyId === req.id}
                          >
                            {sendingReplyId === req.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                            Répondre
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-end justify-between gap-2">
              <div className="flex-1">
                <Label className="text-[12px] font-semibold text-[#4B4456] uppercase tracking-wide mb-1.5 block">
                  Sélectionner un jour
                </Label>
                <Input
                  type="date"
                  value={newDayDate}
                  onChange={(e) => setNewDayDate(e.target.value)}
                  className="rounded-lg border-[rgba(75,68,86,0.1)] h-9 text-sm"
                />
              </div>
              <Button
                type="button"
                size="sm"
                className="bg-[#88b7b5] hover:bg-[#7aa9a7] gap-1 rounded-full h-9"
                onClick={addDay}
                disabled={!newDayDate}
              >
                <Plus className="h-3.5 w-3.5" />
                Ajouter le jour
              </Button>
            </div>

            {/* Days list */}
            {planningDays.length === 0 ? (
              <div className="text-center py-8 bg-[#FAF9F7] rounded-xl border border-[rgba(75,68,86,0.05)]">
                <Calendar className="h-8 w-8 text-[#9C97A3] mx-auto mb-2 opacity-40" />
                <p className="text-[12px] text-[#9C97A3]">Aucun jour ajouté.</p>
                <p className="text-[11px] text-[#9C97A3] mt-1">Sélectionnez une date (avant, pendant ou après le mariage).</p>
              </div>
            ) : (
              <div className="space-y-3">
                {planningDays.map((day, dayIdx) => (
                  <div key={dayIdx} className="rounded-xl border border-[rgba(75,68,86,0.08)] overflow-hidden">
                    <div
                      className="flex items-start justify-between px-4 py-3 bg-[#FAF9F7] cursor-pointer hover:bg-[rgba(136,183,181,0.04)] gap-2"
                      onClick={() => toggleDayOpen(dayIdx)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Calendar className="h-4 w-4 text-[#88b7b5] shrink-0" />
                          <span className="text-[14px] font-semibold text-[#4B4456]">
                            {day.date ? new Date(day.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                          </span>
                          {(() => {
                            const rel = getRelativeDayLabel(day.date, weddingDate);
                            return rel ? (
                              <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${rel === 'Jour J' ? 'bg-[#88b7b5] text-white' : 'bg-[#C9A96E]/15 text-[#C9A96E]'}`}>
                                {rel}
                              </span>
                            ) : null;
                          })()}
                        </div>
                        {day.slots.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[#9C97A3]">
                            {day.slots
                              .filter((s) => s.time || s.title)
                              .map((s, i, arr) => (
                                <span key={i} className="inline-flex items-center gap-1">
                                  <span className="font-medium text-[#4B4456]">{s.time || '—'}</span>
                                  <span>{s.title || 'Sans titre'}</span>
                                  {i < arr.length - 1 && <span className="text-[#9C97A3] mx-0.5">|</span>}
                                </span>
                              ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0 pt-0.5">
                        <span className="text-[11px] text-[#9C97A3]">{day.slots.length} créneau{day.slots.length > 1 ? 'x' : ''}</span>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-[#B9847F]"
                          onClick={(e) => { e.stopPropagation(); removeDay(dayIdx); }}
                          title="Supprimer ce jour"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {day.isOpen && (
                      <div className="p-4 space-y-4 bg-white">
                        {/* Créneaux */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-[12px] font-semibold text-[#4B4456] uppercase tracking-wide flex items-center gap-2">
                              <Clock className="w-3.5 h-3.5 text-[#88b7b5]" />
                              Créneaux
                            </Label>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-[#88b7b5] hover:bg-[rgba(136,183,181,0.08)] gap-1"
                              onClick={() => addSlot(dayIdx)}
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Ajouter
                            </Button>
                          </div>

                          <div className="space-y-2">
                            {day.slots.map((slot, idx) => (
                              <div key={idx} className="flex items-start gap-2 p-3 rounded-xl bg-[#FAF9F7] border border-[rgba(75,68,86,0.05)]">
                                <Input
                                  type="time"
                                  value={slot.time}
                                  onChange={(e) => updateSlot(dayIdx, idx, 'time', e.target.value)}
                                  className="w-[110px] shrink-0 rounded-lg border-[rgba(75,68,86,0.1)] h-9 text-sm"
                                />
                                <div className="flex-1 space-y-1.5">
                                  <Input
                                    value={slot.title}
                                    onChange={(e) => updateSlot(dayIdx, idx, 'title', e.target.value)}
                                    placeholder="Titre (ex: Cérémonie, Photos couple...)"
                                    className="rounded-lg border-[rgba(75,68,86,0.1)] h-9 text-sm"
                                  />
                                  <Input
                                    value={slot.description}
                                    onChange={(e) => updateSlot(dayIdx, idx, 'description', e.target.value)}
                                    placeholder="Détail (optionnel)"
                                    className="rounded-lg border-[rgba(75,68,86,0.1)] h-9 text-sm"
                                  />
                                </div>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-9 w-9 shrink-0 text-[#B9847F] hover:bg-[rgba(185,132,127,0.08)]"
                                  onClick={() => removeSlot(dayIdx, idx)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                            {day.slots.length === 0 && (
                              <p className="text-[12px] text-[#9C97A3] text-center py-3">Aucun créneau. Cliquez sur "Ajouter".</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Consignes générales globales */}
            <div>
              <Label className="text-[12px] font-semibold text-[#4B4456] uppercase tracking-wide mb-1.5 block">
                Consignes générales
              </Label>
              <Textarea
                value={planningNotes}
                onChange={(e) => setPlanningNotes(e.target.value)}
                placeholder="Lieu de RDV, contacts, consignes particulières..."
                className="rounded-xl border-[rgba(75,68,86,0.1)] min-h-[80px] text-sm resize-none"
              />
            </div>

            {/* Document de planning global */}
            <div>
              <Label className="text-[12px] font-semibold text-[#4B4456] uppercase tracking-wide mb-1.5 block">
                Document de planning (PDF, Word...)
              </Label>
              {planningDocUrl ? (
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF9F7] border border-[rgba(75,68,86,0.05)]">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-[#88b7b5] shrink-0" />
                    <span className="text-sm text-[#4B4456] truncate">{planningDocName || 'Document'}</span>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <a
                      href={planningDocUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#88b7b5] hover:text-[#7aa9a7] text-xs font-medium px-2"
                    >
                      Voir
                    </a>
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-[#B9847F]" onClick={removePlanningDoc}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 border-dashed border-[rgba(75,68,86,0.1)] cursor-pointer hover:bg-[#FAF9F7] transition-colors">
                  {uploadingPlanning ? (
                    <Loader2 className="h-5 w-5 text-[#88b7b5] animate-spin" />
                  ) : (
                    <Upload className="h-5 w-5 text-[#9C97A3]" />
                  )}
                  <span className="text-[12px] text-[#9C97A3]">
                    {uploadingPlanning ? 'Upload en cours...' : 'Cliquez pour uploader un document'}
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,image/*"
                    onChange={handlePlanningDocUpload}
                    disabled={uploadingPlanning}
                  />
                </label>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPlanningOpen(false)}
              disabled={savingPlanning}
              className="rounded-full"
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2 rounded-full border-[#C9A96E] text-[#C9A96E] hover:bg-[#C9A96E]/5"
              onClick={handleExportPlanning}
              disabled={planningDays.length === 0 || savingPlanning}
            >
              <FileText className="h-3.5 w-3.5" />
              Exporter
            </Button>
            <Button
              type="button"
              onClick={savePlanning}
              disabled={savingPlanning}
              className="bg-[#88b7b5] hover:bg-[#7aa9a7] gap-2 rounded-full"
            >
              {savingPlanning && <Loader2 className="h-4 w-4 animate-spin" />}
              <Calendar className="h-4 w-4" />
              Enregistrer & envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation envoi de la notification au prestataire */}
      <Dialog open={!!notifyTarget} onOpenChange={(o) => { if (!o) setNotifyTarget(null); }}>
        <DialogContent className="sm:max-w-[420px] w-[95vw] rounded-[20px]">
          <DialogHeader className="pb-2">
            <div className="w-12 h-12 rounded-full bg-brand-purple/10 flex items-center justify-center mb-3">
              <Bell className="h-6 w-6 text-brand-purple" />
            </div>
            <DialogTitle className="text-[18px] font-baskerville text-[#4B4456]">
              Notifier {notifyTarget?.name} ?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-brand-gray leading-relaxed">
            Le prestataire recevra une notification et un email, et le mariage
            deviendra visible dans son espace pro.
          </p>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setNotifyTarget(null)} disabled={!!notifyingVendorId}>
              Annuler
            </Button>
            <Button
              className="bg-brand-purple hover:bg-brand-purple/90 gap-1.5"
              disabled={!!notifyingVendorId}
              onClick={() => { if (notifyTarget) void sendVendorNotification(notifyTarget); }}
            >
              {notifyingVendorId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
              Envoyer la notification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
