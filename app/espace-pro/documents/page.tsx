'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useVendorData } from '@/contexts/VendorDataContext';
import { VendorDashboardLayout } from '@/components/layout/VendorDashboardLayout';
import { getVendorBookings, getBookingProDocuments, formatFrenchDate, VendorBooking, ProDocument } from '@/lib/vendor-helpers';
import { Loader2, FileText, Eye, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function VendorDocumentsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { vendor, loading: vendorLoading } = useVendorData();

  const [docs, setDocs] = useState<{ doc: ProDocument; booking: VendorBooking }[]>([]);
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
        const allDocs: { doc: ProDocument; booking: VendorBooking }[] = [];
        for (const bk of bookings) {
          const d = await getBookingProDocuments(bk.client_id, bk.vendor_id);
          d.forEach((doc) => allDocs.push({ doc, booking: bk }));
        }
        allDocs.sort((a, b) => String(b.doc.date || '').localeCompare(String(a.doc.date || '')));
        setDocs(allDocs);
      } catch (e) {
        console.error('Error fetching all documents:', e);
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

  const vendorStatusBadge = (doc: ProDocument) => {
    if (doc.uploaded_by !== 'vendor') return null;
    const st = doc.vendor_status || 'submitted';
    if (st === 'validated') {
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0"><CheckCircle2 className="h-3 w-3 mr-1" />Validé</Badge>;
    }
    if (st === 'rejected') {
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0"><XCircle className="h-3 w-3 mr-1" />Rejeté</Badge>;
    }
    return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-0"><Clock className="h-3 w-3 mr-1" />En attente</Badge>;
  };

  return (
    <VendorDashboardLayout vendorName={vendor?.name}>
      <div className="space-y-6">
        <div>
          <h1 className="font-baskerville text-2xl sm:text-[26px] text-[#4B4456] mb-1">
            Devis & Factures
          </h1>
          <p className="text-sm text-[#9C97A3]">
            Tous vos documents, tous mariages confondus
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#88b7b5]" />
          </div>
        ) : docs.length === 0 ? (
          <div className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] p-12 text-center">
            <FileText className="h-12 w-12 text-[#9C97A3] mx-auto mb-4 opacity-40" />
            <h3 className="text-lg font-semibold text-[#4B4456] mb-2">Aucun document</h3>
            <p className="text-sm text-[#9C97A3]">
              Soumettez vos devis et factures depuis la page d&apos;un mariage.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] p-5">
            <div className="space-y-3">
              {docs.map(({ doc, booking }) => {
                const fileUrl = doc.devis_file_url || doc.facture_file_url || doc.file_url || '';
                return (
                  <button
                    key={doc.id}
                    onClick={() => router.push(`/espace-pro/mariages/${booking.id}`)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-[#FAF9F7] hover:bg-[rgba(136,183,181,0.08)] transition-colors text-left"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      doc.type === 'devis' ? 'bg-[rgba(136,183,181,0.15)]' : 'bg-[rgba(201,169,110,0.15)]'
                    }`}>
                      <FileText className={`h-5 w-5 ${doc.type === 'devis' ? 'text-[#88b7b5]' : 'text-[#C9A96E]'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[14px] font-semibold text-[#4B4456]">
                          {doc.type === 'devis' ? 'Devis' : 'Facture'}
                        </span>
                        {vendorStatusBadge(doc)}
                        <span className="text-[11px] text-[#9C97A3]">· {booking.client_names}</span>
                      </div>
                      <div className="text-[11.5px] text-[#9C97A3] mt-0.5">
                        {doc.reference ? `${doc.reference} · ` : ''}
                        {Number(doc.amount || 0).toLocaleString('fr-FR')} € · {formatFrenchDate(doc.date)}
                      </div>
                      {doc.uploaded_by === 'vendor' && doc.vendor_status === 'rejected' && doc.rejection_reason && (
                        <div className="text-[11px] text-red-600 mt-1">
                          Motif du rejet : {doc.rejection_reason}
                        </div>
                      )}
                    </div>
                    {fileUrl && (
                      <div
                        onClick={(e) => { e.stopPropagation(); window.open(fileUrl, '_blank'); }}
                        className="w-9 h-9 rounded-full bg-white border border-[rgba(75,68,86,0.1)] flex items-center justify-center text-[#4B4456] hover:bg-[rgba(75,68,86,0.05)] transition-colors shrink-0"
                        title="Voir le document"
                      >
                        <Eye className="w-4 h-4" />
                      </div>
                    )}
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
