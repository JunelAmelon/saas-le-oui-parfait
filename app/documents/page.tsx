'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Download,
  Eye,
  Search,
  Plus,
  Trash2,
  Upload,
  Loader2,
  FolderOpen,
  MoreVertical,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getDocuments, updateDocument } from '@/lib/db';
import { toast } from 'sonner';

export default function DocumentsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const clientId = searchParams.get('clientId');
  
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [clientName, setClientName] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('contrat');
  const [currentPage, setCurrentPage] = useState(1);
  const documentsPerPage = 5;

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('contrat');

  useEffect(() => {
    if (user) {
      fetchDocuments();
      if (clientId) {
        fetchClientName();
      }
    }
  }, [user, clientId]);

  const fetchClientName = async () => {
    if (!clientId) return;
    try {
      const clients = await getDocuments('clients', [
        { field: 'planner_id', operator: '==', value: user!.uid }
      ]);
      const client = clients.find((c: any) => c.id === clientId);
      if (client) {
        setClientName(client.partner ? `${client.name} & ${client.partner}` : client.name);
      }
    } catch (e) {
      console.error('Error fetching client:', e);
    }
  };

  const openEdit = (doc: any) => {
    setEditingDoc(doc);
    setEditName(doc?.name || '');
    setEditType(doc?.type || 'contrat');
    setIsEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editingDoc?.id) return;
    if (!editName.trim()) {
      toast.error('Nom obligatoire');
      return;
    }
    try {
      await updateDocument('documents', editingDoc.id, {
        name: editName.trim(),
        type: editType,
      });
      toast.success('Document modifié');
      setIsEditOpen(false);
      setEditingDoc(null);
      await fetchDocuments();
    } catch (e) {
      console.error('Error updating document:', e);
      toast.error('Erreur lors de la modification');
    }
  };

  const fetchDocuments = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const filters = [
        { field: 'planner_id', operator: '==', value: user.uid }
      ];
      
      if (clientId) {
        filters.push({ field: 'client_id', operator: '==', value: clientId });
      }

      const data = await getDocuments('documents', filters);
      setDocuments(data);
    } catch (e) {
      console.error('Error fetching documents:', e);
      toast.error('Erreur lors du chargement des documents');
    } finally {
      setLoading(false);
    }
  };

  const parseDocDate = (doc: any) => {
    const raw = doc?.created_timestamp || doc?.uploaded_at || '';
    if (!raw) return 0;
    if (raw?.toDate) return raw.toDate().getTime();
    const s = String(raw);
    const iso = new Date(s);
    if (!Number.isNaN(iso.getTime())) return iso.getTime();
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
      const dd = m[1].padStart(2, '0');
      const mm = m[2].padStart(2, '0');
      const yyyy = m[3];
      const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
      return Number.isNaN(d.getTime()) ? 0 : d.getTime();
    }
    return 0;
  };

  const filteredDocuments = documents
    .filter(doc =>
    doc.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.type?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .slice()
    .sort((a, b) => parseDocDate(b) - parseDocDate(a));

  const totalPages = Math.ceil(filteredDocuments.length / documentsPerPage);
  const startIndex = (currentPage - 1) * documentsPerPage;
  const paginatedDocuments = filteredDocuments.slice(startIndex, startIndex + documentsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleViewDocument = (doc: any) => {
    if (doc.file_url) {
      window.open(doc.file_url, '_blank');
      toast.success('Ouverture du document');
    } else {
      toast.error('Aucun fichier disponible');
    }
  };

  const handleDownloadDocument = (doc: any) => {
    if (doc.file_url) {
      fetch(doc.file_url)
        .then(response => response.blob())
        .then(blob => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${doc.name}.${doc.file_type?.split('/')[1] || 'pdf'}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          toast.success('Document téléchargé');
        })
        .catch(() => {
          window.open(doc.file_url, '_blank');
          toast.info('Document ouvert dans un nouvel onglet');
        });
    } else {
      toast.error('Aucun fichier disponible');
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return;
    
    try {
      const { deleteDocument } = await import('@/lib/db');
      await deleteDocument('documents', docId);
      toast.success('Document supprimé');
      fetchDocuments();
    } catch (e) {
      console.error('Error deleting document:', e);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setDocName(file.name.split('.')[0]);
    }
  };

  const handleUploadDocument = async () => {
    if (!selectedFile || !docName || !user) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setUploading(true);
    try {
      const { uploadFile } = await import('@/lib/storage');
      const { addDocument, getDocument } = await import('@/lib/db');
      
      const fileUrl = await uploadFile(selectedFile, 'documents');
      
      const docData = {
        planner_id: user.uid,
        client_id: clientId || null,
        name: docName,
        type: docType,
        file_url: fileUrl,
        file_type: selectedFile.type,
        file_size: selectedFile.size,
        uploaded_at: new Date().toLocaleDateString('fr-FR'),
        created_timestamp: new Date(),
      };

      await addDocument('documents', docData);

      // Notif in-app côté client (best effort)
      try {
        if (clientId) {
          const clientRaw = (await getDocument('clients', clientId)) as any;
          const clientUserId = clientRaw?.client_user_id || null;
          const clientName = `${clientRaw?.name || ''}${clientRaw?.partner ? ' & ' + clientRaw.partner : ''}`.trim() || 'Client';
          if (clientUserId) {
            await addDocument('notifications', {
              recipient_id: clientUserId,
              type: 'document',
              title: 'Nouveau document',
              message: `Un nouveau document est disponible : ${docName}`,
              link: '/espace-client/documents',
              read: false,
              created_at: new Date(),
              planner_id: user.uid,
              client_id: clientId,
              meta: { client_name: clientName, doc_type: docType, doc_name: docName },
            });

            try {
              const { sendPushToRecipient } = await import('@/lib/push');
              await sendPushToRecipient({
                recipientId: clientUserId,
                title: 'Nouveau document',
                body: `Un nouveau document est disponible : ${docName}`,
                link: '/espace-client/documents',
              });
            } catch (e) {
              console.warn('Unable to send push:', e);
            }

            try {
              const { sendEmailToUid } = await import('@/lib/email');
              await sendEmailToUid({
                recipientUid: clientUserId,
                subject: 'Nouveau document - Le Oui Parfait',
                text: `Un nouveau document est disponible : ${docName}.\n\nConnectez-vous à votre espace client pour le consulter.`,
              });
            } catch (e) {
              console.warn('Unable to send email:', e);
            }
          }
        }
      } catch (e) {
        console.warn('Unable to create client notification for document upload:', e);
      }

      toast.success('Document uploadé avec succès');
      setIsUploadModalOpen(false);
      setSelectedFile(null);
      setDocName('');
      await fetchDocuments();
    } catch (e) {
      console.error('Error uploading document:', e);
      toast.error('Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-brand-purple mb-2">
              Documents
            </h1>
            <p className="text-brand-gray">
              {clientId 
                ? 'Documents du client'
                : 'Gérez tous vos documents et fichiers'}
            </p>
          </div>
          <Button 
            className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2"
            onClick={() => setIsUploadModalOpen(true)}
          >
            <Upload className="h-4 w-4" />
            Uploader un document
          </Button>
        </div>

        <Card className="p-4 shadow-xl border-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-gray" />
            <Input
              placeholder="Rechercher un document..."
              className="pl-10 border-[#E5E5E5] focus-visible:ring-brand-turquoise"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </Card>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-brand-turquoise" />
          </div>
        ) : filteredDocuments.length === 0 ? (
          <Card className="p-12 text-center">
            <FolderOpen className="h-16 w-16 text-brand-gray mx-auto mb-4" />
            <h3 className="text-xl font-bold text-brand-purple mb-2">
              {searchTerm ? 'Aucun résultat' : 'Aucun document'}
            </h3>
            <p className="text-brand-gray mb-6">
              {searchTerm 
                ? 'Essayez avec d\'autres mots-clés' 
                : clientName 
                  ? `Aucun document pour ${clientName}`
                  : 'Commencez par uploader votre premier document'}
            </p>
            {!searchTerm && (
              <Button 
                className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
                onClick={() => setIsUploadModalOpen(true)}
              >
                <Upload className="h-4 w-4 mr-2" /> Uploader un document
              </Button>
            )}
          </Card>
        ) : (
          <>
            <Card className="shadow-xl border-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold text-brand-purple">Nom</TableHead>
                    <TableHead className="font-bold text-brand-purple">Type</TableHead>
                    <TableHead className="font-bold text-brand-purple">Date</TableHead>
                    <TableHead className="font-bold text-brand-purple">Taille</TableHead>
                    <TableHead className="font-bold text-brand-purple text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedDocuments.map((doc) => (
                    <TableRow key={doc.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium text-brand-purple">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-brand-turquoise" />
                          {doc.name || 'Document sans nom'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-brand-turquoise text-brand-turquoise">
                          {doc.type || 'Autre'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-brand-gray">
                        {doc.uploaded_at || 'N/A'}
                      </TableCell>
                      <TableCell className="text-brand-gray">
                        {doc.file_size ? `${(doc.file_size / 1024).toFixed(2)} KB` : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-brand-turquoise hover:text-brand-turquoise hover:bg-brand-turquoise/10"
                            onClick={() => handleViewDocument(doc)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-brand-turquoise hover:text-brand-turquoise hover:bg-brand-turquoise/10"
                            onClick={() => handleDownloadDocument(doc)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-brand-gray hover:text-brand-purple hover:bg-gray-100"
                            onClick={() => openEdit(doc)}
                            title="Modifier"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteDocument(doc.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            {filteredDocuments.length > documentsPerPage && (
              <Card className="p-4 shadow-xl border-0">
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Précédent
                  </Button>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-brand-gray">
                      Page {currentPage} sur {totalPages}
                    </span>
                    <span className="text-xs text-brand-gray">({filteredDocuments.length} document{filteredDocuments.length > 1 ? 's' : ''})</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="gap-2"
                  >
                    Suivant
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            )}
          </>
        )}
      </div>

      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-brand-purple">Uploader un document</DialogTitle>
            <DialogDescription>
              Ajouter un nouveau document {clientName && `pour ${clientName}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nom du document</Label>
              <Input
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="Ex: Contrat sign\u00e9"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Type de document</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contrat">Contrat</SelectItem>
                  <SelectItem value="devis">Devis</SelectItem>
                  <SelectItem value="facture">Facture</SelectItem>
                  <SelectItem value="photo">Photo</SelectItem>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fichier</Label>
              <div className="mt-1">
                <input
                  type="file"
                  onChange={handleFileSelect}
                  className="w-full text-sm text-brand-gray file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-turquoise file:text-white hover:file:bg-brand-turquoise-hover"
                />
              </div>
              {selectedFile && (
                <p className="text-xs text-brand-gray mt-2">
                  Fichier s\u00e9lectionn\u00e9: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadModalOpen(false)} disabled={uploading}>
              Annuler
            </Button>
            <Button 
              className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
              onClick={handleUploadDocument}
              disabled={uploading || !selectedFile}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Upload en cours...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Uploader
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-brand-purple">Modifier un document</DialogTitle>
            <DialogDescription>Modifiez le nom et le type.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nom du document</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Type de document</Label>
              <Select value={editType} onValueChange={setEditType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contrat">Contrat</SelectItem>
                  <SelectItem value="devis">Devis</SelectItem>
                  <SelectItem value="facture">Facture</SelectItem>
                  <SelectItem value="photo">Photo</SelectItem>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditOpen(false);
                setEditingDoc(null);
              }}
            >
              Annuler
            </Button>
            <Button className="bg-brand-turquoise hover:bg-brand-turquoise-hover" onClick={() => void saveEdit()}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
