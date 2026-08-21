'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { useAuth } from '@/contexts/AuthContext';
import { addDocument, getDocuments, updateDocument, deleteDocument } from '@/lib/db';
import { uploadFile } from '@/lib/storage';
import { Plus, Eye, Trash2, Loader2, FileText, MoreVertical, Pencil, CheckCircle2, XCircle, Clock, Upload } from 'lucide-react';
import { toast } from 'sonner';

type ProDocType = 'devis' | 'facture';
type ProDocStatus = 'recu' | 'en_attente' | 'paye';

interface ProDocument {
  id: string;
  client_id: string;
  planner_id: string;
  type: ProDocType;
  vendor_id?: string;
  vendor_name?: string;
  vendor_logo_url?: string;
  pro_name: string;
  reference?: string;
  amount: number;
  date: string;
  status: ProDocStatus;
  uploaded_by?: 'planner' | 'vendor';
  vendor_status?: 'submitted' | 'validated' | 'rejected';
  rejection_reason?: string;
  vendor_uid?: string;
  devis_file_url?: string;
  facture_file_url?: string;
  file_url?: string;
  notes?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

interface Vendor {
  id: string;
  name: string;
  category?: string;
  logoUrl?: string | null;
}

interface ClientFacturationProTabProps {
  clientId: string;
}

const statusLabels: Record<ProDocStatus, string> = {
  recu: 'Reçu',
  en_attente: 'En attente',
  paye: 'Payé',
};

const statusColors: Record<ProDocStatus, string> = {
  recu: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  en_attente: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
  paye: 'bg-green-100 text-green-700 hover:bg-green-100',
};

export function ClientFacturationProTab({ clientId }: ClientFacturationProTabProps) {
  const { user } = useAuth();
  const [docs, setDocs] = useState<ProDocument[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingDoc, setEditingDoc] = useState<ProDocument | null>(null);

  const [devisFile, setDevisFile] = useState<File | null>(null);
  const [factureFile, setFactureFile] = useState<File | null>(null);

  // Rejection modal state
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectDoc, setRejectDoc] = useState<ProDocument | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const [form, setForm] = useState<{
    type: ProDocType;
    vendor_id: string;
    pro_name: string;
    reference: string;
    amount: string;
    date: string;
    status: ProDocStatus;
    notes: string;
  }>({
    type: 'devis',
    vendor_id: '',
    pro_name: '',
    reference: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    status: 'recu',
    notes: '',
  });

  useEffect(() => {
    async function fetchData() {
      if (!user?.uid) return;
      try {
        setLoading(true);
        const [items, vendorItems] = await Promise.all([
          getDocuments('pro_documents', [{ field: 'client_id', operator: '==', value: clientId }]),
          getDocuments('vendors', [{ field: 'planner_id', operator: '==', value: user.uid }]),
        ]);
        const sorted = (items as any[]).sort(
          (a, b) => String(b?.date || '').localeCompare(String(a?.date || ''))
        );
        const mappedVendors = (vendorItems as any[]).map((v: any) => ({
          id: v.id,
          name: v.name || 'Prestataire',
          category: v.category || '',
          logoUrl: v.logo || v.logo_url || v.logoUrl || v.logoURL || null,
        }));
        setDocs(sorted as ProDocument[]);
        setVendors(mappedVendors);
      } catch (e) {
        console.error('Error fetching pro documents/vendors:', e);
        toast.error('Erreur lors du chargement');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [clientId, user?.uid]);

  const resetForm = () => {
    setForm({
      type: 'devis',
      vendor_id: '',
      pro_name: '',
      reference: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      status: 'recu',
      notes: '',
    });
    setDevisFile(null);
    setFactureFile(null);
    setEditingDoc(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setOpen(true);
  };

  const getFileUrls = (d: ProDocument) => ({
    devis: d.devis_file_url || (d.type === 'devis' ? d.file_url : ''),
    facture: d.facture_file_url || (d.type === 'facture' ? d.file_url : ''),
  });

  const handleEdit = (d: ProDocument) => {
    const files = getFileUrls(d);
    setEditingDoc({ ...d, devis_file_url: files.devis, facture_file_url: files.facture });
    setForm({
      type: d.type,
      vendor_id: d.vendor_id || '',
      pro_name: d.pro_name || '',
      reference: d.reference || '',
      amount: String(d.amount || 0),
      date: d.date || new Date().toISOString().split('T')[0],
      status: d.status || 'recu',
      notes: d.notes || d.description || '',
    });
    setDevisFile(null);
    setFactureFile(null);
    setOpen(true);
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Supprimer ce document ?')) return;
    try {
      await deleteDocument('pro_documents', docId);
      setDocs((prev) => prev.filter((d) => d.id !== docId));
      toast.success('Document supprimé');
    } catch (e) {
      console.error('Error deleting pro document:', e);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleStatusChange = async (docId: string, newStatus: ProDocStatus) => {
    setDocs((prev) => prev.map((d) => (d.id === docId ? { ...d, status: newStatus } : d)));
    try {
      await updateDocument('pro_documents', docId, { status: newStatus, updated_at: new Date().toISOString() });
      toast.success('Statut mis à jour');
    } catch (e) {
      console.error('Error updating status:', e);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleValidateVendorDoc = async (docId: string) => {
    const doc = docs.find((d) => d.id === docId);
    setDocs((prev) => prev.map((d) => (d.id === docId ? { ...d, vendor_status: 'validated' } : d)));
    try {
      await updateDocument('pro_documents', docId, {
        vendor_status: 'validated',
        rejection_reason: '',
        updated_at: new Date().toISOString(),
      });
      toast.success('Document validé');

      // Notify the vendor
      if (doc?.vendor_uid) {
        try {
          await addDocument('notifications', {
            recipient_id: doc.vendor_uid,
            type: 'vendor_doc',
            title: 'Document validé',
            message: `Votre ${doc.type === 'devis' ? 'devis' : 'facture'}${doc.reference ? ` (${doc.reference})` : ''} a été validé par le planner.`,
            link: '/espace-pro/mariages',
            read: false,
            created_at: new Date(),
          });
        } catch { /* non-blocking */ }

        try {
          const { sendEmailToUid } = await import('@/lib/email');
          await sendEmailToUid({
            recipientUid: doc.vendor_uid,
            subject: 'Document validé - Le Oui Parfait',
            text: `Bonjour,\n\nVotre ${doc.type === 'devis' ? 'devis' : 'facture'}${doc.reference ? ` (${doc.reference})` : ''} a été validé par votre wedding planner.\n\nRetrouvez-le sur votre espace pro.\n\nLe Oui Parfait`,
          });
        } catch (e) {
          console.warn('Unable to send vendor validation email:', e);
        }
      }
    } catch (e) {
      console.error('Error validating vendor doc:', e);
      toast.error('Erreur lors de la validation');
    }
  };

  const handleRejectVendorDoc = (docId: string) => {
    const doc = docs.find((d) => d.id === docId) || null;
    setRejectDoc(doc);
    setRejectReason('');
    setRejectOpen(true);
  };

  const confirmReject = async () => {
    if (!rejectDoc) return;
    if (!rejectReason.trim()) {
      toast.error('Veuillez renseigner le motif du rejet');
      return;
    }
    const docId = rejectDoc.id;
    const reason = rejectReason.trim();
    setRejecting(true);
    setDocs((prev) => prev.map((d) => (d.id === docId ? { ...d, vendor_status: 'rejected', rejection_reason: reason } : d)));
    try {
      await updateDocument('pro_documents', docId, {
        vendor_status: 'rejected',
        rejection_reason: reason,
        updated_at: new Date().toISOString(),
      });
      toast.success('Document rejeté');

      // Notify the vendor
      if (rejectDoc.vendor_uid) {
        try {
          await addDocument('notifications', {
            recipient_id: rejectDoc.vendor_uid,
            type: 'vendor_doc',
            title: 'Document rejeté',
            message: `Votre ${rejectDoc.type === 'devis' ? 'devis' : 'facture'}${rejectDoc.reference ? ` (${rejectDoc.reference})` : ''} a été rejeté. Motif : ${reason}`,
            link: '/espace-pro/mariages',
            read: false,
            created_at: new Date(),
          });
        } catch { /* non-blocking */ }

        try {
          const { sendEmailToUid } = await import('@/lib/email');
          await sendEmailToUid({
            recipientUid: rejectDoc.vendor_uid,
            subject: 'Document à corriger - Le Oui Parfait',
            text: `Bonjour,\n\nVotre ${rejectDoc.type === 'devis' ? 'devis' : 'facture'}${rejectDoc.reference ? ` (${rejectDoc.reference})` : ''} a été rejeté par votre wedding planner.\n\nMotif : ${reason}\n\nVeuillez corriger et resoumettre le document depuis votre espace pro.\n\nLe Oui Parfait`,
          });
        } catch (e) {
          console.warn('Unable to send vendor rejection email:', e);
        }
      }

      setRejectOpen(false);
      setRejectDoc(null);
      setRejectReason('');
    } catch (e) {
      console.error('Error rejecting vendor doc:', e);
      toast.error('Erreur lors du rejet');
    } finally {
      setRejecting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    if (!form.vendor_id || !form.amount || !form.date) {
      toast.error('Veuillez sélectionner un prestataire et remplir les champs obligatoires');
      return;
    }

    setIsSaving(true);
    try {
      const upload = async (file: File | null, existing?: string) => {
        if (!file) return existing || '';
        toast.info('Upload du fichier...');
        return (await uploadFile(file, 'pro_documents')) || '';
      };

      const devisUrl = await upload(devisFile, editingDoc?.devis_file_url);
      const factureUrl = await upload(factureFile, editingDoc?.facture_file_url);

      const vendor = vendors.find((v) => v.id === form.vendor_id);
      const data = {
        client_id: clientId,
        planner_id: user.uid,
        type: form.type,
        vendor_id: form.vendor_id,
        vendor_name: vendor?.name || form.pro_name || 'Prestataire',
        vendor_logo_url: vendor?.logoUrl || null,
        pro_name: vendor?.name || form.pro_name || 'Prestataire',
        reference: form.reference,
        amount: Number(form.amount) || 0,
        date: form.date,
        status: form.status,
        notes: form.notes,
        devis_file_url: devisUrl,
        facture_file_url: factureUrl,
        updated_at: new Date().toISOString(),
      };

      if (editingDoc) {
        await updateDocument('pro_documents', editingDoc.id, data);
        setDocs((prev) =>
          prev.map((d) =>
            d.id === editingDoc.id
              ? ({ id: editingDoc.id, ...data, created_at: editingDoc.created_at } as ProDocument)
              : d
          )
        );
        toast.success('Document mis à jour');
      } else {
        const doc = await addDocument('pro_documents', { ...data, created_at: new Date().toISOString() });
        setDocs((prev) => [{ id: doc.id, ...data, created_at: new Date().toISOString() } as ProDocument, ...prev]);
        toast.success('Document ajouté');
      }
      setOpen(false);
      resetForm();
    } catch (err: any) {
      console.error('Error saving pro document:', err);
      toast.error(err?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-10 w-10 animate-spin text-brand-turquoise" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[18px] font-baskerville text-[#4B4456]">Devis & Factures prestataires</h3>
          <p className="text-[12px] text-[#9C97A3] mt-0.5">
            {docs.length} document{docs.length > 1 ? 's' : ''} · {docs.filter((d) => d.uploaded_by === 'vendor' && d.vendor_status === 'submitted').length} à valider
          </p>
        </div>
        <Button className="bg-[#88b7b5] hover:bg-[#7aa9a7] gap-2 rounded-full" onClick={handleOpenAdd}>
          <Plus className="h-4 w-4" />
          Ajouter
        </Button>
      </div>

      {docs.length === 0 ? (
        <div className="text-center py-16 bg-[#FAF9F7] rounded-[18px] border border-[rgba(75,68,86,0.06)]">
          <div className="w-16 h-16 rounded-full bg-white border border-[rgba(75,68,86,0.06)] flex items-center justify-center mx-auto mb-4">
            <FileText className="h-7 w-7 text-[#9C97A3]" />
          </div>
          <h3 className="text-[16px] font-semibold text-[#4B4456] mb-2">Aucun document pro</h3>
          <p className="text-[13px] text-[#9C97A3] mb-5 max-w-sm mx-auto">
            Ajoutez les devis et factures reçus des prestataires, ou attendez qu'ils les soumettent depuis leur espace pro.
          </p>
          <Button className="bg-[#88b7b5] hover:bg-[#7aa9a7] gap-2 rounded-full" onClick={handleOpenAdd}>
            <Plus className="h-4 w-4" />
            Ajouter un document
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-[rgba(75,68,86,0.06)]">
                <TableHead className="text-[11px] font-semibold text-[#9C97A3] uppercase tracking-wide bg-[#FAF9F7]">Prestataire</TableHead>
                <TableHead className="text-[11px] font-semibold text-[#9C97A3] uppercase tracking-wide bg-[#FAF9F7]">Type</TableHead>
                <TableHead className="text-[11px] font-semibold text-[#9C97A3] uppercase tracking-wide bg-[#FAF9F7]">Référence</TableHead>
                <TableHead className="text-[11px] font-semibold text-[#9C97A3] uppercase tracking-wide bg-[#FAF9F7]">Montant</TableHead>
                <TableHead className="text-[11px] font-semibold text-[#9C97A3] uppercase tracking-wide bg-[#FAF9F7]">Date</TableHead>
                <TableHead className="text-[11px] font-semibold text-[#9C97A3] uppercase tracking-wide bg-[#FAF9F7]">Paiement</TableHead>
                <TableHead className="text-[11px] font-semibold text-[#9C97A3] uppercase tracking-wide bg-[#FAF9F7]">Validation pro</TableHead>
                <TableHead className="text-[11px] font-semibold text-[#9C97A3] uppercase tracking-wide bg-[#FAF9F7] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((d) => {
                const docStatus = d.status || 'recu';
                const files = getFileUrls(d);
                const isVendorDoc = d.uploaded_by === 'vendor';
                return (
                  <TableRow key={d.id} className="border-[rgba(75,68,86,0.04)] hover:bg-[rgba(136,183,181,0.03)]">
                    {/* Prestataire */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-[#FAF9F7] overflow-hidden flex-shrink-0 flex items-center justify-center ring-1 ring-[rgba(75,68,86,0.06)]">
                          {d.vendor_logo_url ? (
                            <img src={d.vendor_logo_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-[#9C97A3] text-[11px] font-semibold">
                              {(d.vendor_name || d.pro_name || '?').charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold text-[#4B4456] truncate">{d.vendor_name || d.pro_name || '—'}</div>
                          {isVendorDoc && (
                            <span className="text-[10px] text-[#88b7b5] font-medium">Soumis par le pro</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    {/* Type */}
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-full ${
                        d.type === 'devis'
                          ? 'text-[#88b7b5] bg-[rgba(136,183,181,0.1)]'
                          : 'text-[#C9A96E] bg-[rgba(201,169,110,0.1)]'
                      }`}>
                        {d.type === 'devis' ? 'Devis' : 'Facture'}
                      </span>
                    </TableCell>
                    {/* Référence */}
                    <TableCell className="text-[12.5px] text-[#4B4456]">{d.reference || '—'}</TableCell>
                    {/* Montant */}
                    <TableCell className="text-[13px] font-bold text-[#4B4456]">{d.amount.toLocaleString('fr-FR')} €</TableCell>
                    {/* Date */}
                    <TableCell className="text-[12px] text-[#9C97A3]">{d.date ? d.date.split('-').reverse().join('/') : '—'}</TableCell>
                    {/* Statut paiement */}
                    <TableCell>
                      <Select value={docStatus} onValueChange={(v) => handleStatusChange(d.id, v as ProDocStatus)}>
                        <SelectTrigger className="w-[110px] h-8 border-[rgba(75,68,86,0.1)] bg-[#FAF9F7] text-[12px] rounded-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(['recu', 'en_attente', 'paye'] as ProDocStatus[]).map((s) => (
                            <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    {/* Validation pro */}
                    <TableCell>
                      {isVendorDoc ? (
                        <div className="flex items-center gap-2">
                          {d.vendor_status === 'validated' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#88b7b5] bg-[rgba(136,183,181,0.12)] px-2.5 py-1.5 rounded-full">
                              <CheckCircle2 className="h-3 w-3" />
                              Validé
                            </span>
                          ) : d.vendor_status === 'rejected' ? (
                            <div className="flex flex-col gap-1">
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#B9847F] bg-[rgba(185,132,127,0.12)] px-2.5 py-1.5 rounded-full w-fit">
                                <XCircle className="h-3 w-3" />
                                Rejeté
                              </span>
                              {d.rejection_reason && (
                                <span className="text-[10px] text-[#B9847F] truncate max-w-[140px]" title={d.rejection_reason}>
                                  {d.rejection_reason}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#C9A96E] bg-[rgba(201,169,110,0.12)] px-2.5 py-1.5 rounded-full">
                                <Clock className="h-3 w-3" />
                                Soumis
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-[#88b7b5] hover:bg-[rgba(136,183,181,0.1)] rounded-full"
                                title="Valider"
                                onClick={() => handleValidateVendorDoc(d.id)}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-[#B9847F] hover:bg-[rgba(185,132,127,0.1)] rounded-full"
                                title="Rejeter"
                                onClick={() => handleRejectVendorDoc(d.id)}
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-[#9C97A3]">—</span>
                      )}
                    </TableCell>
                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {files.devis && (
                              <DropdownMenuItem onClick={() => window.open(files.devis, '_blank')}>
                                <Eye className="h-4 w-4 mr-2" />
                                Voir le devis
                              </DropdownMenuItem>
                            )}
                            {files.facture && (
                              <DropdownMenuItem onClick={() => window.open(files.facture, '_blank')}>
                                <Eye className="h-4 w-4 mr-2" />
                                Voir la facture
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleEdit(d)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(d.id)} className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[560px] w-[95vw] max-h-[90vh] overflow-y-auto rounded-[20px]">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-[18px] font-baskerville text-[#4B4456]">
              {editingDoc ? 'Modifier le document' : 'Nouveau document pro'}
            </DialogTitle>
            <DialogDescription className="text-[13px] text-[#9C97A3]">
              Associez un prestataire et les fichiers devis/facture.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 py-2">
            {/* Prestataire + Type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[12px] font-semibold text-[#4B4456]">Prestataire *</Label>
                <Select value={form.vendor_id} onValueChange={(v) => setForm({ ...form, vendor_id: v })}>
                  <SelectTrigger className="mt-1.5 h-10 rounded-xl border-[rgba(75,68,86,0.1)]">
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((v) => (
                      <SelectItem key={v.id} value={v.id} textValue={v.name}>
                        <div className="flex items-center gap-2">
                          {v.logoUrl ? (
                            <img src={v.logoUrl} alt="" className="h-5 w-5 rounded-full object-cover" />
                          ) : (
                            <div className="h-5 w-5 rounded-full bg-[#FAF9F7] flex items-center justify-center text-[10px] font-semibold text-[#9C97A3]">{v.name.charAt(0).toUpperCase()}</div>
                          )}
                          {v.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[12px] font-semibold text-[#4B4456]">Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as ProDocType })}>
                  <SelectTrigger className="mt-1.5 h-10 rounded-xl border-[rgba(75,68,86,0.1)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="devis">Devis</SelectItem>
                    <SelectItem value="facture">Facture</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Fichiers */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[12px] font-semibold text-[#4B4456]">Fichier devis</Label>
                <div className="mt-1.5 relative">
                  <Input
                    className="h-10 rounded-xl border-[rgba(75,68,86,0.1)] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#FAF9F7] file:text-[11px] file:font-semibold file:text-[#4B4456] hover:file:bg-[rgba(75,68,86,0.05)]"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    onChange={(e) => setDevisFile(e.target.files?.[0] || null)}
                  />
                </div>
                {editingDoc?.devis_file_url && (
                  <Button type="button" variant="link" className="h-auto p-0 mt-1 text-[11px] text-[#88b7b5]" onClick={() => window.open(editingDoc.devis_file_url, '_blank')}>
                    Voir le devis existant
                  </Button>
                )}
              </div>
              <div>
                <Label className="text-[12px] font-semibold text-[#4B4456]">Fichier facture</Label>
                <div className="mt-1.5 relative">
                  <Input
                    className="h-10 rounded-xl border-[rgba(75,68,86,0.1)] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#FAF9F7] file:text-[11px] file:font-semibold file:text-[#4B4456] hover:file:bg-[rgba(75,68,86,0.05)]"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    onChange={(e) => setFactureFile(e.target.files?.[0] || null)}
                  />
                </div>
                {editingDoc?.facture_file_url && (
                  <Button type="button" variant="link" className="h-auto p-0 mt-1 text-[11px] text-[#88b7b5]" onClick={() => window.open(editingDoc.facture_file_url, '_blank')}>
                    Voir la facture existante
                  </Button>
                )}
              </div>
            </div>

            {/* Référence */}
            <div>
              <Label className="text-[12px] font-semibold text-[#4B4456]">Référence</Label>
              <Input
                className="mt-1.5 h-10 rounded-xl border-[rgba(75,68,86,0.1)]"
                value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
                placeholder="Ex: DEV-2026-001"
              />
            </div>

            {/* Montant + Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[12px] font-semibold text-[#4B4456]">Montant (€) *</Label>
                <Input
                  className="mt-1.5 h-10 rounded-xl border-[rgba(75,68,86,0.1)]"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label className="text-[12px] font-semibold text-[#4B4456]">Date *</Label>
                <Input
                  className="mt-1.5 h-10 rounded-xl border-[rgba(75,68,86,0.1)]"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Statut */}
            <div>
              <Label className="text-[12px] font-semibold text-[#4B4456]">Statut paiement</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as ProDocStatus })}>
                <SelectTrigger className="mt-1.5 h-10 rounded-xl border-[rgba(75,68,86,0.1)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recu">Reçu</SelectItem>
                  <SelectItem value="en_attente">En attente</SelectItem>
                  <SelectItem value="paye">Payé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div>
              <Label className="text-[12px] font-semibold text-[#4B4456]">Description / Notes</Label>
              <Textarea
                className="mt-1.5 rounded-xl border-[rgba(75,68,86,0.1)] resize-none"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Détails, conditions, etc."
                rows={3}
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSaving} className="rounded-full">
                Annuler
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-[#88b7b5] hover:bg-[#7aa9a7] gap-2 rounded-full">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingDoc ? 'Enregistrer' : 'Ajouter'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rejection modal */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-[480px] w-[95vw] rounded-[20px]">
          <DialogHeader className="pb-2">
            <div className="w-12 h-12 rounded-full bg-[rgba(185,132,127,0.12)] flex items-center justify-center mb-3">
              <XCircle className="h-6 w-6 text-[#B9847F]" />
            </div>
            <DialogTitle className="text-[18px] font-baskerville text-[#4B4456]">
              Rejeter le document
            </DialogTitle>
            <DialogDescription className="text-[13px] text-[#9C97A3]">
              {rejectDoc && (
                <>
                  {rejectDoc.type === 'devis' ? 'Devis' : 'Facture'}
                  {rejectDoc.reference ? ` ${rejectDoc.reference}` : ''}
                  {' de '}{rejectDoc.vendor_name || rejectDoc.pro_name}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-[12px] font-semibold text-[#4B4456]">
                Motif du rejet <span className="text-[#B9847F]">*</span>
              </Label>
              <Textarea
                className="mt-1.5 rounded-xl border-[rgba(75,68,86,0.1)] resize-none"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Expliquez au prestataire ce qui doit être corrigé..."
                rows={4}
                autoFocus
              />
              <p className="text-[11px] text-[#9C97A3] mt-1.5">
                Le prestataire recevra ce motif par email et notification.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setRejectOpen(false); setRejectDoc(null); setRejectReason(''); }}
              disabled={rejecting}
              className="rounded-full"
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={confirmReject}
              disabled={rejecting || !rejectReason.trim()}
              className="bg-[#B9847F] hover:bg-[#a77570] gap-2 rounded-full"
            >
              {rejecting && <Loader2 className="h-4 w-4 animate-spin" />}
              <XCircle className="h-4 w-4" />
              Rejeter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
