'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useVendorData } from '@/contexts/VendorDataContext';
import { VendorDashboardLayout } from '@/components/layout/VendorDashboardLayout';
import { getVendorBookings, getBookingPayments, formatFrenchDate, VendorBooking, VendorPayment } from '@/lib/vendor-helpers';
import { Loader2, CreditCard, CheckCircle2, Clock, XCircle, Euro } from 'lucide-react';

export default function VendorAcomptesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { vendor, loading: vendorLoading } = useVendorData();

  const [payments, setPayments] = useState<{ payment: VendorPayment; booking: VendorBooking }[]>([]);
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
        const bookings = await getVendorBookings(vendor.id, user?.uid);
        const allPayments: { payment: VendorPayment; booking: VendorBooking }[] = [];
        for (const bk of bookings) {
          const p = await getBookingPayments(bk.id);
          p.forEach((payment) => allPayments.push({ payment, booking: bk }));
        }
        allPayments.sort((a, b) =>
          String(a.payment.due_date || '').localeCompare(String(b.payment.due_date || ''))
        );
        setPayments(allPayments);
      } catch (e) {
        console.error('Error fetching all payments:', e);
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

  const totalPaid = payments.filter((p) => p.payment.status === 'paid').reduce((sum, p) => sum + Number(p.payment.amount || 0), 0);
  const totalScheduled = payments.filter((p) => p.payment.status === 'scheduled').reduce((sum, p) => sum + Number(p.payment.amount || 0), 0);
  const totalLate = payments.filter((p) => p.payment.status === 'late').reduce((sum, p) => sum + Number(p.payment.amount || 0), 0);

  return (
    <VendorDashboardLayout vendorName={vendor?.name}>
      <div className="space-y-6">
        <div>
          <h1 className="font-baskerville text-2xl sm:text-[26px] text-[#4B4456] mb-1">
            Acomptes
          </h1>
          <p className="text-sm text-[#9C97A3]">
            Suivi de vos acomptes et échéanciers
          </p>
        </div>

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
              <span className="text-[13px] font-semibold text-[#4B4456]">À venir</span>
            </div>
            <div className="text-2xl font-bold text-[#4B4456] font-baskerville">
              {totalScheduled.toLocaleString('fr-FR')} €
            </div>
          </div>
          <div className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-full bg-[rgba(185,132,127,0.15)] flex items-center justify-center">
                <XCircle className="w-4 h-4 text-[#B9847F]" />
              </div>
              <span className="text-[13px] font-semibold text-[#4B4456]">En retard</span>
            </div>
            <div className="text-2xl font-bold text-[#4B4456] font-baskerville">
              {totalLate.toLocaleString('fr-FR')} €
            </div>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#88b7b5]" />
          </div>
        ) : payments.length === 0 ? (
          <div className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] p-12 text-center">
            <CreditCard className="h-12 w-12 text-[#9C97A3] mx-auto mb-4 opacity-40" />
            <h3 className="text-lg font-semibold text-[#4B4456] mb-2">Aucun acompte</h3>
            <p className="text-sm text-[#9C97A3]">
              Les acomptes définis par votre planner apparaîtront ici.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] p-5">
            <div className="space-y-3">
              {payments.map(({ payment, booking }) => {
                const isPaid = payment.status === 'paid';
                const isLate = payment.status === 'late';
                return (
                  <button
                    key={payment.id}
                    onClick={() => router.push(`/espace-pro/mariages/${booking.id}`)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-[#FAF9F7] hover:bg-[rgba(136,183,181,0.08)] transition-colors text-left"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      isPaid ? 'bg-[rgba(136,183,181,0.15)]' : isLate ? 'bg-[rgba(185,132,127,0.15)]' : 'bg-[rgba(201,169,110,0.15)]'
                    }`}>
                      {isPaid ? (
                        <CheckCircle2 className="w-5 h-5 text-[#88b7b5]" />
                      ) : isLate ? (
                        <XCircle className="w-5 h-5 text-[#B9847F]" />
                      ) : (
                        <Clock className="w-5 h-5 text-[#C9A96E]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold text-[#4B4456]">
                        {payment.label}
                      </div>
                      <div className="text-[11.5px] text-[#9C97A3] mt-0.5">
                        {booking.client_names} · Échéance : {formatFrenchDate(payment.due_date)}
                        {isPaid && payment.paid_date ? ` · Payé le ${formatFrenchDate(payment.paid_date)}` : ''}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[14px] font-bold text-[#4B4456]">
                        {Number(payment.amount || 0).toLocaleString('fr-FR')} €
                      </div>
                      <div className={`text-[10px] font-semibold mt-0.5 ${
                        isPaid ? 'text-[#88b7b5]' : isLate ? 'text-[#B9847F]' : 'text-[#C9A96E]'
                      }`}>
                        {isPaid ? 'Payé' : isLate ? 'En retard' : 'À venir'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </VendorDashboardLayout>
  );
}
