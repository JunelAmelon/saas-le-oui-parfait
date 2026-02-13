'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClientDashboardLayout } from '@/components/layout/ClientDashboardLayout';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useClientData } from '@/contexts/ClientDataContext';
import { calculateDaysRemaining } from '@/lib/client-helpers';
import { getDocuments } from '@/lib/db';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Users,
  MapPin,
  Star,
  CheckCircle,
  Clock,
  Calendar,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface Prestataire {
  id: string;
  name: string;
  category: string;
  avatar: string;
  logoUrl?: string | null;
  address: string;
  desc?: string;
  status: string;
  rating: number;
  nextRdv: string | null;
}

interface AssignedVendorLink {
  id: string;
  client_id: string;
  vendor_id: string;
  planner_id: string;
  vendor_name?: string;
  vendor_category?: string;
}

const prestataires = [
  {
    id: '1',
    name: 'Château d\'Apigné',
    category: 'Lieu de réception',
    avatar: 'CA',
    contact: 'Marie Dupont',
    phone: '02 99 14 80 66',
    email: 'contact@chateau-apigne.fr',
    address: '35650 Le Rheu, Rennes',
    website: 'www.chateau-apigne.fr',
    status: 'confirmed',
    rating: 5,
    nextRdv: '10/04/2024 - Visite finale',
  },
  {
    id: '2',
    name: 'Traiteur Le Gourmet',
    category: 'Traiteur',
    avatar: 'TG',
    contact: 'Pierre Martin',
    phone: '02 99 45 23 12',
    email: 'contact@legourmet.fr',
    address: 'Rennes',
    website: 'www.traiteur-legourmet.fr',
    status: 'confirmed',
    rating: 5,
    nextRdv: '15/03/2024 - Dégustation menu',
  },
  {
    id: '3',
    name: 'Studio Photo Lumière',
    category: 'Photographe',
    avatar: 'SP',
    contact: 'Sophie Bernard',
    phone: '06 12 34 56 78',
    email: 'sophie@studiolumiere.fr',
    address: 'Rennes',
    website: 'www.studio-lumiere.fr',
    status: 'confirmed',
    rating: 5,
    nextRdv: null,
  },
  {
    id: '4',
    name: 'DJ Ambiance',
    category: 'DJ / Animation',
    avatar: 'DJ',
    contact: 'Thomas Leroy',
    phone: '06 98 76 54 32',
    email: 'thomas@dj-ambiance.fr',
    address: 'Rennes',
    website: null,
    status: 'pending',
    rating: 4,
    nextRdv: '12/02/2024 - Validation playlist',
  },
  {
    id: '5',
    name: 'Atelier Floral',
    category: 'Fleuriste',
    avatar: 'AF',
    contact: 'Claire Moreau',
    phone: '02 99 67 89 10',
    email: 'contact@atelierfloral.fr',
    address: 'Rennes',
    website: 'www.atelier-floral.fr',
    status: 'pending',
    rating: 5,
    nextRdv: '20/02/2024 - Choix des compositions',
  },
  {
    id: '6',
    name: 'Le Oui Parfait',
    category: 'Wedding Planner',
    avatar: 'LP',
    contact: 'Caroline Duval',
    phone: '06 11 22 33 44',
    email: 'caroline@leouiparfait.fr',
    address: 'Rennes',
    website: 'www.leouiparfait.fr',
    status: 'confirmed',
    rating: 5,
    nextRdv: null,
  },
];

export default function PrestatairesPage() {
  const { client, event, loading: dataLoading } = useClientData();
  const [prestataires, setPrestataires] = useState<Prestataire[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrestataire, setSelectedPrestataire] = useState<Prestataire | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 2;

  useEffect(() => {
    async function fetchPrestataires() {
      if (!client?.id) return;
      try {
        setLoading(true);

        const links = await getDocuments('client_vendors', [
          { field: 'client_id', operator: '==', value: client.id },
        ]);
        const assigned = (links as any[]).map((l: any) => ({
          id: l.id,
          client_id: l.client_id,
          vendor_id: l.vendor_id,
          planner_id: l.planner_id,
          vendor_name: l.vendor_name,
          vendor_category: l.vendor_category,
        })) as AssignedVendorLink[];

        if (assigned.length === 0) {
          setPrestataires([]);
          return;
        }

        const plannerId = client.planner_id || assigned[0]?.planner_id;
        const allVendors = plannerId
          ? await getDocuments('vendors', [{ field: 'planner_id', operator: '==', value: plannerId }])
          : [];

        const byId = new Map<string, any>((allVendors as any[]).map((v: any) => [v.id, v] as const));

        const mapped = assigned
          .map((l) => {
            const v = byId.get(l.vendor_id);
            const name = v?.name || l.vendor_name || 'Prestataire';
            const category = v?.category || l.vendor_category || 'other';
            const initials = (String(name)
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((x) => x[0]?.toUpperCase())
              .join('') || 'PR')
              .slice(0, 2);

            return {
              id: l.vendor_id,
              name,
              category,
              avatar: initials,
              logoUrl: v?.logo || v?.logo_url || v?.logoUrl || v?.logoURL || null,
              address: v?.address || v?.city || '',
              desc: v?.desc || '',
              status: 'confirmed',
              rating: Number(v?.rating ?? 5) || 5,
              nextRdv: v?.next_appointment?.description
                ? `${v?.next_appointment?.date || ''}${v?.next_appointment?.description ? ' - ' + v?.next_appointment?.description : ''}`.trim()
                : null,
            } as Prestataire;
          })
          .sort((a, b) => a.name.localeCompare(b.name, 'fr'));

        setPrestataires(mapped);
      } catch (error) {
        console.error('Error fetching assigned vendors:', error);
        setPrestataires([]);
      } finally {
        setLoading(false);
      }
    }
    if (!dataLoading && client) {
      fetchPrestataires();
    }
  }, [client, dataLoading]);

  useEffect(() => {
    setCurrentPage(1);
  }, [prestataires.length]);

  const daysRemaining = event ? calculateDaysRemaining(event.event_date) : 0;

  if (dataLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-12 w-12 text-brand-turquoise" />
      </div>
    );
  }

  const totalPages = Math.ceil(prestataires.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPrestataires = prestataires.slice(startIndex, startIndex + itemsPerPage);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-700">Confirmé</Badge>;
      case 'pending':
        return <Badge className="bg-orange-100 text-orange-700">En attente</Badge>;
      default:
        return null;
    }
  };

  const confirmedCount = prestataires.filter(p => p.status === 'confirmed').length;
  const pendingCount = prestataires.filter(p => p.status === 'pending').length;

  return (
    <ClientDashboardLayout clientName={event?.couple_names || 'Client'} daysRemaining={daysRemaining}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-purple flex items-center gap-2 sm:gap-3">
            <Users className="h-6 w-6 sm:h-8 sm:w-8 text-brand-turquoise" />
            Mes Prestataires
          </h1>
          <p className="text-sm sm:text-base text-brand-gray mt-1">
            Tous vos prestataires pour le jour J
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-brand-turquoise/10 to-white">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-brand-turquoise" />
              <div>
                <p className="text-2xl font-bold text-brand-purple">{prestataires.length}</p>
                <p className="text-sm text-brand-gray">Prestataires total</p>
              </div>
            </div>
          </Card>
          <Card className="p-6 shadow-xl border-0">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-600">{confirmedCount}</p>
                <p className="text-sm text-brand-gray">Confirmés</p>
              </div>
            </div>
          </Card>
          <Card className="p-6 shadow-xl border-0">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
                <p className="text-sm text-brand-gray">En attente</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {paginatedPrestataires.map((presta) => (
            <Card key={presta.id} className="p-6 shadow-xl border-0">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-white border border-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                    {presta.logoUrl ? (
                      <img src={presta.logoUrl} alt={presta.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-white text-lg font-semibold bg-brand-turquoise h-full w-full flex items-center justify-center">
                        {presta.avatar}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-brand-purple text-lg">{presta.name}</h3>
                    <p className="text-sm text-brand-gray">{presta.category}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < presta.rating
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                {getStatusBadge(presta.status)}
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-brand-turquoise" />
                  <span className="text-brand-gray">{presta.address}</span>
                </div>
                {presta.desc ? (
                  <div className="text-sm text-brand-gray whitespace-pre-wrap">
                    {presta.desc}
                  </div>
                ) : null}
                {presta.nextRdv && (
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-brand-turquoise" />
                    <span className="text-brand-purple font-medium">{presta.nextRdv}</span>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-100" />
            </Card>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-brand-gray">
              Page {currentPage} sur {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </ClientDashboardLayout>
  );
}
