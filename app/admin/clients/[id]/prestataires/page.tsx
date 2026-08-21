'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Users, Calendar, Plus, Trash2, Clock, Upload, FileText, X } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { addDocument, deleteDocument, getDocuments, getDocument, updateDocument } from '@/lib/db';
import { uploadFile } from '@/lib/storage';
import { toast } from 'sonner';
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

  // Planning state
  const [planningOpen, setPlanningOpen] = useState(false);
  const [planningVendor, setPlanningVendor] = useState<Vendor | null>(null);
  const [planningSlots, setPlanningSlots] = useState<{ time: string; title: string; description: string }[]>([]);
  const [planningNotes, setPlanningNotes] = useState('');
  const [planningDocUrl, setPlanningDocUrl] = useState<string | null>(null);
  const [planningDocName, setPlanningDocName] = useState<string | null>(null);
  const [planningId, setPlanningId] = useState<string | null>(null);
  const [savingPlanning, setSavingPlanning] = useState(false);
  const [uploadingPlanning, setUploadingPlanning] = useState(false);

  const fetchAll = async () => {
    if (!user?.uid || !clientId) return;
    setLoading(true);
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
      })) as ClientVendorLink[];

      setVendors(mappedVendors);
      setAssignedLinks(mappedLinks);
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
    void fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, clientId]);

  const assignedVendorIds = useMemo(() => new Set(assignedLinks.map((l) => l.vendor_id)), [assignedLinks]);

  const filteredVendors = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = vendors.slice().sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    if (!q) return list;
    return list.filter((v) => {
      const hay = `${v.name} ${v.category} ${v.city || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [vendors, search]);

  const assignVendor = async (vendor: Vendor) => {
    if (!user?.uid) return;
    if (assignedVendorIds.has(vendor.id)) return;

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
      await fetchAll();
    } catch (e) {
      console.error('Error assigning vendor:', e);
      toast.error("Impossible d'assigner le prestataire");
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
        updated_at: new Date().toISOString(),
      };

      if ((existing as any[]).length > 0) {
        const existingId = (existing as any[])[0].id;
        await updateDocument('vendor_bookings', existingId, bookingData);
      } else {
        await addDocument('vendor_bookings', {
          ...bookingData,
          created_at: new Date().toISOString(),
        });
      }

      // Always notify the vendor if they have a pro account (both for new and updated bookings)
      if (vendor.pro_account_uid) {
        try {
          await addDocument('notifications', {
            recipient_id: vendor.pro_account_uid,
            type: 'booking',
            title: 'Nouveau mariage assigné',
            message: `Vous avez été booked pour le mariage de ${clientNames}${weddingDate ? ` le ${weddingDate.split('-').reverse().join('/')}` : ''}.`,
            link: '/espace-pro/mariages',
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
            recipientUid: vendor.pro_account_uid,
            subject: 'Nouveau mariage assigné - Le Oui Parfait',
            text: `Bonjour,\n\nVous avez été booked pour le mariage de ${clientNames}${weddingDate ? ` prévu le ${weddingDate.split('-').reverse().join('/')}` : ''}.\n\nRetrouvez tous les détails sur votre espace pro.\n\nLe Oui Parfait`,
          });
        } catch (e) {
          console.warn('Unable to send vendor booking email:', e);
        }

        // Send push
        try {
          const { sendPushToRecipient } = await import('@/lib/push');
          await sendPushToRecipient({
            recipientId: vendor.pro_account_uid,
            title: 'Nouveau mariage assigné',
            body: `Vous avez été booked pour le mariage de ${clientNames}.`,
            link: '/espace-pro/mariages',
          });
        } catch (e) {
          console.warn('Unable to send vendor push:', e);
        }
      }
    } catch (e: any) {
      console.error('Error syncing vendor booking:', e);
      toast.error(`Erreur sync booking pro: ${e?.message || 'Erreur inconnue'}. Le prestataire est assigné mais son espace pro n'est pas mis à jour.`);
    }
  };

  const unassignVendor = async (vendorId: string) => {
    const link = assignedLinks.find((l) => l.vendor_id === vendorId);
    if (!link) return;

    if (!confirm('Retirer ce prestataire du client ?')) return;

    try {
      await deleteDocument('client_vendors', link.id);

      // Cancel the vendor_booking (single-field query to avoid composite index)
      const allBookings = await getDocuments('vendor_bookings', [
        { field: 'vendor_id', operator: '==', value: vendorId },
      ]);
      const bookings = (allBookings as any[]).filter((b) => b.client_id === clientId);
      for (const bk of bookings) {
        await updateDocument('vendor_bookings', bk.id, {
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        });
      }

      toast.success('Prestataire retiré');
      await fetchAll();
    } catch (e) {
      console.error('Error unassigning vendor:', e);
      toast.error('Erreur lors du retrait');
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
    setPlanningSlots([{ time: '', title: '', description: '' }]);
    setPlanningNotes('');
    setPlanningDocUrl(null);
    setPlanningDocName(null);
    setPlanningId(null);

    // Load existing planning
    try {
      const allPlannings = await getDocuments('vendor_plannings', [
        { field: 'vendor_id', operator: '==', value: vendor.id },
      ]);
      const existing = (allPlannings as any[]).find((p) => p.client_id === clientId);
      if (existing) {
        setPlanningId(existing.id);
        setPlanningSlots(existing.slots?.length ? existing.slots : [{ time: '', title: '', description: '' }]);
        setPlanningNotes(existing.notes || '');
        setPlanningDocUrl(existing.doc_url || null);
        setPlanningDocName(existing.doc_name || null);
      }
    } catch (e) {
      console.error('Error loading planning:', e);
    }
  };

  const addSlot = () => {
    setPlanningSlots([...planningSlots, { time: '', title: '', description: '' }]);
  };

  const updateSlot = (idx: number, field: 'time' | 'title' | 'description', value: string) => {
    setPlanningSlots(planningSlots.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  };

  const removeSlot = (idx: number) => {
    setPlanningSlots(planningSlots.filter((_, i) => i !== idx));
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

  const savePlanning = async () => {
    if (!planningVendor || !user?.uid) return;
    const validSlots = planningSlots.filter((s) => s.time || s.title);
    if (validSlots.length === 0 && !planningNotes && !planningDocUrl) {
      toast.error('Ajoutez au moins un créneau, une note ou un document');
      return;
    }
    setSavingPlanning(true);
    try {
      const data: any = {
        vendor_id: planningVendor.id,
        vendor_uid: planningVendor.pro_account_uid || null,
        planner_id: user.uid,
        client_id: clientId,
        vendor_name: planningVendor.name,
        slots: validSlots,
        notes: planningNotes,
        doc_url: planningDocUrl,
        doc_name: planningDocName,
        updated_at: new Date().toISOString(),
      };

      if (planningId) {
        await updateDocument('vendor_plannings', planningId, data);
      } else {
        const created = await addDocument('vendor_plannings', {
          ...data,
          created_at: new Date().toISOString(),
        });
        setPlanningId(created.id);
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
                  {assignedVendors.map((v) => (
                    <div key={v.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-gray-50 gap-3">
                      <div className="min-w-0 flex items-center gap-3">
                        <div className="relative h-10 w-10 rounded-full bg-white border border-gray-200 overflow-hidden flex-shrink-0">
                          {v.logoUrl ? (
                            <Image src={v.logoUrl} alt={v.name} fill sizes="40px" className="object-cover" />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-brand-purple text-sm truncate">{v.name}</p>
                          <p className="text-xs text-brand-gray">{v.category}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-brand-turquoise border-brand-turquoise/30 hover:bg-brand-turquoise/5"
                          onClick={() => void openPlanning(v)}
                        >
                          <Calendar className="h-3.5 w-3.5" />
                          Planning
                        </Button>
                        <Button size="sm" variant="destructive" className="w-full sm:w-auto" onClick={() => void unassignVendor(v.id)}>
                          Retirer
                        </Button>
                      </div>
                    </div>
                  ))}
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
                              <Badge variant="outline" className="text-xs">{v.category}</Badge>
                              {v.city ? <span className="text-xs text-brand-gray">{v.city}</span> : null}
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={assigned ? 'outline' : 'default'}
                          className={assigned ? 'w-full sm:w-auto' : 'bg-brand-turquoise hover:bg-brand-turquoise-hover w-full sm:w-auto'}
                          onClick={() => void assignVendor(v)}
                          disabled={assigned}
                        >
                          {assigned ? 'Assigné' : 'Assigner'}
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
        <DialogContent className="sm:max-w-[640px] w-[95vw] rounded-[20px] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <div className="w-12 h-12 rounded-full bg-[rgba(136,183,181,0.12)] flex items-center justify-center mb-3">
              <Calendar className="h-6 w-6 text-[#88b7b5]" />
            </div>
            <DialogTitle className="text-[18px] font-baskerville text-[#4B4456]">
              {planningId ? 'Modifier le planning' : 'Créer le planning'} — {planningVendor?.name}
            </DialogTitle>
            <DialogDescription className="text-[13px] text-[#9C97A3]">
              {planningId
                ? 'Modifiez le déroulé du jour. Le prestataire verra la mise à jour sur son espace pro.'
                : 'Créez le déroulé du jour pour ce prestataire. Il le verra sur son espace pro.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Créneaux horaires */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-[12px] font-semibold text-[#4B4456] uppercase tracking-wide flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-[#88b7b5]" />
                  Créneaux horaires
                </Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-[#88b7b5] hover:bg-[rgba(136,183,181,0.08)] gap-1"
                  onClick={addSlot}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Ajouter
                </Button>
              </div>

              <div className="space-y-2">
                {planningSlots.map((slot, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-3 rounded-xl bg-[#FAF9F7] border border-[rgba(75,68,86,0.05)]">
                    <Input
                      type="time"
                      value={slot.time}
                      onChange={(e) => updateSlot(idx, 'time', e.target.value)}
                      className="w-[110px] shrink-0 rounded-lg border-[rgba(75,68,86,0.1)] h-9 text-sm"
                    />
                    <div className="flex-1 space-y-1.5">
                      <Input
                        value={slot.title}
                        onChange={(e) => updateSlot(idx, 'title', e.target.value)}
                        placeholder="Titre (ex: Cérémonie, Photos couple...)"
                        className="rounded-lg border-[rgba(75,68,86,0.1)] h-9 text-sm"
                      />
                      <Input
                        value={slot.description}
                        onChange={(e) => updateSlot(idx, 'description', e.target.value)}
                        placeholder="Détail (optionnel)"
                        className="rounded-lg border-[rgba(75,68,86,0.1)] h-9 text-sm"
                      />
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 shrink-0 text-[#B9847F] hover:bg-[rgba(185,132,127,0.08)]"
                      onClick={() => removeSlot(idx)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {planningSlots.length === 0 && (
                  <p className="text-[12px] text-[#9C97A3] text-center py-3">Aucun créneau. Cliquez sur "Ajouter".</p>
                )}
              </div>
            </div>

            {/* Notes / consignes générales */}
            <div>
              <Label className="text-[12px] font-semibold text-[#4B4456] uppercase tracking-wide mb-2 block">
                Consignes générales
              </Label>
              <Textarea
                value={planningNotes}
                onChange={(e) => setPlanningNotes(e.target.value)}
                placeholder="Lieu de RDV, contacts, consignes particulières..."
                className="rounded-xl border-[rgba(75,68,86,0.1)] min-h-[80px] text-sm resize-none"
              />
            </div>

            {/* Document de planning */}
            <div>
              <Label className="text-[12px] font-semibold text-[#4B4456] uppercase tracking-wide mb-2 block">
                Document de planning (PDF, Word...)
              </Label>
              {planningDocUrl ? (
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF9F7] border border-[rgba(75,68,86,0.05)]">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-[#88b7b5] shrink-0" />
                    <span className="text-sm text-[#4B4456] truncate">{planningDocName || 'Document'}</span>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <a href={planningDocUrl} target="_blank" rel="noopener noreferrer" className="text-[#88b7b5] hover:text-[#7aa9a7] text-xs font-medium px-2">
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
              onClick={savePlanning}
              disabled={savingPlanning}
              className="bg-[#88b7b5] hover:bg-[#7aa9a7] gap-2 rounded-full"
            >
              {savingPlanning && <Loader2 className="h-4 w-4 animate-spin" />}
              <Calendar className="h-4 w-4" />
              {planningId ? 'Mettre à jour & envoyer' : 'Enregistrer & envoyer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
