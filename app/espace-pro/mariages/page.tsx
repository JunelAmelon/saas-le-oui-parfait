'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useVendorData } from '@/contexts/VendorDataContext';
import { VendorDashboardLayout } from '@/components/layout/VendorDashboardLayout';
import { getVendorBookings, calculateDaysUntil, formatFrenchDate, VendorBooking } from '@/lib/vendor-helpers';
import { Loader2, ChevronRight, Heart, Calendar, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function VendorMariagesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { vendor, loading: vendorLoading } = useVendorData();

  const [bookings, setBookings] = useState<VendorBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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
  }, [vendor?.id]);

  if (authLoading || !user || user.role !== 'vendor' || vendorLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-beige">
        <Loader2 className="animate-spin h-8 w-8 text-brand-turquoise" />
      </div>
    );
  }

  const filtered = bookings.filter((b) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      b.client_names.toLowerCase().includes(q) ||
      (b.planner_name || '').toLowerCase().includes(q) ||
      formatFrenchDate(b.wedding_date).toLowerCase().includes(q)
    );
  });

  const upcoming = filtered
    .filter((b) => calculateDaysUntil(b.wedding_date) >= 0)
    .sort((a, b) => a.wedding_date.localeCompare(b.wedding_date));
  const past = filtered
    .filter((b) => calculateDaysUntil(b.wedding_date) < 0)
    .sort((a, b) => b.wedding_date.localeCompare(a.wedding_date));

  const renderBookingCard = (b: VendorBooking) => {
    const days = calculateDaysUntil(b.wedding_date);
    const isPast = days < 0;
    return (
      <button
        key={b.id}
        onClick={() => router.push(`/espace-pro/mariages/${b.id}`)}
        className="w-full flex items-center gap-4 p-4 rounded-xl bg-[#FAF9F7] hover:bg-[rgba(136,183,181,0.08)] transition-colors text-left"
      >
        <div
          className={`w-14 h-14 rounded-full flex flex-col items-center justify-center shrink-0 ${
            isPast ? 'bg-[#9C97A3]' : 'bg-[#4B4456]'
          } text-white`}
        >
          <span className="text-[10px] font-medium leading-none">
            {new Date(b.wedding_date).toLocaleDateString('fr-FR', { month: 'short' })}
          </span>
          <span className="text-[18px] font-bold leading-none mt-0.5">
            {new Date(b.wedding_date).getDate()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold text-[#4B4456] truncate">
            {b.client_names}
          </div>
          <div className="text-[11.5px] text-[#9C97A3] mt-0.5">
            {formatFrenchDate(b.wedding_date)}
            {b.planner_name ? ` · ${b.planner_name}` : ''}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {b.status === 'confirmed' ? (
            <span className="text-[10px] font-semibold text-[#88b7b5] bg-[rgba(136,183,181,0.15)] px-2.5 py-1 rounded-full">
              Confirmé
            </span>
          ) : (
            <span className="text-[10px] font-semibold text-[#C9A96E] bg-[rgba(201,169,110,0.15)] px-2.5 py-1 rounded-full">
              Option
            </span>
          )}
          {!isPast && (
            <span className="text-[11px] font-semibold text-[#4B4456] whitespace-nowrap">
              J-{days}
            </span>
          )}
          <ChevronRight className="w-4 h-4 text-[#9C97A3] shrink-0" />
        </div>
      </button>
    );
  };

  return (
    <VendorDashboardLayout vendorName={vendor?.name}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-baskerville text-2xl sm:text-[26px] text-[#4B4456] mb-1">
            Mes mariages
          </h1>
          <p className="text-sm text-[#9C97A3]">
            Tous les mariages pour lesquels vous êtes booked
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
          <div className="space-y-6">
            {upcoming.length > 0 && (
              <div className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-4 h-4 text-[#88b7b5]" />
                  <h2 className="text-[15px] font-semibold text-[#4B4456]">
                    À venir ({upcoming.length})
                  </h2>
                </div>
                <div className="space-y-3">{upcoming.map(renderBookingCard)}</div>
              </div>
            )}

            {past.length > 0 && (
              <div className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Heart className="w-4 h-4 text-[#9C97A3]" />
                  <h2 className="text-[15px] font-semibold text-[#4B4456]">
                    Passés ({past.length})
                  </h2>
                </div>
                <div className="space-y-3 opacity-70">{past.map(renderBookingCard)}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </VendorDashboardLayout>
  );
}
