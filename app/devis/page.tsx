'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Search, FileText, Eye, Download, Send, Clock, CheckCircle, Euro, Calendar, Edit, Loader2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getDocument, getDocuments, addDocument, updateDocument, deleteDocument } from '@/lib/db';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { NewDevisModal } from '@/components/modals/NewDevisModal';
import { uploadPdf } from '@/lib/storage';

interface Devis {
  id: string;
  reference: string;
  clientId?: string;
  client: string;
  date: string;
  montantHT: number;
  montantTTC: number;
  status: string;
  validUntil: string;
  description?: string;
  tva: number;
  pdfUrl?: string;
  createdAt?: any;
}


const statusConfig = {
  draft: {
    label: 'Brouillon',
    color: 'bg-gray-100 text-gray-700',
    icon: FileText,
  },
  sent: {
    label: 'Envoyé',
    color: 'bg-blue-100 text-blue-700',
    icon: Send,
  },
  accepted: {
    label: 'Accepté',
    color: 'bg-green-100 text-green-700',
    icon: CheckCircle,
  },
  rejected: {
    label: 'Refusé',
    color: 'bg-red-100 text-red-700',
    icon: Clock,
  },
};

export default function DevisPage() {
  const { user } = useAuth();
  const [devisList, setDevisList] = useState<Devis[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDevis, setSelectedDevis] = useState<Devis | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isNewDevisOpen, setIsNewDevisOpen] = useState(false);
  const [isSendOpen, setIsSendOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [sendEmail, setSendEmail] = useState('');
  const [sendMessage, setSendMessage] = useState(
    "Bonjour, veuillez trouver ci-joint notre devis pour votre mariage. N'hésitez pas à nous contacter pour toute question."
  );
  const [isDownloadSuccess, setIsDownloadSuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;

  const [editValidUntil, setEditValidUntil] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const [isBonCommandeOpen, setIsBonCommandeOpen] = useState(false);
  const [bonCommandeVendors, setBonCommandeVendors] = useState<any[]>([]);
  const [bonCommandeVendorId, setBonCommandeVendorId] = useState('');
  const [bonCommandeLoading, setBonCommandeLoading] = useState(false);

  const generateBonCommandePdf = async (params: {
    reference: string;
    devis: any;
    vendor: any;
  }): Promise<Blob> => {
    const { reference, devis, vendor } = params;
    const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 40;
    let y = 48;

    const addLine = (text: string, fontSize = 10, gap = 14) => {
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text, pageWidth - marginX * 2);
      doc.text(lines, marginX, y);
      y += lines.length * gap;
    };

    doc.setFontSize(18);
    doc.text('BON DE COMMANDE', pageWidth / 2, y, { align: 'center' });
    y += 22;

    doc.setFontSize(11);
    doc.text(reference, pageWidth / 2, y, { align: 'center' });
    y += 20;

    addLine(`Date : ${new Date().toLocaleDateString('fr-FR')}`, 10, 14);
    addLine(`Devis lié : ${String(devis?.reference || '')}`, 10, 14);
    y += 8;

    addLine(`Prestataire : ${String(vendor?.name || vendor?.vendorName || vendor?.title || '')}`, 11, 16);
    if (vendor?.email) addLine(`Email : ${String(vendor.email)}`, 10, 14);
    if (vendor?.phone) addLine(`Téléphone : ${String(vendor.phone)}`, 10, 14);
    y += 8;

    addLine(`Client : ${String(devis?.client || '')}`, 11, 16);
    if (devis?.client_email) addLine(`Email client : ${String(devis.client_email)}`, 10, 14);
    y += 12;

    doc.setFontSize(11);
    doc.text('Prestations commandées', marginX, y);
    y += 14;

    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.text('Description', marginX, y);
    doc.text('Qté', pageWidth - marginX - 140, y, { align: 'right' });
    doc.text('PU', pageWidth - marginX - 80, y, { align: 'right' });
    doc.text('Total', pageWidth - marginX, y, { align: 'right' });
    y += 8;
    doc.setDrawColor(220);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 14;
    doc.setTextColor(30);

    const items = Array.isArray(devis?.items) ? devis.items : [];
    for (const it of items) {
      const desc = String(it?.description || '');
      const qty = Number(it?.quantity || 0);
      const pu = Number(it?.unit_price || 0);
      const total = Number(it?.total || qty * pu);

      const descLines = doc.splitTextToSize(desc, pageWidth - marginX * 2 - 170);
      const rowHeight = Math.max(14, descLines.length * 12);

      if (y + rowHeight > 760) {
        doc.addPage();
        y = 48;
      }

      doc.setFontSize(10);
      doc.text(descLines, marginX, y);
      doc.text(String(qty), pageWidth - marginX - 140, y, { align: 'right' });
      doc.text(`${pu.toFixed(2)} €`, pageWidth - marginX - 80, y, { align: 'right' });
      doc.text(`${total.toFixed(2)} €`, pageWidth - marginX, y, { align: 'right' });
      y += rowHeight;
      doc.setDrawColor(240);
      doc.line(marginX, y, pageWidth - marginX, y);
      y += 10;
    }

    y += 10;
    const totalHT = Number(devis?.montant_ht || 0);
    const totalTTC = Number(devis?.montant_ttc || 0);
    doc.setFontSize(11);
    doc.text(`Total HT : ${totalHT.toFixed(2)} €`, pageWidth - marginX, y, { align: 'right' });
    y += 16;
    doc.text(`Total TTC : ${totalTTC.toFixed(2)} €`, pageWidth - marginX, y, { align: 'right' });

    y += 24;
    doc.setFontSize(9);
    doc.setTextColor(90);
    addLine(
      "Merci d'émettre une facture conforme à ce bon de commande (mêmes intitulés, quantités et montants) afin de permettre le règlement.",
      9,
      12
    );

    return doc.output('blob');
  };

  // Fetch devis
  const fetchDevis = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getDocuments('devis', [
        { field: 'planner_id', operator: '==', value: user.uid }
      ]);
      const mapped = data.map((d: any) => ({
        id: d.id,
        reference: d.reference,
        clientId: d.client_id,
        client: d.client,
        date: d.date,
        montantHT: d.montant_ht,
        montantTTC: d.montant_ttc,
        status: d.status,
        validUntil: d.valid_until,
        description: d.description || '',
        tva: d.tva,
        pdfUrl: d.pdf_url || '',
        createdAt: d.created_at || null,
      }));

      const parseCreatedAt = (v: any) => {
        if (!v) return 0;
        const d = v?.toDate?.() || new Date(v);
        return Number.isNaN(d.getTime()) ? 0 : d.getTime();
      };

      const parseDateFallback = (v?: string) => {
        if (!v) return 0;
        const iso = new Date(v);
        if (!Number.isNaN(iso.getTime())) return iso.getTime();
        const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (m) {
          const d = new Date(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10));
          return d.getTime();
        }
        return 0;
      };

      const sorted = mapped
        .slice()
        .sort((a, b) => {
          const aTime = parseCreatedAt(a.createdAt) || parseDateFallback(a.date);
          const bTime = parseCreatedAt(b.createdAt) || parseDateFallback(b.date);
          return bTime - aTime;
        });

      setDevisList(sorted);
    } catch (e) {
      console.error('Error fetching devis:', e);
      toast.error('Erreur lors du chargement des devis');
    } finally {
      setLoading(false);
    }
  };

  const openBonCommande = async (devis: Devis) => {
    if (!user) return;
    setSelectedDevis(devis);
    setBonCommandeVendorId('');
    setIsBonCommandeOpen(true);
    try {
      const vendors = await getDocuments('vendors', [{ field: 'planner_id', operator: '==', value: user.uid }]);
      setBonCommandeVendors(vendors as any[]);
    } catch (e) {
      console.error('Error fetching vendors for bon de commande:', e);
      setBonCommandeVendors([]);
    }
  };

  const confirmBonCommande = async () => {
    if (!user || !selectedDevis) return;
    if (!bonCommandeVendorId) {
      toast.error('Veuillez sélectionner un prestataire');
      return;
    }

    const pdfWindow = window.open('', '_blank');

    setBonCommandeLoading(true);
    try {
      const devisDoc = (await getDocument('devis', selectedDevis.id)) as any;
      if (!devisDoc) {
        toast.error('Devis introuvable');
        return;
      }

      const vendor = (bonCommandeVendors || []).find((v: any) => v?.id === bonCommandeVendorId);
      const reference = `BC-${devisDoc.reference || selectedDevis.reference || selectedDevis.id}`;
      const lines = Array.isArray(devisDoc.items) ? devisDoc.items : [];

      // Évite de créer un nouveau bon de commande à chaque clic: réutilise l'existant si présent.
      try {
        const existingDocs = await getDocuments('documents', [
          { field: 'planner_id', operator: '==', value: user.uid },
          { field: 'devis_id', operator: '==', value: selectedDevis.id },
        ]);

        const existing = (existingDocs as any[])
          .slice()
          .find((d: any) =>
            d?.type === 'bon_de_commande' &&
            String(d?.vendor_id || '') === String(vendor?.id || bonCommandeVendorId) &&
            Boolean(d?.file_url)
          );

        if (existing?.file_url) {
          toast.message('Bon de commande déjà généré', {
            description: 'Ouverture de la dernière version enregistrée.',
          });
          setIsBonCommandeOpen(false);

          if (pdfWindow && !pdfWindow.closed) {
            pdfWindow.location.href = existing.file_url;
            pdfWindow.focus();
          } else {
            const link = document.createElement('a');
            link.href = existing.file_url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.download = `${reference}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
          return;
        }
      } catch (e) {
        // Best effort: si la recherche échoue, on continue sur la génération standard.
        console.warn('Unable to check existing bon de commande documents:', e);
      }

      const pdfBlob = await generateBonCommandePdf({ reference, devis: devisDoc, vendor });
      const pdfUrl = await uploadPdf(pdfBlob, reference);

      await addDocument('documents', {
        type: 'bon_de_commande',
        name: `Bon de commande - ${reference}`,
        status: 'generated',
        source: 'devis',
        planner_id: user.uid,
        client_id: devisDoc.client_id || selectedDevis.clientId || '',
        client: devisDoc.client || selectedDevis.client || '',
        client_email: devisDoc.client_email || null,
        devis_id: selectedDevis.id,
        vendor_id: vendor?.id || bonCommandeVendorId,
        vendor_name: vendor?.name || vendor?.vendorName || vendor?.title || '',
        reference,
        file_url: pdfUrl,
        file_type: 'application/pdf',
        uploaded_by: 'planner',
        uploaded_at: new Date().toLocaleDateString('fr-FR'),
        created_timestamp: new Date(),
        lines: lines.map((it: any) => ({
          description: String(it?.description || ''),
          quantity: Number(it?.quantity || 0),
          unit_price: Number(it?.unit_price || 0),
          total: Number(it?.total || (Number(it?.quantity || 0) * Number(it?.unit_price || 0))),
        })),
        created_at: new Date(),
      });

      toast.success('Bon de commande créé');
      setIsBonCommandeOpen(false);

      if (pdfWindow && !pdfWindow.closed) {
        pdfWindow.location.href = pdfUrl;
        pdfWindow.focus();
      } else {
        // Popup bloquée: on déclenche un téléchargement / ouverture via un lien.
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.download = `${reference}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.message('Le PDF est prêt', {
          description: "Votre navigateur a bloqué l'ouverture automatique. Le téléchargement a été déclenché.",
        });
      }
    } catch (e) {
      console.error('Error creating bon de commande:', e);
      if (pdfWindow && !pdfWindow.closed) {
        pdfWindow.close();
      }
      toast.error('Impossible de créer le bon de commande');
    } finally {
      setBonCommandeLoading(false);
    }
  };

  useEffect(() => {
    fetchDevis();
  }, [user]);


  const handleDelete = async (devisId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce devis ?')) return;
    
    try {
      await deleteDocument('devis', devisId);
      toast.success('Devis supprimé');
      setIsDetailOpen(false);
      fetchDevis();
    } catch (e) {
      toast.error('Erreur lors de la suppression');
    }
  };


  const handleViewDetail = (devis: Devis) => {
    if (devis.pdfUrl) {
      // Ouvrir le PDF dans un nouvel onglet
      window.open(devis.pdfUrl, '_blank');
    } else {
      // Si pas de PDF, afficher les détails
      setSelectedDevis(devis);
      setIsDetailOpen(true);
    }
  };

  const handleSend = (devis: Devis) => {
    setSelectedDevis(devis);
    setSendEmail('');
    setSendMessage(
      "Bonjour, veuillez trouver ci-joint notre devis pour votre mariage. N'hésitez pas à nous contacter pour toute question."
    );
    setIsSendOpen(true);
  };

  const confirmSend = async () => {
    if (!selectedDevis) return;
    try {
      await updateDocument('devis', selectedDevis.id, {
        status: 'sent',
        sent_at: new Date().toISOString(),
        sent_to_email: sendEmail || null,
        sent_message: sendMessage || null,
      });
      toast.success('Devis marqué comme envoyé');
      setIsSendOpen(false);
      await fetchDevis();
    } catch (e) {
      console.error('Error sending devis:', e);
      toast.error("Impossible d'envoyer le devis");
    }
  };

  const handleDownload = (devis: Devis) => {
    if (devis.pdfUrl) {
      // Télécharger le PDF depuis Cloudinary
      const link = document.createElement('a');
      link.href = devis.pdfUrl;
      link.download = `${devis.reference}.pdf`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Téléchargement du PDF lancé');
    } else {
      // Générer un PDF si pas de PDF enregistré
      try {
        const doc = new jsPDF();
        
        // Header
        doc.setFontSize(20);
        doc.text('DEVIS', 105, 20, { align: 'center' });
        
        doc.setFontSize(12);
        doc.text(devis.reference, 105, 30, { align: 'center' });
        
        // Client info
        doc.setFontSize(10);
        doc.text('Client:', 20, 50);
        doc.text(devis.client, 20, 56);
        
        doc.text('Date:', 150, 50);
        doc.text(devis.date, 150, 56);
        
        doc.text('Valide jusqu\'au:', 150, 62);
        doc.text(devis.validUntil, 150, 68);
        
        // Description
        if (devis.description) {
          doc.text('Description:', 20, 80);
          const splitDesc = doc.splitTextToSize(devis.description, 170);
          doc.text(splitDesc, 20, 86);
        }
        
        // Montants
        const yPos = devis.description ? 120 : 90;
        doc.text('Montant HT:', 20, yPos);
        doc.text(`${devis.montantHT.toLocaleString('fr-FR')} €`, 150, yPos);
        
        doc.text(`TVA (${devis.tva}%):`, 20, yPos + 6);
        doc.text(`${(devis.montantTTC - devis.montantHT).toLocaleString('fr-FR')} €`, 150, yPos + 6);
        
        doc.setFontSize(12);
        doc.text('Montant TTC:', 20, yPos + 14);
        doc.text(`${devis.montantTTC.toLocaleString('fr-FR')} €`, 150, yPos + 14);
        
        doc.save(`${devis.reference}.pdf`);
        setIsDownloadSuccess(true);
      } catch (e) {
        toast.error('Erreur lors de la génération du PDF');
      }
    }
  };

  const handleNewDevis = () => {
    setIsNewDevisOpen(true);
  };

  const filteredDevis = devisList.filter(devis =>
    devis.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    devis.client.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, devisList.length]);

  const totalPages = Math.max(1, Math.ceil(filteredDevis.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDevis = filteredDevis.slice(startIndex, startIndex + itemsPerPage);

  const openEdit = (devis: Devis) => {
    setSelectedDevis(devis);
    setEditValidUntil(devis.validUntil || '');
    setEditDescription(devis.description || '');
    setIsEditOpen(true);
  };

  const saveEdit = async () => {
    if (!selectedDevis?.id) return;
    try {
      await updateDocument('devis', selectedDevis.id, {
        valid_until: editValidUntil,
        description: editDescription,
      });
      toast.success('Devis modifié');
      setIsEditOpen(false);
      await fetchDevis();
    } catch (e) {
      console.error('Error updating devis:', e);
      toast.error('Erreur lors de la modification');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-purple mb-1 sm:mb-2">
              Devis
            </h1>
            <p className="text-sm sm:text-base text-brand-gray">
              Créez et gérez vos devis clients
            </p>
          </div>
          <Button 
            className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2 w-full sm:w-auto"
            onClick={handleNewDevis}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nouveau devis</span>
            <span className="sm:hidden">Nouveau</span>
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-gray-50 to-white">
            <p className="text-sm text-brand-gray uppercase tracking-label mb-1">Brouillons</p>
            <p className="text-3xl font-bold text-brand-purple">
              {devisList.filter(d => d.status === 'draft').length}
            </p>
          </Card>
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-blue-50 to-white">
            <p className="text-sm text-brand-gray uppercase tracking-label mb-1">Envoyés</p>
            <p className="text-3xl font-bold text-brand-purple">
              {devisList.filter(d => d.status === 'sent').length}
            </p>
          </Card>
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-green-50 to-white">
            <p className="text-sm text-brand-gray uppercase tracking-label mb-1">Acceptés</p>
            <p className="text-3xl font-bold text-brand-purple">
              {devisList.filter(d => d.status === 'accepted').length}
            </p>
          </Card>
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-brand-beige to-white">
            <p className="text-sm text-brand-gray uppercase tracking-label mb-1">Total</p>
            <p className="text-3xl font-bold text-brand-purple">
              {devisList.reduce((acc, d) => acc + d.montantTTC, 0).toLocaleString()} €
            </p>
          </Card>
        </div>

        <Card className="p-4 shadow-xl border-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-gray" />
            <Input
              placeholder="Rechercher un devis..."
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
        ) : filteredDevis.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="h-16 w-16 text-brand-gray mx-auto mb-4" />
            <h3 className="text-xl font-bold text-brand-purple mb-2">
              {searchTerm ? 'Aucun résultat' : 'Aucun devis'}
            </h3>
            <p className="text-brand-gray mb-6">
              {searchTerm ? 'Essayez avec d\'autres mots-clés' : 'Créez votre premier devis'}
            </p>
            {!searchTerm && (
              <Button onClick={handleNewDevis} className="bg-brand-turquoise hover:bg-brand-turquoise-hover">
                <Plus className="h-4 w-4 mr-2" /> Créer un devis
              </Button>
            )}
          </Card>
        ) : (
          <div className="space-y-4">
            {paginatedDevis.map((devis) => {
            const config = statusConfig[devis.status as keyof typeof statusConfig];
            const StatusIcon = config.icon;

            return (
              <Card key={devis.id} className="p-6 shadow-xl border-0 hover:shadow-2xl transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="h-5 w-5 text-brand-turquoise" />
                      <h3 className="text-lg font-bold text-brand-purple">
                        {devis.reference}
                      </h3>
                    </div>
                    <p className="text-sm text-brand-gray mb-1">{devis.client}</p>
                    <p className="text-xs text-brand-gray">Créé le {devis.date}</p>
                  </div>
                  <Badge className={config.color}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {config.label}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 rounded-lg bg-gray-50">
                  <div>
                    <p className="text-xs text-brand-gray uppercase tracking-label mb-1">Montant HT</p>
                    <p className="text-lg font-bold text-brand-purple">
                      {devis.montantHT.toLocaleString()} €
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-brand-gray uppercase tracking-label mb-1">Montant TTC</p>
                    <p className="text-lg font-bold text-brand-purple">
                      {devis.montantTTC.toLocaleString()} €
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-brand-gray uppercase tracking-label mb-1">Valide jusqu&apos;au</p>
                    <p className="text-sm font-medium text-brand-purple">{devis.validUntil}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2"
                    onClick={() => handleViewDetail(devis)}
                  >
                    <Eye className="h-3 w-3" />
                    Voir
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="border-2 border-brand-turquoise text-brand-gray hover:bg-brand-turquoise hover:text-white gap-2"
                    onClick={() => handleDownload(devis)}
                  >
                    <Download className="h-3 w-3" />
                    PDF
                  </Button>
                  {devis.status === 'draft' && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-2 border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white gap-2"
                      onClick={() => handleSend(devis)}
                    >
                      <Send className="h-3 w-3" />
                      Envoyer
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-2 border-brand-purple text-brand-purple hover:bg-brand-purple hover:text-white gap-2"
                    onClick={() => openEdit(devis)}
                  >
                    <Edit className="h-3 w-3" />
                    Modifier
                  </Button>

                  {devis.status === 'accepted' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-2 border-green-600 text-green-700 hover:bg-green-600 hover:text-white gap-2"
                      onClick={() => void openBonCommande(devis)}
                    >
                      <FileText className="h-3 w-3" />
                      Bon de commande
                    </Button>
                  ) : null}
                </div>
              </Card>
              );
            })}
          </div>
        )}

        {filteredDevis.length > itemsPerPage ? (
          <Card className="p-4 shadow-xl border-0">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Précédent
              </Button>
              <span className="text-sm text-brand-gray">
                Page {currentPage} sur {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="gap-2"
              >
                Suivant
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ) : null}
      </div>

      {/* Modal Détail Devis */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-brand-purple flex items-center gap-2">
              <FileText className="h-5 w-5 text-brand-turquoise" />
              {selectedDevis?.reference}
            </DialogTitle>
            <DialogDescription>
              {selectedDevis?.client}
            </DialogDescription>
          </DialogHeader>
          {selectedDevis && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <Badge className={statusConfig[selectedDevis.status as keyof typeof statusConfig]?.color}>
                  {statusConfig[selectedDevis.status as keyof typeof statusConfig]?.label}
                </Badge>
                <p className="text-xs text-brand-gray">Créé le {selectedDevis.date}</p>
              </div>

              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-brand-gray">Montant HT</p>
                  <p className="text-xl font-bold text-brand-purple">{selectedDevis.montantHT.toLocaleString()} €</p>
                </div>
                <div>
                  <p className="text-xs text-brand-gray">Montant TTC</p>
                  <p className="text-xl font-bold text-brand-turquoise">{selectedDevis.montantTTC.toLocaleString()} €</p>
                </div>
                <div>
                  <p className="text-xs text-brand-gray">Valide jusqu&apos;au</p>
                  <p className="text-lg font-medium text-brand-purple">{selectedDevis.validUntil}</p>
                </div>
              </div>

              {selectedDevis.description && (
                <div className="p-4 bg-brand-beige/50 rounded-lg">
                  <h4 className="font-medium text-brand-purple mb-2">Description</h4>
                  <p className="text-sm text-brand-gray whitespace-pre-wrap">{selectedDevis.description}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="destructive" 
              onClick={() => selectedDevis && handleDelete(selectedDevis.id)}
              className="w-full sm:w-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer
            </Button>
            <div className="flex-1" />
            <Button variant="outline" onClick={() => setIsDetailOpen(false)} className="w-full sm:w-auto">
              Fermer
            </Button>
            <Button 
              variant="outline" 
              className="gap-2 w-full sm:w-auto"
              onClick={() => {
                if (selectedDevis) handleDownload(selectedDevis);
              }}
            >
              <Download className="h-4 w-4" />
              Télécharger PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-brand-purple">Modifier le devis</DialogTitle>
            <DialogDescription>{selectedDevis?.reference}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Valide jusqu&apos;au</Label>
              <Input value={editValidUntil} onChange={(e) => setEditValidUntil(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="mt-1"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Annuler
            </Button>
            <Button className="bg-brand-turquoise hover:bg-brand-turquoise-hover" onClick={() => void saveEdit()}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Nouveau Devis */}
      <NewDevisModal 
        isOpen={isNewDevisOpen} 
        onClose={() => setIsNewDevisOpen(false)}
        onDevisCreated={fetchDevis}
      />

      {/* Modal Envoyer Devis */}
      <Dialog open={isSendOpen} onOpenChange={setIsSendOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-brand-purple">Envoyer le devis</DialogTitle>
            <DialogDescription>
              {selectedDevis?.reference} - {selectedDevis?.client}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Email du destinataire</Label>
              <Input
                type="email"
                placeholder="client@exemple.com"
                className="mt-1"
                value={sendEmail}
                onChange={(e) => setSendEmail(e.target.value)}
              />
            </div>
            <div>
              <Label>Message personnalisé (optionnel)</Label>
              <Textarea 
                placeholder="Ajoutez un message personnalisé..." 
                className="mt-1" 
                rows={3}
                value={sendMessage}
                onChange={(e) => setSendMessage(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSendOpen(false)}>
              Annuler
            </Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 gap-2"
              onClick={() => void confirmSend()}
            >
              <Send className="h-4 w-4" />
              Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Téléchargement Succès */}
      <Dialog open={isDownloadSuccess} onOpenChange={setIsDownloadSuccess}>
        <DialogContent className="sm:max-w-md text-center">
          <div className="flex flex-col items-center py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <DialogTitle className="text-brand-purple text-xl">Téléchargement lancé !</DialogTitle>
            <DialogDescription className="mt-2">
              Le devis {selectedDevis?.reference} est en cours de téléchargement.
            </DialogDescription>
          </div>
          <DialogFooter className="justify-center">
            <Button 
              className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
              onClick={() => setIsDownloadSuccess(false)}
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBonCommandeOpen} onOpenChange={setIsBonCommandeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-brand-purple">Créer un bon de commande</DialogTitle>
            <DialogDescription>{selectedDevis?.reference} - {selectedDevis?.client}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Prestataire *</Label>
              <select
                className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                value={bonCommandeVendorId}
                onChange={(e) => setBonCommandeVendorId(e.target.value)}
              >
                <option value="">Sélectionner...</option>
                {bonCommandeVendors.map((v: any) => (
                  <option key={v.id} value={v.id}>
                    {v.name || v.vendorName || v.title || v.id}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 rounded-lg bg-gray-50 text-xs text-brand-gray">
              Le bon de commande contiendra les intitulés exacts des prestations du devis afin de faciliter la conformité de la facture prestataire.
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBonCommandeOpen(false)} disabled={bonCommandeLoading}>
              Annuler
            </Button>
            <Button
              className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
              onClick={() => void confirmBonCommande()}
              disabled={bonCommandeLoading || !bonCommandeVendorId}
            >
              {bonCommandeLoading ? 'Création...' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  );
}
