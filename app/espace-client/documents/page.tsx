'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClientDashboardLayout } from '@/components/layout/ClientDashboardLayout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Download,
  Eye,
  Search,
  Filter,
  File,
  FileCheck,
  FilePen,
  CheckCircle,
  Upload,
  Loader2,
  MoreVertical,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useClientData } from '@/contexts/ClientDataContext';
import { calculateDaysRemaining, getClientDevis } from '@/lib/client-helpers';
import { addDocument, getDocument, getDocuments, updateDocument } from '@/lib/db';
import { uploadFile } from '@/lib/storage';
import { toast } from 'sonner';

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
  source?: 'documents' | 'devis';
}

const docTypeLabels: Record<string, string> = {
  contrat: 'Contrat',
  devis: 'Devis',
  facture: 'Facture',
  planning: 'Planning',
  photo: 'Photo',
  autre: 'Autre',
};

export default function DocumentsPage() {
  const { client, event, loading: dataLoading } = useClientData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isDownloadSuccess, setIsDownloadSuccess] = useState(false);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);

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
        const [docItems, devisItems] = await Promise.all([
          getDocuments('documents', [{ field: 'client_id', operator: '==', value: client.id }]),
          getClientDevis(client.id, client.email),
        ]);

        const mappedDocs = (docItems as any[]).map((d) => ({
          ...(d as any),
          source: 'documents' as const,
        })) as DocumentItem[];

        const mappedDevis = (devisItems as any[])
          .filter((dv) => Boolean(dv?.pdf_url) && (dv?.status || 'draft') !== 'draft')
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

        const all = [...mappedDocs, ...mappedDevis];
        setDocuments(all);
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
    if (doc.source !== 'documents') {
      toast.error('Contrat introuvable');
      return;
    }

    if (!doc.contract_id) {
      toast.error('Contrat introuvable');
      return;
    }

    setSigningContractId(doc.contract_id);
    try {
      await updateDocument('contracts', doc.contract_id, {
        status: 'signed',
        signed_at: new Date().toLocaleDateString('fr-FR'),
      });

      await updateDocument('documents', doc.id, {
        status: 'signed',
      });

      setDocuments((prev) => prev.map((d) => (d.id === doc.id ? { ...d, status: 'signed' } : d)));
      toast.success('Contrat validé');
    } catch (e) {
      console.error('Error signing contract:', e);
      toast.error('Impossible de valider le contrat');
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
      const devis = (await getDocument('devis', doc.devis_id)) as any;
      if (!devis) {
        toast.error('Devis introuvable');
        return;
      }

      await updateDocument('devis', doc.devis_id, {
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      });

      const montantTTC = Number(devis.montant_ttc ?? 0);
      await addDocument('invoices', {
        planner_id: devis.planner_id,
        client_id: client.id,
        reference: `FACT-${devis.reference || doc.devis_id}`,
        client: devis.client || '',
        client_email: devis.client_email || client.email || '',
        date: new Date().toLocaleDateString('fr-FR'),
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR'),
        montant_ht: Number(devis.montant_ht ?? 0),
        montant_ttc: montantTTC,
        paid: 0,
        status: 'pending',
        type: 'invoice',
        source: 'devis',
        devis_id: doc.devis_id,
        created_at: new Date(),
      });

      setDocuments((prev) => prev.map((d) => (d.id === doc.id ? { ...d, status: 'accepted' } : d)));
      toast.success('Devis validé');
    } catch (e) {
      console.error('Error accepting devis:', e);
      toast.error('Impossible de valider le devis');
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

  const formatDocDate = (v?: string) => {
    if (!v) return '—';
    if (typeof v === 'string') return v;
    return String(v);
  };

  const categories = useMemo(() => {
    const getCount = (type: string) => documents.filter((d) => (d.type || '').toLowerCase() === type).length;
    return [
      { id: 'all', label: 'Tous', count: documents.length },
      { id: 'contrat', label: 'Contrats', count: getCount('contrat') },
      { id: 'devis', label: 'Devis', count: getCount('devis') },
      { id: 'facture', label: 'Factures', count: getCount('facture') },
      { id: 'planning', label: 'Planning', count: getCount('planning') },
    ];
  }, [documents]);

  const getTypeIcon = (type: string) => {
    const t = (type || '').toLowerCase();
    switch (t) {
      case 'contrat':
        return <FileCheck className="h-5 w-5 text-brand-turquoise" />;
      case 'devis':
        return <FilePen className="h-5 w-5 text-blue-500" />;
      case 'facture':
        return <File className="h-5 w-5 text-green-500" />;
      default:
        return <FileText className="h-5 w-5 text-brand-gray" />;
    }
  };

  const handleOpenFile = (doc: DocumentItem) => {
    if (!doc.file_url) {
      toast.error('Aucun fichier disponible');
      return;
    }
    window.open(doc.file_url, '_blank');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-purple flex items-center gap-2 sm:gap-3">
              <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-brand-turquoise" />
              Mes Documents
            </h1>
            <p className="text-sm sm:text-base text-brand-gray mt-1">
              Tous vos documents au même endroit
            </p>
          </div>
          <Button 
            className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2 w-full sm:w-auto"
            onClick={() => setIsUploadOpen(true)}
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Ajouter un document</span>
            <span className="sm:hidden">Ajouter</span>
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {categories.map((cat) => (
            <Card
              key={cat.id}
              className={`p-4 cursor-pointer transition-all ${
                selectedCategory === cat.id
                  ? 'bg-brand-turquoise text-white shadow-lg'
                  : 'bg-white hover:shadow-md'
              }`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              <p className={`text-2xl font-bold ${selectedCategory === cat.id ? 'text-white' : 'text-brand-purple'}`}>
                {cat.count}
              </p>
              <p className={`text-sm ${selectedCategory === cat.id ? 'text-white/80' : 'text-brand-gray'}`}>
                {cat.label}
              </p>
            </Card>
          ))}
        </div>

        <Card className="p-6 shadow-xl border-0">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-brand-gray" />
              <Input
                placeholder="Rechercher un document..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filtres
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="animate-spin h-8 w-8 text-brand-turquoise" />
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Ajouté par</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => {
                    const isContract = doc.type?.toLowerCase() === 'contrat' && Boolean(doc.contract_id);
                    const canSign = isContract && doc.status !== 'signed' && signingContractId !== doc.contract_id;
                    const isSigning = isContract && signingContractId === doc.contract_id;
                    const isDevis = doc.type?.toLowerCase() === 'devis' && Boolean(doc.devis_id);
                    const devisBusy = isDevis && savingDevisId === doc.devis_id;
                    const devisCanDecide = isDevis && (doc.status === 'sent' || !doc.status);
                    return (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-lg shadow-sm">
                              {getTypeIcon(doc.type)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-brand-purple text-sm sm:text-base truncate">{doc.name}</p>
                              {doc.status ? (
                                <p className="text-xs text-brand-gray">{doc.status}</p>
                              ) : null}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-brand-gray">
                          {docTypeLabels[(doc.type || '').toLowerCase()] || doc.type}
                        </TableCell>
                        <TableCell className="text-brand-gray">{formatDocDate(doc.uploaded_at)}</TableCell>
                        <TableCell className="text-brand-gray">
                          {doc.uploaded_by === 'client' ? 'Vous' : 'Votre planner'}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4 text-brand-gray" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handlePreview(doc)}>
                                Aperçu
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenFile(doc)}>
                                Ouvrir
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDownload(doc)}>
                                Télécharger
                              </DropdownMenuItem>
                              {isDevis ? (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => void acceptDevisFromDoc(doc)}
                                    disabled={!devisCanDecide || devisBusy}
                                  >
                                    {devisBusy ? 'Validation...' : 'Valider'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => void rejectDevisFromDoc(doc)}
                                    disabled={!devisCanDecide || devisBusy}
                                  >
                                    {devisBusy ? 'Refus...' : 'Refuser'}
                                  </DropdownMenuItem>
                                </>
                              ) : null}
                              {isContract ? (
                                <DropdownMenuItem
                                  onClick={() => void handleSignContract(doc)}
                                  disabled={!canSign || isSigning}
                                >
                                  {doc.status === 'signed' ? 'Déjà signé' : (isSigning ? 'Validation...' : 'Signer / Valider')}
                                </DropdownMenuItem>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {!loading && filteredDocuments.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-brand-gray mx-auto mb-4" />
              <p className="text-brand-gray">Aucun document trouvé</p>
            </div>
          )}
        </Card>

        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="sm:max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-brand-purple flex items-center gap-2">
                <FileText className="h-5 w-5 text-brand-turquoise" />
                {selectedDocument?.name}
              </DialogTitle>
              <DialogDescription>
                {(selectedDocument?.type ? (docTypeLabels[(selectedDocument.type || '').toLowerCase()] || selectedDocument.type) : '')}
                {selectedDocument?.uploaded_at ? ` • ${selectedDocument.uploaded_at}` : ''}
                {typeof selectedDocument?.file_size === 'number' ? ` • ${(selectedDocument.file_size / 1024).toFixed(2)} KB` : ''}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="bg-gray-100 rounded-lg p-8 min-h-[200px] flex items-center justify-center">
                <div className="text-center space-y-2">
                  <FileText className="h-12 w-12 text-brand-gray mx-auto" />
                  <p className="text-brand-gray">Ouvrir le document</p>
                  <p className="text-sm text-brand-gray">
                    Cliquez sur "Voir" pour l'ouvrir dans un nouvel onglet.
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
                Fermer
              </Button>
              <Button 
                className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2"
                onClick={() => {
                  if (selectedDocument) handleOpenFile(selectedDocument);
                }}
              >
                <Eye className="h-4 w-4" />
                Voir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDownloadSuccess} onOpenChange={setIsDownloadSuccess}>
          <DialogContent className="sm:max-w-md w-[95vw] sm:w-full text-center">
            <div className="flex flex-col items-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <DialogTitle className="text-brand-purple text-xl">Téléchargement lancé !</DialogTitle>
              <DialogDescription className="mt-2">
                Le document "{selectedDocument?.name}" est en cours de téléchargement.
              </DialogDescription>
            </div>
            <DialogFooter className="justify-center">
              <Button 
                className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
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

        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogContent className="sm:max-w-md w-[95vw] sm:w-full">
            <DialogHeader>
              <DialogTitle className="text-brand-purple">Ajouter un document</DialogTitle>
              <DialogDescription>
                Ajoutez un document pour le partager avec votre Wedding Planner.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nom du document</Label>
                <Input value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="Ex: Devis DJ" />
              </div>

              <div className="space-y-2">
                <Label>Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(['contrat', 'facture', 'planning', 'photo', 'autre'] as const).map((t) => (
                    <Button
                      key={t}
                      type="button"
                      variant={docType === t ? 'default' : 'outline'}
                      className={docType === t ? 'bg-brand-turquoise hover:bg-brand-turquoise-hover' : ''}
                      onClick={() => setDocType(t)}
                    >
                      {docTypeLabels[t]}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Fichier</Label>
                <Input type="file" onChange={handleFileSelect} />
                {selectedFile ? (
                  <p className="text-xs text-brand-gray">
                    {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                  </p>
                ) : null}
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsUploadOpen(false)} disabled={uploading}>
                Annuler
              </Button>
              <Button
                className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
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
