'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { ClientDashboardLayout } from '@/components/layout/ClientDashboardLayout';
import { useClientData } from '@/contexts/ClientDataContext';
import { calculateDaysRemaining } from '@/lib/client-helpers';
import { getDocuments } from '@/lib/db';
import {
  Users,
  MapPin,
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

// Palette cohérente avec le reste du produit — cycle déterministe par catégorie
const palette = [
  { bg: 'bg-brand-turquoise/15', text: 'text-brand-turquoise-hover', solid: 'bg-brand-turquoise', banner: 'from-brand-turquoise to-[#6a9a98]' },
  { bg: 'bg-brand-purple/10', text: 'text-brand-purple', solid: 'bg-brand-purple', banner: 'from-brand-purple to-[#6a6178]' },
  { bg: 'bg-[#F1EADD]', text: 'text-[#C9A96E]', solid: 'bg-[#C9A96E]', banner: 'from-[#C9A96E] to-[#e0c395]' },
  { bg: 'bg-[#F3E3E6]', text: 'text-[#B98A96]', solid: 'bg-[#B98A96]', banner: 'from-[#B98A96] to-[#d3aab3]' },
];

const catStyle = (category: string) => {
  let hash = 0;
  for (let i = 0; i < category.length; i++) hash = (hash * 31 + category.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
};

export default function PrestatairesPage() {
  const { client, event, loading: dataLoading } = useClientData();
  const [prestataires, setPrestataires] = useState<Prestataire[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

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
            const category = v?.category || l.vendor_category || 'Autre';
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

  const categories = useMemo(() => {
    const uniq = Array.from(new Set(prestataires.map((p) => p.category)));
    return [{ id: 'all', label: 'Tous', count: prestataires.length }, ...uniq.map((c) => ({
      id: c,
      label: c,
      count: prestataires.filter((p) => p.category === c).length,
    }))];
  }, [prestataires]);

  const filteredPrestataires = useMemo(() => {
    return selectedCategory === 'all' ? prestataires : prestataires.filter((p) => p.category === selectedCategory);
  }, [prestataires, selectedCategory]);

  useEffect(() => {
    setCurrentPage(1);
  }, [prestataires.length, selectedCategory]);

  const daysRemaining = event ? calculateDaysRemaining(event.event_date) : 0;

  if (dataLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-beige">
        <Loader2 className="animate-spin h-8 w-8 text-brand-turquoise" />
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(filteredPrestataires.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPrestataires = filteredPrestataires.slice(startIndex, startIndex + itemsPerPage);

  const confirmedCount = prestataires.filter((p) => p.status === 'confirmed').length;
  const pendingCount = prestataires.filter((p) => p.status === 'pending').length;

  return (
    <ClientDashboardLayout clientName={event?.couple_names || 'Client'} daysRemaining={daysRemaining}>
      <div className="space-y-6">

        {/* ---------- HERO ---------- */}
        <div className="relative overflow-hidden rounded-3xl bg-brand-purple px-7 py-9 sm:px-10 sm:py-11">
          <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full bg-brand-turquoise/10 blur-3xl pointer-events-none" />
          <svg
            className="absolute right-6 top-1/2 -translate-y-1/2 opacity-[0.12] pointer-events-none hidden sm:block"
            width="140" height="140" viewBox="0 0 100 100" fill="none"
          >
            <path d="M50 5 L56 44 L95 50 L56 56 L50 95 L44 56 L5 50 L44 44 Z" fill="white" />
          </svg>

          <div className="relative">
            <span className="inline-block text-[10px] tracking-label uppercase text-brand-purple bg-white/90 px-3 py-1.5 rounded-full mb-4">
              Prestataires
            </span>
            <h1 className="font-baskerville text-3xl sm:text-4xl text-brand-beige mb-2">
              Votre équipe pour le jour J
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-brand-beige/60 text-sm">
              <span>{prestataires.length} prestataires</span>
              <span className="text-brand-beige/25">·</span>
              <span>{confirmedCount} confirmés</span>
              {pendingCount > 0 && (
                <>
                  <span className="text-brand-beige/25">·</span>
                  <span className="text-[#E8C9CE]">{pendingCount} en attente</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ---------- FILTRES CATÉGORIES ---------- */}
        {categories.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {categories.map((cat) => {
              const active = selectedCategory === cat.id;
              if (cat.id === 'all') {
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`shrink-0 inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-full border transition-all ${
                      active
                        ? 'bg-brand-purple text-white border-brand-purple'
                        : 'bg-white text-brand-gray border-brand-purple/15 hover:border-brand-purple/30 hover:text-brand-purple'
                    }`}
                  >
                    {cat.label}
                    <span className={`text-[10px] ${active ? 'text-white/70' : 'text-brand-gray/60'}`}>{cat.count}</span>
                  </button>
                );
              }
              const style = catStyle(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`shrink-0 inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-full transition-all ${
                    active ? `${style.solid} text-white shadow-sm` : `bg-white ${style.text}`
                  }`}
                  style={!active ? { border: '1px solid currentColor', opacity: 0.75 } : undefined}
                >
                  {cat.label}
                  <span className={`text-[10px] ${active ? 'text-white/70' : 'opacity-60'}`}>{cat.count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* ---------- GRILLE DE CARTES PRESTATAIRES ---------- */}
        {filteredPrestataires.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 rounded-full bg-brand-purple/8 flex items-center justify-center mx-auto mb-4">
              <Users className="h-6 w-6 text-brand-purple" />
            </div>
            <p className="text-brand-gray text-sm">Aucun prestataire pour le moment</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {paginatedPrestataires.map((presta) => {
                const style = catStyle(presta.category);
                return (
                  <div
                    key={presta.id}
                    className="group relative bg-white rounded-3xl border border-brand-purple/8 hover:shadow-[0_20px_45px_-20px_rgba(75,68,86,0.3)] hover:-translate-y-1 transition-all duration-200"
                  >
                    {/* Bannière colorée avec avatar bien visible au-dessus */}
                    <div className={`h-20 sm:h-24 bg-gradient-to-br ${style.banner} relative rounded-t-3xl`}>
                      {presta.status === 'confirmed' ? (
                        <span className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-white/90 text-brand-purple">
                          Confirmé
                        </span>
                      ) : (
                        <span className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-white/90 text-[#B15C5C]">
                          En attente
                        </span>
                      )}
                    </div>

                    <div className="px-5 sm:px-6 pb-5 sm:pb-6">
                      <div className="relative -mt-10 sm:-mt-12 mb-3 flex items-end justify-between">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white border-[5px] border-white shadow-[0_8px_24px_-8px_rgba(75,68,86,0.28)] overflow-hidden flex items-center justify-center shrink-0 z-10 relative">
                          {presta.logoUrl ? (
                            <img src={presta.logoUrl} alt={presta.name} className="h-full w-full object-cover" />
                          ) : (
                            <span className={`text-xl sm:text-2xl font-baskerville text-white h-full w-full flex items-center justify-center ${style.solid}`}>
                              {presta.avatar}
                            </span>
                          )}
                        </div>
                      </div>

                      <h3 className="font-baskerville text-lg sm:text-xl text-brand-purple leading-snug">{presta.name}</h3>
                      <span className={`inline-block mt-1.5 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${style.bg} ${style.text}`}>
                        {presta.category}
                      </span>

                      <div className="mt-4 space-y-2">
                        {presta.address && (
                          <div className="flex items-center gap-2 text-xs text-brand-gray">
                            <MapPin className="h-3.5 w-3.5 text-brand-gray/70 shrink-0" />
                            <span className="truncate">{presta.address}</span>
                          </div>
                        )}
                        {presta.desc && (
                          <p className="text-xs text-brand-gray leading-relaxed line-clamp-2">{presta.desc}</p>
                        )}
                      </div>

                      {presta.nextRdv && (
                        <div className={`mt-4 flex items-center gap-2.5 p-3 rounded-xl ${style.bg}`}>
                          <Calendar className={`h-4 w-4 shrink-0 ${style.text}`} />
                          <span className="text-xs font-medium text-brand-purple">{presta.nextRdv}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-8 h-8 rounded-full border border-brand-purple/15 flex items-center justify-center text-brand-purple disabled:opacity-30 hover:bg-brand-purple/5 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs text-brand-gray">
                  Page {currentPage} sur {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-8 h-8 rounded-full border border-brand-purple/15 flex items-center justify-center text-brand-purple disabled:opacity-30 hover:bg-brand-purple/5 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </ClientDashboardLayout>
  );
}