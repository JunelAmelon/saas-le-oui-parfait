'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClientDashboardLayout } from '@/components/layout/ClientDashboardLayout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  FileText,
  Search,
  File,
  FileCheck,
  FilePen,
  CheckCircle,
  Upload,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useClientData } from '@/contexts/ClientDataContext';
import { calculateDaysRemaining, getClientDevis } from '@/lib/client-helpers';
import { getDocument, getDocuments, addDocument, updateDocument } from '@/lib/db';
import { uploadFile, uploadPdf } from '@/lib/storage';
import { toast } from 'sonner';
import { auth } from '@/lib/firebase';

interface DocumentItem {
  id: string;
  name: string;
  type: string;
  file_url?: string;
  file_type?: string;
  file_size?: number;
  uploaded_at?: string;
  uploaded_by?: 'client' | 'planner' | string;
  status?: string;
  contract_id?: string | null;
  devis_id?: string | null;
  source?: 'documents' | 'devis' | 'contracts';
  docusign?: any;
}

const docTypeLabels: Record<string, string> = {
  contrat: 'Contrat',
  devis: 'Devis',
  facture: 'Facture',
  planning: 'Planning',
  photo: 'Photo',
  autre: 'Autre',
};

// Palette cohérente avec la nouvelle DA (dashboard / hero)
const typeStyles: Record<string, { bg: string; text: string; solid: string; accent: string }> = {
  contrat: { bg: 'bg-brand-turquoise/15', text: 'text-brand-turquoise-hover', solid: 'bg-brand-turquoise', accent: '#88b7b5' },
  devis: { bg: 'bg-brand-purple/10', text: 'text-brand-purple', solid: 'bg-brand-purple', accent: '#4B4456' },
  facture: { bg: 'bg-[#F1EADD]', text: 'text-[#C9A96E]', solid: 'bg-[#C9A96E]', accent: '#C9A96E' },
  planning: { bg: 'bg-[#F3E3E6]', text: 'text-[#B98A96]', solid: 'bg-[#B98A96]', accent: '#B98A96' },
  photo: { bg: 'bg-[#F3E3E6]', text: 'text-[#B98A96]', solid: 'bg-[#B98A96]', accent: '#B98A96' },
  autre: { bg: 'bg-brand-purple/8', text: 'text-brand-gray', solid: 'bg-brand-gray', accent: '#5A5A5A' },
};

const catStyle = (id: string) => typeStyles[id] || typeStyles.autre;

export default function DocumentsPage() {
  const { client, event, loading: dataLoading } = useClientData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isDownloadSuccess, setIsDownloadSuccess] = useState(false);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const syncedEnvelopeIdsRef = useRef<Set<string>>(new Set());

  const [signingContractId, setSigningContractId] = useState<string | null>(null);
  const [savingDevisId, setSavingDevisId] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState<'contrat' | 'facture' | 'planning' | 'photo' | 'autre'>('contrat');

  const clientName = useMemo(() => {
    const n1 = client?.name || '';
    const n2 = client?.partner || '';
    return `${n1}${n1 && n2 ? ' & ' : ''}${n2}`.trim() || event?.couple_names || 'Client';
  }, [client?.name, client?.partner, event?.couple_names]);

  const daysRemaining = event ? calculateDaysRemaining(event.event_date) : 0;

  useEffect(() => {
    async function fetchDocuments() {
      if (!client?.id) {
        setDocuments([]);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [docItems, devisItems, contractItems] = await Promise.all([
          getDocuments('documents', [{ field: 'client_id', operator: '==', value: client.id }]),
          getClientDevis(client.id, client.email),
          getDocuments('contracts', [{ field: 'client_id', operator: '==', value: client.id }]),
        ]);

        const mappedDocs = (docItems as any[]).map((d) => ({
          ...(d as any),
          source: 'documents' as const,
        })) as DocumentItem[];

        const devisIdsFromDocuments = new Set(
          mappedDocs
            .map((d: any) => d?.devis_id)
            .filter((x: any) => typeof x === 'string' && x.length > 0)
        );

        const contractIdsFromDocuments = new Set(
          mappedDocs
            .map((d: any) => d?.contract_id)
            .filter((x: any) => typeof x === 'string' && x.length > 0)
        );

        const mappedDevis = (devisItems as any[])
          .filter((dv) => Boolean(dv?.pdf_url) && (dv?.status || 'draft') !== 'draft')
          .filter((dv) => !devisIdsFromDocuments.has(String(dv.id || '')))
          .map((dv) => {
            const reference = dv.reference || 'Devis';
            return {
              id: `devis:${dv.id}`,
              name: `Devis - ${reference}`,
              type: 'devis',
              file_url: dv.pdf_url,
              file_type: 'application/pdf',
              uploaded_by: 'planner',
              uploaded_at: dv.sent_at || dv.date || dv.created_at || '',
              status: dv.status || 'sent',
              devis_id: dv.id,
              source: 'devis' as const,
            } as DocumentItem;
          });

        const mappedContracts = (contractItems as any[])
          .filter((c) => Boolean(c?.pdf_url))
          .filter((c) => !contractIdsFromDocuments.has(String(c.id || '')))
          .map((c) => {
            const reference = c.reference || 'Contrat';
            const status = c?.docusign?.status || c.status || 'sent';
            return {
              id: `contract:${c.id}`,
              name: `Contrat - ${reference}`,
              type: 'contrat',
              file_url: c.pdf_url,
              file_type: 'application/pdf',
              uploaded_by: 'planner',
              uploaded_at: c.sent_at || c.created_at || '',
              status,
              contract_id: c.id,
              source: 'contracts' as const,
              docusign: c.docusign || null,
            } as DocumentItem;
          });

        const all = [...mappedDocs, ...mappedDevis, ...mappedContracts];
        setDocuments(all);

        try {
          const idToken = await auth.currentUser?.getIdToken().catch(() => null);
          if (!idToken) return;

          const toSync = mappedContracts
            .map((c) => ({
              docId: String(c.contract_id || '').trim(),
              envelopeId: String((c as any)?.docusign?.envelope_id || '').trim(),
              status: String((c as any)?.docusign?.status || c.status || '').trim().toLowerCase(),
            }))
            .filter((x) => x.docId && x.envelopeId && x.status !== 'completed')
            .filter((x) => !syncedEnvelopeIdsRef.current.has(x.envelopeId));

          if (toSync.length === 0) return;

          toSync.forEach((x) => syncedEnvelopeIdsRef.current.add(x.envelopeId));

          await Promise.allSettled(
            toSync.slice(0, 5).map((x) =>
              fetch('/api/docusign/sync-envelope', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({ docType: 'contract', docId: x.docId }),
              })
            )
          );

          setTimeout(() => {
            fetchDocuments();
          }, 800);
        } catch (e) {
          console.warn('DocuSign sync fallback failed (client documents):', e);
        }
      } catch (e) {
        console.error('Error fetching client documents:', e);
        toast.error('Erreur lors du chargement des documents');
      } finally {
        setLoading(false);
      }
    }

    if (!dataLoading) {
      fetchDocuments();
    }
  }, [client?.id, dataLoading]);

  const handlePreview = (doc: DocumentItem) => {
    setSelectedDocument(doc);
    setIsPreviewOpen(true);
  };

  const handleSignContract = async (doc: DocumentItem) => {
    if (!doc.contract_id) {
      toast.error('Contrat introuvable');
      return;
    }

    setSigningContractId(doc.contract_id);
    try {
      const idToken = await auth.currentUser?.getIdToken().catch(() => null);
      if (!idToken) {
        toast.error('Vous devez être connecté pour signer');
        return;
      }

      const contractRaw = (await getDocument('contracts', doc.contract_id)) as any;
      const envelopeIdExisting = String(contractRaw?.docusign?.envelope_id || '');
      let envelopeId = envelopeIdExisting;

      if (!envelopeId) {
        const createRes = await fetch('/api/docusign/create-envelope', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ docType: 'contract', docId: doc.contract_id }),
        });
        const createJson = await createRes.json().catch(() => null);
        if (!createRes.ok) {
          toast.error(createJson?.error || 'Impossible de préparer la signature');
          return;
        }
        envelopeId = String(createJson?.envelopeId || '');
      }

      if (!envelopeId) {
        toast.error('Impossible de préparer la signature');
        return;
      }

      const viewRes = await fetch('/api/docusign/recipient-view', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ envelopeId, recipientRole: 'client' }),
      });
      const viewJson = await viewRes.json().catch(() => null);
      if (!viewRes.ok) {
        toast.error(viewJson?.error || 'Impossible de démarrer la signature');
        return;
      }

      const url = String(viewJson?.url || '');
      if (!url) {
        toast.error('URL de signature manquante');
        return;
      }

      window.location.href = url;
    } catch (e) {
      console.error('Error signing contract:', e);
      toast.error('Impossible de démarrer la signature');
    } finally {
      setSigningContractId(null);
    }
  };

  const handleDownload = (doc: DocumentItem) => {
    setSelectedDocument(doc);
    setIsDownloadSuccess(true);
  };

  const acceptDevisFromDoc = async (doc: DocumentItem) => {
    if (!client?.id || !doc.devis_id) {
      toast.error('Devis introuvable');
      return;
    }
    setSavingDevisId(doc.devis_id);
    try {
      const idToken = await auth.currentUser?.getIdToken().catch(() => null);
      if (!idToken) {
        toast.error('Vous devez être connecté');
        return;
      }

      const devis = (await getDocument('devis', doc.devis_id)) as any;
      if (!devis) {
        toast.error('Devis introuvable');
        return;
      }

      await updateDocument('devis', doc.devis_id, {
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      });

      const envelopeIdExisting = String(devis?.docusign?.envelope_id || '').trim();
      let envelopeId = envelopeIdExisting;
      if (!envelopeId) {
        const createRes = await fetch('/api/docusign/create-envelope', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ docType: 'devis', docId: doc.devis_id }),
        });
        const createJson = await createRes.json().catch(() => null);
        if (!createRes.ok) {
          toast.error(createJson?.error || 'Impossible de préparer la signature');
          return;
        }
        envelopeId = String(createJson?.envelopeId || '').trim();
      }

      if (!envelopeId) {
        toast.error('Impossible de préparer la signature');
        return;
      }

      const viewRes = await fetch('/api/docusign/recipient-view', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ envelopeId, recipientRole: 'client' }),
      });
      const viewJson = await viewRes.json().catch(() => null);
      if (!viewRes.ok) {
        toast.error(viewJson?.error || 'Impossible d’ouvrir la signature');
        return;
      }

      const url = String(viewJson?.url || '').trim();
      if (!url) {
        toast.error('URL de signature introuvable');
        return;
      }

      toast.success('Redirection vers signature');
      window.location.href = url;
    } catch (e) {
      console.error('Error accepting devis:', e);
      toast.error('Impossible de valider / signer le devis');
    } finally {
      setSavingDevisId(null);
    }
  };

  const rejectDevisFromDoc = async (doc: DocumentItem) => {
    if (!doc.devis_id) {
      toast.error('Devis introuvable');
      return;
    }
    setSavingDevisId(doc.devis_id);
    try {
      await updateDocument('devis', doc.devis_id, {
        status: 'rejected',
        rejected_at: new Date().toISOString(),
      });
      setDocuments((prev) => prev.map((d) => (d.id === doc.id ? { ...d, status: 'rejected' } : d)));
      toast.success('Devis refusé');
    } catch (e) {
      console.error('Error rejecting devis:', e);
      toast.error('Impossible de refuser le devis');
    } finally {
      setSavingDevisId(null);
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = (doc.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const docCategory = (doc.type || '').toLowerCase();
    const matchesCategory = selectedCategory === 'all' || docCategory === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const parseDocDate = (doc: DocumentItem) => {
    const rawAny: any = (doc as any)?.created_timestamp || (doc as any)?.created_at || doc.uploaded_at || '';
    if (!rawAny) return 0;
    if (rawAny?.toDate) return rawAny.toDate().getTime();
    const raw = String(rawAny).trim();
    if (!raw) return 0;
    const iso = new Date(raw);
    if (!Number.isNaN(iso.getTime())) return iso.getTime();
    const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
      const dd = m[1].padStart(2, '0');
      const mm = m[2].padStart(2, '0');
      const yyyy = m[3];
      const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
      return Number.isNaN(d.getTime()) ? 0 : d.getTime();
    }
    return 0;
  };

  const sortedDocuments = filteredDocuments.slice().sort((a, b) => parseDocDate(b) - parseDocDate(a));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, documents.length]);

  const totalPages = Math.max(1, Math.ceil(sortedDocuments.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDocuments = sortedDocuments.slice(startIndex, startIndex + itemsPerPage);

  const formatDocDate = (v?: string) => {
    if (!v) return '—';
    if (typeof v === 'string') return v;
    return String(v);
  };

  const categories = useMemo(() => {
    const getCount = (type: string) => documents.filter((d) => (d.type || '').toLowerCase() === type).length;
    return [
      { id: 'all', label: 'Tous' },
      { id: 'contrat', label: 'Contrats' },
      { id: 'devis', label: 'Devis' },
      { id: 'facture', label: 'Factures' },
      { id: 'planning', label: 'Planning' },
    ].map((c) => ({ ...c, count: c.id === 'all' ? documents.length : getCount(c.id) }));
  }, [documents]);

  const pendingSignatures = useMemo(() => {
    return documents.filter((d) => {
      const isContract = d.type?.toLowerCase() === 'contrat' && Boolean(d.contract_id);
      const isDevis = d.type?.toLowerCase() === 'devis' && Boolean(d.devis_id);
      if (!isContract && !isDevis) return false;
      const dsStatus = String(d?.docusign?.status || d.status || '').toLowerCase();
      const clientStatus = String(d?.docusign?.recipients?.client?.status || '').toLowerCase();
      return dsStatus !== 'completed' && clientStatus !== 'completed' && (d.status === 'sent' || !d.status || isContract);
    }).length;
  }, [documents]);

  const lastAddedLabel = useMemo(() => {
    if (documents.length === 0) return null;
    const sorted = documents.slice().sort((a, b) => parseDocDate(b) - parseDocDate(a));
    return formatDocDate(sorted[0]?.uploaded_at);
  }, [documents]);

  const getTypeIcon = (type: string, className: string) => {
    const t = (type || '').toLowerCase();
    switch (t) {
      case 'contrat':
        return <FileCheck className={className} />;
      case 'devis':
        return <FilePen className={className} />;
      case 'facture':
        return <File className={className} />;
      default:
        return <FileText className={className} />;
    }
  };

  const handleOpenFile = (doc: DocumentItem) => {
    if (!doc.file_url) {
      toast.error('Aucun fichier disponible');
      return;
    }
    window.open(doc.file_url, '_blank');
  };

  const isAllowedFile = (file: File) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    const allowedExts = ['.pdf', '.doc', '.docx'];
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    return allowedTypes.includes(file.type) || allowedExts.includes(ext);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file && !isAllowedFile(file)) {
      toast.error('Format non autorisé. Veuillez choisir un PDF ou un document Word.');
      e.target.value = '';
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
    if (file && !docName) {
      setDocName(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleUploadDocument = async () => {
    if (!client?.id) {
      toast.error('Client introuvable');
      return;
    }
    if (!selectedFile || !docName) {
      toast.error('Veuillez sélectionner un fichier et un nom');
      return;
    }
    if (!isAllowedFile(selectedFile)) {
      toast.error('Format non autorisé. Veuillez choisir un PDF ou un document Word.');
      return;
    }
    if (!client.planner_id) {
      toast.error('Planner introuvable');
      return;
    }

    setUploading(true);
    try {
      const fileUrl = await uploadFile(selectedFile, 'documents');
      await addDocument('documents', {
        planner_id: client.planner_id,
        client_id: client.id,
        event_id: event?.id || null,
        name: docName,
        type: docType,
        file_url: fileUrl,
        file_type: selectedFile.type,
        file_size: selectedFile.size,
        uploaded_by: 'client',
        uploaded_at: new Date().toLocaleDateString('fr-FR'),
        created_timestamp: new Date(),
      });

      toast.success('Document ajouté');
      setIsUploadOpen(false);
      setSelectedFile(null);
      setDocName('');
      setDocType('contrat');

      const items = await getDocuments('documents', [
        { field: 'client_id', operator: '==', value: client.id },
      ]);
      setDocuments(items as unknown as DocumentItem[]);
    } catch (e) {
      console.error('Error uploading document:', e);
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <ClientDashboardLayout clientName={clientName} daysRemaining={daysRemaining}>
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

          <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <span className="inline-block text-[10px] tracking-label uppercase text-brand-purple bg-white/90 px-3 py-1.5 rounded-full mb-4">
                Documents
              </span>
              <h1 className="font-baskerville text-3xl sm:text-4xl text-brand-beige mb-3">
                Mes Documents
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-brand-beige/70">
                <span>{documents.length} document{documents.length > 1 ? 's' : ''}</span>
                {lastAddedLabel && (
                  <>
                    <span className="text-brand-beige/25">·</span>
                    <span>dernier ajout le {lastAddedLabel}</span>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={() => setIsUploadOpen(true)}
              className="inline-flex items-center gap-3 bg-[#2E2937] hover:bg-[#221f2a] text-white text-sm font-semibold pl-5 pr-1.5 py-1.5 rounded-full transition-colors shrink-0"
            >
              Ajouter un document
              <span className="w-8 h-8 rounded-full bg-brand-turquoise flex items-center justify-center">
                <Upload className="w-3.5 h-3.5 text-white" />
              </span>
            </button>
          </div>
        </div>

        {/* ---------- RECHERCHE ÉDITORIALE + FILTRES COLORÉS PAR CATÉGORIE ---------- */}
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-1 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-gray group-focus-within:text-brand-turquoise-hover transition-colors" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher un document..."
              className="w-full pl-7 pb-2 bg-transparent border-b border-brand-purple/15 focus:border-brand-turquoise-hover outline-none text-brand-purple placeholder:text-brand-gray text-[15px] transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {categories.map((cat) => {
              const active = selectedCategory === cat.id;

              // "Tous" reste neutre en violet — il n'a pas de couleur de catégorie propre
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

        {/* ---------- GRILLE DE CARTES-DOCUMENTS ---------- */}
        {loading ? (
          <div className="flex justify-center p-16">
            <Loader2 className="animate-spin h-7 w-7 text-brand-turquoise" />
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 rounded-full bg-brand-purple/8 flex items-center justify-center mx-auto mb-4">
              <FileText className="h-6 w-6 text-brand-purple" />
            </div>
            <p className="text-brand-gray text-sm">Aucun document trouvé</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedDocuments.map((doc) => {
                const isContract = doc.type?.toLowerCase() === 'contrat' && Boolean(doc.contract_id);
                const dsStatusRaw = String(doc?.docusign?.status || doc.status || '').toLowerCase();
                const dsRecipients = doc?.docusign?.recipients || null;
                const adminRecipientStatus = String(dsRecipients?.planner?.status || '').toLowerCase();
                const clientRecipientStatus = String(dsRecipients?.client?.status || '').toLowerCase();

                const adminSigned = adminRecipientStatus === 'completed';
                const clientSigned = clientRecipientStatus === 'completed';
                const fullySigned = doc.status === 'signed' || dsStatusRaw === 'completed' || (adminSigned && clientSigned);

                const canSign = isContract && !fullySigned && !clientSigned && signingContractId !== doc.contract_id;
                const isSigning = isContract && signingContractId === doc.contract_id;
                const isDevis = doc.type?.toLowerCase() === 'devis' && Boolean(doc.devis_id);
                const devisBusy = isDevis && savingDevisId === doc.devis_id;
                const devisCanDecide = isDevis && (doc.status === 'sent' || !doc.status);
                const devisClientSigned = isDevis && clientRecipientStatus === 'completed';
                const devisFullySigned = isDevis && (doc.status === 'signed' || dsStatusRaw === 'completed');
                const devisCanSign = devisCanDecide && !devisClientSigned && !devisFullySigned;

                const style = catStyle((doc.type || '').toLowerCase());
                const showPrimaryAction = (isContract && canSign) || (isDevis && devisCanSign);

                return (
                  <div
                    key={doc.id}
                    className={`group relative rounded-3xl border border-brand-purple/8 overflow-hidden hover:shadow-[0_16px_40px_-12px_rgba(75,68,86,0.18)] hover:-translate-y-0.5 transition-all duration-200 ${style.bg}`}
                  >
                    <div className={`h-1.5 ${style.solid}`} />
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="w-12 h-12 rounded-2xl bg-white/80 backdrop-blur-sm flex items-center justify-center mb-3 shadow-sm">
                            {getTypeIcon(doc.type, `w-5 h-5 ${style.text}`)}
                          </div>

                          <p className="font-baskerville text-brand-purple text-base leading-snug line-clamp-2 mb-2 min-h-[2.5em]">
                            {doc.name}
                          </p>

                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className={`bg-white/70 text-brand-purple px-2 py-0.5 rounded-full font-semibold text-[10px] uppercase tracking-wide`}>
                              {docTypeLabels[(doc.type || '').toLowerCase()] || doc.type}
                            </span>
                            <span className="text-xs text-brand-gray/80">{formatDocDate(doc.uploaded_at)}</span>
                          </div>

                          {isContract && (
                            <p className="text-[11px] text-brand-gray/80">
                              {fullySigned
                                ? '✓ Contrat signé'
                                : clientSigned
                                  ? 'Vous avez signé — en attente du planner'
                                  : adminSigned
                                    ? 'Planner a signé — il reste votre signature'
                                    : doc.status || ''}
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() => handleOpenFile(doc)}
                          title="Ouvrir"
                          className="shrink-0 w-9 h-9 rounded-full bg-white/70 hover:bg-white flex items-center justify-center text-brand-purple hover:text-brand-turquoise-hover transition-colors shadow-sm"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="mt-4 pt-3 border-t border-brand-purple/8">
                        <span className="text-[11px] text-brand-gray/80">
                          {doc.uploaded_by === 'client' ? 'Ajouté par vous' : 'Ajouté par le planner'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {sortedDocuments.length > itemsPerPage ? (
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
            ) : null}
          </>
        )}

        {/* ---------- APERÇU ---------- */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="sm:max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto rounded-3xl">
            <DialogHeader>
              <DialogTitle className="font-baskerville text-2xl text-brand-purple flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-brand-turquoise/15 flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4 text-brand-turquoise-hover" />
                </span>
                {selectedDocument?.name}
              </DialogTitle>
              <DialogDescription>
                {(selectedDocument?.type ? (docTypeLabels[(selectedDocument.type || '').toLowerCase()] || selectedDocument.type) : '')}
                {selectedDocument?.uploaded_at ? ` • ${selectedDocument.uploaded_at}` : ''}
                {typeof selectedDocument?.file_size === 'number' ? ` • ${(selectedDocument.file_size / 1024).toFixed(2)} KB` : ''}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="bg-brand-beige rounded-2xl p-10 min-h-[200px] flex items-center justify-center">
                <div className="text-center space-y-2">
                  <FileText className="h-10 w-10 text-brand-purple/40 mx-auto" />
                  <p className="text-brand-purple font-baskerville text-lg">Ouvrir le document</p>
                  <p className="text-sm text-brand-gray">
                    Cliquez sur &quot;Voir&quot; pour l&apos;ouvrir dans un nouvel onglet.
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" className="rounded-full" onClick={() => setIsPreviewOpen(false)}>
                Fermer
              </Button>
              <Button
                className="bg-brand-turquoise hover:bg-brand-turquoise-hover rounded-full gap-2"
                onClick={() => {
                  if (selectedDocument) handleOpenFile(selectedDocument);
                }}
              >
                <ExternalLink className="h-4 w-4" />
                Ouvrir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ---------- SUCCÈS TÉLÉCHARGEMENT ---------- */}
        <Dialog open={isDownloadSuccess} onOpenChange={setIsDownloadSuccess}>
          <DialogContent className="sm:max-w-md w-[95vw] sm:w-full text-center rounded-3xl">
            <div className="flex flex-col items-center py-6">
              <div className="w-16 h-16 bg-brand-turquoise/15 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-7 w-7 text-brand-turquoise-hover" />
              </div>
              <DialogTitle className="font-baskerville text-brand-purple text-xl">Téléchargement lancé !</DialogTitle>
              <DialogDescription className="mt-2">
                Le document &quot;{selectedDocument?.name}&quot; est en cours de téléchargement.
              </DialogDescription>
            </div>
            <DialogFooter className="justify-center">
              <Button
                className="bg-brand-turquoise hover:bg-brand-turquoise-hover rounded-full"
                onClick={() => {
                  if (selectedDocument) handleOpenFile(selectedDocument);
                  setIsDownloadSuccess(false);
                }}
              >
                Ouvrir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ---------- AJOUT DOCUMENT ---------- */}
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogContent className="sm:max-w-md w-[95vw] sm:w-full rounded-3xl">
            <DialogHeader>
              <DialogTitle className="font-baskerville text-2xl text-brand-purple">Ajouter un document</DialogTitle>
              <DialogDescription>
                Ajoutez un document pour le partager avec votre Wedding Planner.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-4">
              <div className="space-y-2">
                <Label className="text-[10px] tracking-label uppercase text-brand-gray">Nom du document</Label>
                <Input
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="Ex: Devis DJ"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] tracking-label uppercase text-brand-gray">Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(['contrat', 'facture', 'planning', 'autre'] as const).map((t) => {
                    const active = docType === t;
                    const style = catStyle(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setDocType(t)}
                        className={`text-sm font-medium rounded-xl px-3 py-2.5 border transition-colors ${
                          active
                            ? `${style.solid} text-white border-transparent`
                            : 'bg-white border-brand-purple/12 text-brand-purple hover:border-brand-purple/25'
                        }`}
                      >
                        {docTypeLabels[t]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] tracking-label uppercase text-brand-gray">Fichier</Label>
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileSelect}
                  className="rounded-xl"
                />
                <p className="text-[10px] text-brand-gray">Formats acceptés : PDF, Word (.doc, .docx)</p>
                {selectedFile ? (
                  <p className="text-xs text-brand-gray">
                    {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                  </p>
                ) : null}
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" className="rounded-full" onClick={() => setIsUploadOpen(false)} disabled={uploading}>
                Annuler
              </Button>
              <Button
                className="bg-brand-turquoise hover:bg-brand-turquoise-hover rounded-full"
                onClick={() => void handleUploadDocument()}
                disabled={uploading || !selectedFile || !docName}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Upload...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Ajouter
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ClientDashboardLayout>
  );
}