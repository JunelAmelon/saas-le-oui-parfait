'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { addDocument, deleteDocument, getDocuments } from '@/lib/db';
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
      const [allVendors, links] = await Promise.all([
        getDocuments('vendors', [{ field: 'planner_id', operator: '==', value: user.uid }]),
        getDocuments('client_vendors', [
          { field: 'planner_id', operator: '==', value: user.uid },
          { field: 'client_id', operator: '==', value: clientId },
        ]),
      ]);

      const mappedVendors = (allVendors as any[]).map((d: any) => ({
        id: d.id,
        name: d.name || 'Prestataire',
        category: d.category || 'other',
        contact_name: d.contact_name,
        email: d.email,
        phone: d.phone,
        city: d.city,
        logoUrl: d.logo || d.logo_url || d.logoUrl || d.logoURL || null,
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
      toast.success('Prestataire assigné au client');
      await fetchAll();
    } catch (e) {
      console.error('Error assigning vendor:', e);
      toast.error("Impossible d'assigner le prestataire");
    }
  };

  const unassignVendor = async (vendorId: string) => {
    const link = assignedLinks.find((l) => l.vendor_id === vendorId);
    if (!link) return;

    if (!confirm('Retirer ce prestataire du client ?')) return;

    try {
      await deleteDocument('client_vendors', link.id);
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-2xl sm:text-3xl font-bold text-brand-purple flex items-center gap-2 sm:gap-3">
                <Users className="h-6 w-6 sm:h-8 sm:w-8 text-brand-turquoise" />
                Prestataires
              </h1>
            </div>
            <p className="text-sm sm:text-base text-brand-gray mt-1">
              Assignez les prestataires qui doivent apparaître côté client.
            </p>
          </div>
        </div>

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
                    <div key={v.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                      <div className="min-w-0 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-white border border-gray-200 overflow-hidden flex-shrink-0">
                          {v.logoUrl ? (
                            <img src={v.logoUrl} alt={v.name} className="h-full w-full object-cover" />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-brand-purple text-sm truncate">{v.name}</p>
                          <p className="text-xs text-brand-gray">{v.category}</p>
                        </div>
                      </div>
                      <Button size="sm" variant="destructive" onClick={() => void unassignVendor(v.id)}>
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
                      <div key={v.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
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
                          className={assigned ? '' : 'bg-brand-turquoise hover:bg-brand-turquoise-hover'}
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
