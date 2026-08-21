'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useVendorData } from '@/contexts/VendorDataContext';
import { VendorDashboardLayout } from '@/components/layout/VendorDashboardLayout';
import {
  getVendorBookings,
  getVendorPayments,
  calculateDaysUntil,
  formatFrenchDate,
  VendorBooking,
  VendorPayment,
} from '@/lib/vendor-helpers';
import { getDocuments } from '@/lib/db';
import { Loader2, ChevronRight, Calendar, Euro, FileText, CreditCard, Heart, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export default function EspaceProDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { vendor, loading: vendorLoading } = useVendorData();

  const [bookings, setBookings] = useState<VendorBooking[]>([]);
  const [payments, setPayments] = useState<VendorPayment[]>([]);
  const [loading, setLoading] = useState(true);

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
        const [bks, pmts] = await Promise.all([
          getVendorBookings(vendor.id, user?.uid),
          getVendorPayments(vendor.id),
        ]);
        setBookings(bks);
        setPayments(pmts);
      } catch (e) {
        console.error('Error fetching vendor dashboard data:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [vendor?.id]);

  if (authLoading || !user || user.role !== 'vendor' || vendorLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-beige">
        <div className="text-center">
          <Loader2 className="animate-spin h-8 w-8 text-brand-turquoise mx-auto" />
          <p className="mt-4 text-brand-gray">Préparation de votre espace pro...</p>
        </div>
      </div>
    );
  }

  const vendorName = vendor?.name || user?.full_name || user?.email || 'Prestataire';

  // Stats
  const confirmedBookings = bookings.filter((b) => b.status === 'confirmed');
  const upcomingBookings = bookings
    .filter((b) => calculateDaysUntil(b.wedding_date) >= 0)
    .sort((a, b) => a.wedding_date.localeCompare(b.wedding_date));
  const nextBooking = upcomingBookings[0];
  const nextDays = nextBooking ? calculateDaysUntil(nextBooking.wedding_date) : 0;

  const totalPaid = payments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalScheduled = payments
    .filter((p) => p.status === 'scheduled')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalLate = payments
    .filter((p) => p.status === 'late')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const initials = (() => {
    const src = vendorName;
    return (
      String(src)
        .split(/\s+/)
        .filter(Boolean)
        .map((x) => x[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'PR'
    );
  })();

  return (
    <VendorDashboardLayout vendorName={vendorName}>
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6 items-start">
        <div>
          {/* Hero */}
          <div className="relative overflow-hidden rounded-3xl bg-[#4B4456] px-7 py-7 sm:px-8 sm:py-8 mb-5">
            <span className="inline-block text-[10px] tracking-[0.15em] uppercase text-[#4B4456] bg-white/90 px-3 py-1.5 rounded-full mb-4">
              Espace pro
            </span>
            <h1 className="font-baskerville text-[#FAF9F7] text-2xl sm:text-[26px] leading-tight max-w-md mb-6">
              Bienvenue {vendorName},
              <br />
              vos mariages en un coup d&apos;œil.
            </h1>
            <button
              onClick={() => router.push('/espace-pro/mariages')}
              className="inline-flex items-center justify-between gap-2.5 w-full sm:w-auto bg-[#2E2937] text-white text-[13px] font-semibold pl-5 pr-2.5 py-2.5 rounded-full hover:bg-[#1f1c26] transition-colors"
            >
              Voir mes mariages
              <span className="w-6 h-6 rounded-full bg-[#88b7b5] flex items-center justify-center shrink-0">
                <ChevronRight className="w-3 h-3 text-[#4B4456]" />
              </span>
            </button>
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

          {/* Stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            <div className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-[rgba(136,183,181,0.16)] flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-[#88b7b5]" />
                </div>
                <span className="text-[13px] font-semibold text-[#4B4456]">Mariages à venir</span>
              </div>
              <div className="text-2xl font-bold text-[#4B4456] font-baskerville">
                {upcomingBookings.length}
              </div>
              <div className="text-[11.5px] text-[#9C97A3] mt-1">
                {nextBooking
                  ? `Prochain dans ${nextDays} jour${nextDays > 1 ? 's' : ''}`
                  : 'Aucun mariage planifié'}
              </div>
            </div>

            <div className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-[rgba(75,68,86,0.08)] flex items-center justify-center">
                  <Euro className="w-4 h-4 text-[#4B4456]" />
                </div>
                <span className="text-[13px] font-semibold text-[#4B4456]">Acomptes reçus</span>
              </div>
              <div className="text-2xl font-bold text-[#4B4456] font-baskerville">
                {totalPaid.toLocaleString('fr-FR')} €
              </div>
              <div className="text-[11.5px] text-[#9C97A3] mt-1">
                {payments.filter((p) => p.status === 'paid').length} paiement(s) reçus
              </div>
            </div>

            <div className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-[rgba(201,169,110,0.15)] flex items-center justify-center">
                  <Clock className="w-4 h-4 text-[#C9A96E]" />
                </div>
                <span className="text-[13px] font-semibold text-[#4B4456]">À percevoir</span>
              </div>
              <div className="text-2xl font-bold text-[#4B4456] font-baskerville">
                {(totalScheduled + totalLate).toLocaleString('fr-FR')} €
              </div>
              <div className="text-[11.5px] text-[#9C97A3] mt-1">
                {totalLate > 0 ? `${totalLate.toLocaleString('fr-FR')} € en retard` : 'Tout est à jour'}
              </div>
            </div>
          </div>

          {/* Upcoming weddings list */}
          <div className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="text-[15px] font-semibold text-[#4B4456]">Prochains mariages</div>
              {upcomingBookings.length > 0 && (
                <button
                  onClick={() => router.push('/espace-pro/mariages')}
                  className="text-[11px] font-semibold text-[#88b7b5] hover:underline"
                >
                  Tout voir
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[#88b7b5]" />
              </div>
            ) : upcomingBookings.length === 0 ? (
              <div className="text-center py-10">
                <Heart className="h-10 w-10 text-[#9C97A3] mx-auto mb-3 opacity-50" />
                <p className="text-sm text-[#9C97A3]">
                  Aucun mariage à venir pour le moment.
                </p>
                <p className="text-xs text-[#9C97A3] mt-1">
                  Vos prochains mariages apparaîtront ici.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingBookings.slice(0, 5).map((b) => {
                  const days = calculateDaysUntil(b.wedding_date);
                  return (
                    <button
                      key={b.id}
                      onClick={() => router.push(`/espace-pro/mariages/${b.id}`)}
                      className="w-full flex items-center gap-4 p-4 rounded-xl bg-[#FAF9F7] hover:bg-[rgba(136,183,181,0.08)] transition-colors text-left"
                    >
                      <div className="w-12 h-12 rounded-full bg-[#4B4456] text-white flex flex-col items-center justify-center shrink-0">
                        <span className="text-[10px] font-medium leading-none">
                          {new Date(b.wedding_date).toLocaleDateString('fr-FR', { month: 'short' })}
                        </span>
                        <span className="text-[16px] font-bold leading-none mt-0.5">
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
                        <span className="text-[11px] font-semibold text-[#4B4456] whitespace-nowrap">
                          J-{days}
                        </span>
                        <ChevronRight className="w-4 h-4 text-[#9C97A3] shrink-0" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Countdown / next wedding */}
          <div className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] p-5">
            <div className="text-[15px] font-semibold text-[#4B4456] mb-5">Prochain mariage</div>
            {nextBooking ? (
              <div className="text-center">
                <div className="relative w-[100px] h-[100px] mx-auto mb-4">
                  <div className="absolute inset-0 rounded-full bg-[rgba(136,183,181,0.12)] flex items-center justify-center font-baskerville text-xl text-[#4B4456]">
                    {initials}
                  </div>
                  <div className="absolute -top-1 -right-1 bg-[#4B4456] text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                    J-{nextDays}
                  </div>
                </div>
                <div className="text-[14.5px] font-bold text-[#4B4456]">{nextBooking.client_names}</div>
                <div className="text-[11.5px] text-[#9C97A3] mt-1 leading-snug">
                  {formatFrenchDate(nextBooking.wedding_date)}
                </div>
                <button
                  onClick={() => router.push(`/espace-pro/mariages/${nextBooking.id}`)}
                  className="mt-4 w-full bg-[#4B4456] text-white text-[12.5px] font-semibold py-2.5 rounded-xl hover:bg-[#3a3446] transition-colors"
                >
                  Voir le dossier
                </button>
              </div>
            ) : (
              <p className="text-sm text-[#9C97A3] text-center py-6">
                Aucun mariage à venir.
              </p>
            )}
          </div>

          {/* Payments summary */}
          <div className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] p-5">
            <div className="text-[15px] font-semibold text-[#4B4456] mb-5">Acomptes</div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[rgba(136,183,181,0.15)] flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-[#88b7b5]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-semibold text-[#4B4456]">Reçus</div>
                  <div className="text-[10.5px] text-[#9C97A3]">{totalPaid.toLocaleString('fr-FR')} €</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[rgba(201,169,110,0.15)] flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-[#C9A96E]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-semibold text-[#4B4456]">À venir</div>
                  <div className="text-[10.5px] text-[#9C97A3]">{totalScheduled.toLocaleString('fr-FR')} €</div>
                </div>
              </div>
              {totalLate > 0 && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[rgba(185,132,127,0.15)] flex items-center justify-center shrink-0">
                    <AlertCircle className="w-4 h-4 text-[#B9847F]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-semibold text-[#4B4456]">En retard</div>
                    <div className="text-[10.5px] text-[#9C97A3]">{totalLate.toLocaleString('fr-FR')} €</div>
                  </div>
                </div>
              )}
              <button
                onClick={() => router.push('/espace-pro/acomptes')}
                className="w-full mt-3 bg-[#4B4456] text-white text-[12.5px] font-semibold py-2.5 rounded-xl hover:bg-[#3a3446] transition-colors"
              >
                Voir tous les acomptes
              </button>
            </div>
          </div>
        </div>
      </div>
    </VendorDashboardLayout>
  );
}
