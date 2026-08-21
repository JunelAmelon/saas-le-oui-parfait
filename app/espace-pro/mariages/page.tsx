'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useVendorData } from '@/contexts/VendorDataContext';
import { VendorDashboardLayout } from '@/components/layout/VendorDashboardLayout';
import { getVendorBookings, calculateDaysUntil, formatFrenchDate, VendorBooking } from '@/lib/vendor-helpers';
import { Loader2, ChevronRight, ChevronLeft, Search, Calendar, Heart, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

const PAGE_SIZE = 5;

export default function VendorMariagesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { vendor, loading: vendorLoading } = useVendorData();

  const [bookings, setBookings] = useState<VendorBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'vendor') {
        router.push('/');
      }
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!vendor?.id) return;
      setLoading(true);
      try {
        const bks = await getVendorBookings(vendor.id, user?.uid);
        setBookings(bks);
      } catch (e) {
        console.error('Error fetching bookings:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [vendor?.id, user?.uid]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? bookings.filter((b) =>
          b.client_names.toLowerCase().includes(q) ||
          (b.planner_name || '').toLowerCase().includes(q) ||
          formatFrenchDate(b.wedding_date).toLowerCase().includes(q)
        )
      : bookings;
    return [...list].sort((a, b) => {
      const da = calculateDaysUntil(a.wedding_date);
      const db = calculateDaysUntil(b.wedding_date);
      // Upcoming first (ascending), then past (descending)
      if (da >= 0 && db < 0) return -1;
      if (da < 0 && db >= 0) return 1;
      if (da >= 0) return a.wedding_date.localeCompare(b.wedding_date);
      return b.wedding_date.localeCompare(a.wedding_date);
    });
  }, [bookings, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(0, totalPages - 1));
  const paginated = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  useEffect(() => {
    // Reset page when search changes
    setPage(0);
  }, [search]);

  if (authLoading || !user || user.role !== 'vendor' || vendorLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-beige">
        <Loader2 className="animate-spin h-8 w-8 text-brand-turquoise" />
      </div>
    );
  }

  const upcomingCount = bookings.filter((b) => calculateDaysUntil(b.wedding_date) >= 0).length;
  const pastCount = bookings.length - upcomingCount;

  return (
    <VendorDashboardLayout vendorName={vendor?.name}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-baskerville text-2xl sm:text-[26px] text-[#4B4456] mb-1">
            Mes mariages
          </h1>
          <p className="text-sm text-[#9C97A3]">
            {bookings.length} mariage{bookings.length > 1 ? 's' : ''} · {upcomingCount} à venir · {pastCount} passé{pastCount > 1 ? 's' : ''}
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9C97A3]" />
          <Input
            placeholder="Rechercher par couple, date, planner..."
            className="pl-10 border-[rgba(75,68,86,0.12)] focus-visible:ring-[#88b7b5]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#88b7b5]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] p-12 text-center">
            <Heart className="h-12 w-12 text-[#9C97A3] mx-auto mb-4 opacity-40" />
            <h3 className="text-lg font-semibold text-[#4B4456] mb-2">
              {search ? 'Aucun résultat' : 'Aucun mariage'}
            </h3>
            <p className="text-sm text-[#9C97A3]">
              {search
                ? 'Essayez avec d\'autres critères'
                : 'Vous n\'êtes pas encore booked sur un mariage'}
            </p>
          </div>
        ) : (
          <>
            {/* Tableau */}
            <div className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] overflow-hidden">
              {/* Header du tableau (desktop) */}
              <div className="hidden sm:grid grid-cols-[auto_1fr_180px_140px_100px_40px] items-center gap-4 px-5 py-3 border-b border-[rgba(75,68,86,0.08)] bg-[#FAF9F7]">
                <span className="text-[11px] font-semibold text-[#9C97A3] uppercase tracking-wide w-12">Couple</span>
                <span className="text-[11px] font-semibold text-[#9C97A3] uppercase tracking-wide">Noms</span>
                <span className="text-[11px] font-semibold text-[#9C97A3] uppercase tracking-wide">Date</span>
                <span className="text-[11px] font-semibold text-[#9C97A3] uppercase tracking-wide text-center">Statut</span>
                <span className="text-[11px] font-semibold text-[#9C97A3] uppercase tracking-wide text-center">J-X</span>
                <span></span>
              </div>

              {/* Lignes du tableau */}
              <div className="divide-y divide-[rgba(75,68,86,0.04)]">
                {paginated.map((b) => {
                  const days = calculateDaysUntil(b.wedding_date);
                  const isPast = days < 0;
                  const initials = b.client_names
                    .split(/\s+|&/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((s) => s[0])
                    .join('')
                    .toUpperCase() || '??';

                  return (
                    <button
                      key={b.id}
                      onClick={() => router.push(`/espace-pro/mariages/${b.id}`)}
                      className="w-full grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_180px_140px_100px_40px] items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 hover:bg-[rgba(136,183,181,0.05)] transition-colors text-left"
                    >
                      {/* Photo couple */}
                      <Avatar className="w-11 h-11 sm:w-12 sm:h-12 ring-2 ring-[rgba(75,68,86,0.06)] shrink-0">
                        {b.client_photo ? <AvatarImage src={b.client_photo} alt={b.client_names} className="object-cover" /> : null}
                        <AvatarFallback className="bg-[#4B4456] text-white text-xs font-semibold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>

                      {/* Noms + planner */}
                      <div className="min-w-0">
                        <div className="text-[14px] font-semibold text-[#4B4456] truncate flex items-center gap-2">
                          {b.client_names}
                          {b.status === 'option' && (
                            <span className="text-[9px] font-semibold text-[#C9A96E] bg-[rgba(201,169,110,0.15)] px-2 py-0.5 rounded-full whitespace-nowrap">
                              Option
                            </span>
                          )}
                        </div>
                        <div className="text-[11.5px] text-[#9C97A3] truncate flex items-center gap-1.5 mt-0.5">
                          <Heart className="w-3 h-3 shrink-0" />
                          {b.planner_name || 'Wedding Planner'}
                        </div>
                      </div>

                      {/* Date (desktop) */}
                      <div className="hidden sm:flex items-center gap-2 text-[13px] text-[#4B4456]">
                        <Calendar className="w-3.5 h-3.5 text-[#9C97A3] shrink-0" />
                        <span className="truncate">{formatFrenchDate(b.wedding_date)}</span>
                      </div>

                      {/* Statut (desktop) */}
                      <div className="hidden sm:flex items-center justify-center">
                        {b.status === 'confirmed' ? (
                          <span className="text-[11px] font-semibold text-[#88b7b5] bg-[rgba(136,183,181,0.12)] px-3 py-1.5 rounded-full whitespace-nowrap">
                            Confirmé
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-[#C9A96E] bg-[rgba(201,169,110,0.12)] px-3 py-1.5 rounded-full whitespace-nowrap">
                            Option
                          </span>
                        )}
                      </div>

                      {/* J-X (desktop) */}
                      <div className="hidden sm:flex items-center justify-center">
                        {isPast ? (
                          <span className="text-[11px] font-medium text-[#9C97A3] flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Passé
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-[#88b7b5] bg-[rgba(136,183,181,0.1)] px-2.5 py-1 rounded-full whitespace-nowrap">
                            J-{days}
                          </span>
                        )}
                      </div>

                      {/* Mobile: date + J-X combined */}
                      <div className="flex sm:hidden flex-col items-end gap-1">
                        <span className="text-[11px] text-[#4B4456] font-medium whitespace-nowrap">
                          {new Date(b.wedding_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        {isPast ? (
                          <span className="text-[10px] text-[#9C97A3]">Passé</span>
                        ) : (
                          <span className="text-[10px] font-semibold text-[#88b7b5]">J-{days}</span>
                        )}
                      </div>

                      {/* Chevron */}
                      <div className="hidden sm:flex items-center justify-end">
                        <ChevronRight className="w-4 h-4 text-[#9C97A3] shrink-0" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#9C97A3]">
                  Page {currentPage + 1} sur {totalPages} · {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    className="gap-1 border-[rgba(75,68,86,0.12)]"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Précédent
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages - 1}
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    className="gap-1 border-[rgba(75,68,86,0.12)]"
                  >
                    Suivant
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </VendorDashboardLayout>
  );
}
