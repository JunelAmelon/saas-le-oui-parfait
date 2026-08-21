'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Users } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { addDocument, deleteDocument, getDocuments, getDocument, updateDocument } from '@/lib/db';
import { toast } from 'sonner';

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
                      <Button size="sm" variant="destructive" className="w-full sm:w-auto" onClick={() => void unassignVendor(v.id)}>
                        Retirer
                      </Button>
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
    </DashboardLayout>
  );
}
