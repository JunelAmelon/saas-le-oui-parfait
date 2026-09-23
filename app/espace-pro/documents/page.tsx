'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useVendorData } from '@/contexts/VendorDataContext';
import { VendorDashboardLayout } from '@/components/layout/VendorDashboardLayout';
import { getVendorBookings, getBookingProDocuments, formatFrenchDate, VendorBooking, ProDocument } from '@/lib/vendor-helpers';
import { getDocuments } from '@/lib/db';
import { DocViewerModal } from '@/components/DocViewerModal';
import {
  Loader2,
  FileText,
  FilePen,
  File,
  FileCheck,
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DocCard {
  id: string;
  name: string;
  type: 'devis' | 'facture' | 'partage';
  file_url: string;
  date?: string;
  clientNames?: string;
  amount?: number;
  reference?: string;
  uploadedByVendor?: boolean;
  vendorStatus?: string;
  rejectionReason?: string;
  ts: number;
}

const typeStyles: Record<string, { bg: string; text: string; solid: string; accent: string }> = {
  devis: { bg: 'bg-brand-purple/10', text: 'text-brand-purple', solid: 'bg-brand-purple', accent: '#4B4456' },
  facture: { bg: 'bg-[#F1EADD]', text: 'text-[#C9A96E]', solid: 'bg-[#C9A96E]', accent: '#C9A96E' },
  partage: { bg: 'bg-brand-turquoise/15', text: 'text-brand-turquoise-hover', solid: 'bg-brand-turquoise', accent: '#88b7b5' },
};

const typeLabels: Record<string, string> = {
  devis: 'Devis',
  facture: 'Facture',
  partage: 'Partagé',
};

const catStyle = (id: string) => typeStyles[id] || typeStyles.partage;

const toTs = (v: any): number => {
  if (!v) return 0;
  if (v?.toDate) return v.toDate().getTime();
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? 0 : t;
};

export default function VendorDocumentsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { vendor, loading: vendorLoading } = useVendorData();

  const [docs, setDocs] = useState<DocCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [docView, setDocView] = useState<{ url: string; name: string; fileType?: string | null } | null>(null);

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
        const all: DocCard[] = [];

        // Devis & factures par mariage
        const bookings = await getVendorBookings(vendor.id, user?.uid);
        for (const bk of bookings) {
          const d = await getBookingProDocuments(bk.client_id, bk.vendor_id);
          d.forEach((doc: ProDocument) => {
            const type = doc.type === 'facture' ? 'facture' : 'devis';
            all.push({
              id: doc.id,
              name: `${type === 'devis' ? 'Devis' : 'Facture'}${doc.reference ? ` — ${doc.reference}` : ''}`,
              type,
              file_url: doc.devis_file_url || doc.facture_file_url || doc.file_url || '',
              date: doc.date,
              clientNames: bk.client_names,
              amount: doc.amount,
              reference: doc.reference,
              uploadedByVendor: doc.uploaded_by === 'vendor',
              vendorStatus: doc.vendor_status || (doc.uploaded_by === 'vendor' ? 'submitted' : undefined),
              rejectionReason: doc.rejection_reason,
              ts: toTs(doc.date) || toTs((doc as any).created_at),
            });
          });
        }

        // Documents partages par le wedding planner (fiche prestataire)
        try {
          const shared = await getDocuments('vendor_documents', [
            { field: 'vendor_id', operator: '==', value: vendor.id },
          ]);
          (shared || []).forEach((d: any) => {
            all.push({
              id: `shared:${d.id}`,
              name: d.name || 'Document',
              type: 'partage',
              file_url: d.file_url || '',
              date: d.created_at?.toDate ? d.created_at.toDate().toISOString() : d.created_at,
              uploadedByVendor: false,
              ts: toTs(d.created_at),
            });
          });
        } catch {
          // ignore
        }

        all.sort((a, b) => b.ts - a.ts);
        setDocs(all);
      } catch (e) {
        console.error('Error fetching all documents:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [vendor?.id]);

  const categories = useMemo(() => {
    const getCount = (t: string) => docs.filter((d) => d.type === t).length;
    return [
      { id: 'all', label: 'Tous', count: docs.length },
      { id: 'devis', label: 'Devis', count: getCount('devis') },
      { id: 'facture', label: 'Factures', count: getCount('facture') },
      { id: 'partage', label: 'Partagés', count: getCount('partage') },
    ];
  }, [docs]);

  const filtered = docs.filter((d) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      d.name.toLowerCase().includes(q) || (d.clientNames || '').toLowerCase().includes(q);
    const matchesCategory = selectedCategory === 'all' || d.type === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (authLoading || !user || user.role !== 'vendor' || vendorLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-beige">
        <Loader2 className="animate-spin h-8 w-8 text-brand-turquoise" />
      </div>
    );
  }

  const statusBadge = (d: DocCard) => {
    if (!d.uploadedByVendor) return null;
    const st = d.vendorStatus || 'submitted';
    if (st === 'validated') {
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0"><CheckCircle2 className="h-3 w-3 mr-1" />Validé</Badge>;
    }
    if (st === 'rejected') {
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0"><XCircle className="h-3 w-3 mr-1" />Rejeté</Badge>;
    }
    return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-0"><Clock className="h-3 w-3 mr-1" />En attente</Badge>;
  };

  const typeIcon = (t: string, cls: string) => {
    if (t === 'devis') return <FilePen className={cls} />;
    if (t === 'facture') return <File className={cls} />;
    return <FileCheck className={cls} />;
  };

  return (
    <VendorDashboardLayout vendorName={vendor?.name}>
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
              Documents
            </span>
            <h1 className="font-baskerville text-3xl sm:text-4xl text-brand-beige mb-3">
              Mes Documents
            </h1>
            <p className="text-sm text-brand-beige/70">
              {docs.length} document{docs.length > 1 ? 's' : ''} — devis, factures et fichiers partagés
            </p>
          </div>
        </div>

        {/* ---------- RECHERCHE + FILTRES ---------- */}
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-1 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-gray group-focus-within:text-brand-turquoise-hover transition-colors" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher un document, un mariage..."
              className="w-full pl-7 pb-2 bg-transparent border-b border-brand-purple/15 focus:border-brand-turquoise-hover outline-none text-brand-purple placeholder:text-brand-gray text-[15px] transition-colors"
            />
          </div>

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
                  className={`shrink-0 inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-full border transition-all ${
                    active ? `${style.solid} text-white border-transparent shadow-sm` : `bg-white ${style.text}`
                  }`}
                  style={!active ? { borderWidth: 1, borderStyle: 'solid', borderColor: `${style.accent}40` } : undefined}
                >
                  {cat.label}
                  <span className={`text-[10px] ${active ? 'text-white/70' : 'opacity-60'}`}>{cat.count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ---------- GRILLE DE CARTES ---------- */}
        {loading ? (
          <div className="flex justify-center p-16">
            <Loader2 className="animate-spin h-7 w-7 text-brand-turquoise" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 rounded-full bg-brand-purple/8 flex items-center justify-center mx-auto mb-4">
              <FileText className="h-6 w-6 text-brand-purple" />
            </div>
            <p className="text-brand-gray text-sm">Aucun document trouvé</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((d) => {
              const style = catStyle(d.type);
              return (
                <div
                  key={d.id}
                  className={`group relative rounded-3xl border border-brand-purple/8 overflow-hidden hover:shadow-[0_16px_40px_-12px_rgba(75,68,86,0.18)] hover:-translate-y-0.5 transition-all duration-200 ${style.bg}`}
                >
                  <div className={`h-1.5 ${style.solid}`} />
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-white/80 backdrop-blur-sm flex items-center justify-center mb-3 shadow-sm">
                          {typeIcon(d.type, `w-5 h-5 ${style.text}`)}
                        </div>

                        <p className="font-baskerville text-brand-purple text-base leading-snug line-clamp-2 mb-2 min-h-[2.5em]">
                          {d.name}
                        </p>

                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="bg-white/70 text-brand-purple px-2 py-0.5 rounded-full font-semibold text-[10px] uppercase tracking-wide">
                            {typeLabels[d.type]}
                          </span>
                          {statusBadge(d)}
                          {d.date ? (
                            <span className="text-xs text-brand-gray/80">{formatFrenchDate(d.date)}</span>
                          ) : null}
                        </div>

                        {d.clientNames && (
                          <p className="text-[11px] text-brand-gray/80">· {d.clientNames}</p>
                        )}
                        {typeof d.amount === 'number' && (
                          <p className="text-[11px] text-brand-gray/80 mt-0.5">
                            {d.amount.toLocaleString('fr-FR')} €
                          </p>
                        )}
                        {d.vendorStatus === 'rejected' && d.rejectionReason && (
                          <p className="text-[11px] text-red-600 mt-1">Motif : {d.rejectionReason}</p>
                        )}
                      </div>

                      {d.file_url ? (
                        <button
                          onClick={() =>
                            setDocView({ url: d.file_url, name: d.name })
                          }
                          title="Ouvrir"
                          className="shrink-0 w-9 h-9 rounded-full bg-white/70 hover:bg-white flex items-center justify-center text-brand-purple hover:text-brand-turquoise-hover transition-colors shadow-sm"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      ) : null}
                    </div>

                    <div className="mt-4 pt-3 border-t border-brand-purple/8">
                      <span className="text-[11px] text-brand-gray/80">
                        {d.uploadedByVendor ? 'Importé par vous' : 'Ajouté par le wedding planner'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <DocViewerModal
        open={!!docView}
        onOpenChange={(o) => !o && setDocView(null)}
        url={docView?.url}
        name={docView?.name}
        fileType={docView?.fileType}
      />
    </VendorDashboardLayout>
  );
}
