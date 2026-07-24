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
import { Plus, Eye, Trash2, Loader2, FileText, MoreVertical, Pencil } from 'lucide-react';
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-brand-purple font-baskerville">Devis & Factures prestataires</h3>
        <Button className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2" onClick={handleOpenAdd}>
          <Plus className="h-4 w-4" />
          Ajouter
        </Button>
      </div>

      {docs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FileText className="h-12 w-12 text-brand-gray mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-brand-purple mb-2">Aucun document pro</h3>
          <p className="text-sm text-brand-gray mb-4">Ajoutez les devis et factures reçus des prestataires.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prestataire</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Référence</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((d) => {
                const docStatus = d.status || 'recu';
                const files = getFileUrls(d);
                return (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {d.vendor_logo_url ? (
                            <img src={d.vendor_logo_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-brand-gray text-xs font-medium">
                              {(d.vendor_name || d.pro_name || '?').charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-brand-purple">{d.vendor_name || d.pro_name || '—'}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={d.type === 'devis' ? 'outline' : 'default'}>{d.type === 'devis' ? 'Devis' : 'Facture'}</Badge>
                    </TableCell>
                    <TableCell>{d.reference || '—'}</TableCell>
                    <TableCell>{d.amount.toLocaleString('fr-FR')} €</TableCell>
                    <TableCell>{d.date ? d.date.split('-').reverse().join('/') : '—'}</TableCell>
                    <TableCell>
                      <Select value={docStatus} onValueChange={(v) => handleStatusChange(d.id, v as ProDocStatus)}>
                        <SelectTrigger className="w-32 h-8 border-0 bg-transparent p-0">
                          <Badge className={statusColors[docStatus as ProDocStatus]}>{statusLabels[docStatus as ProDocStatus]}</Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {(['recu', 'en_attente', 'paye'] as ProDocStatus[]).map((s) => (
                            <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
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
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-brand-purple">{editingDoc ? 'Modifier un document pro' : 'Ajouter un document pro'}</DialogTitle>
            <DialogDescription>Associez un prestataire, les fichiers devis et facture, et les détails.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div>
              <Label>Prestataire *</Label>
              <Select value={form.vendor_id} onValueChange={(v) => setForm({ ...form, vendor_id: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sélectionner un prestataire" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id} textValue={v.name}>
                      <div className="flex items-center gap-2">
                        {v.logoUrl ? (
                          <img src={v.logoUrl} alt="" className="h-5 w-5 rounded-full object-cover" />
                        ) : (
                          <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px]">{v.name.charAt(0).toUpperCase()}</div>
                        )}
                        {v.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as ProDocType })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="devis">Devis</SelectItem>
                  <SelectItem value="facture">Facture</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fichier devis</Label>
                <Input className="mt-1" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={(e) => setDevisFile(e.target.files?.[0] || null)} />
                {editingDoc?.devis_file_url && (
                  <div className="mt-1 text-xs">
                    <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={() => window.open(editingDoc.devis_file_url, '_blank')}>
                      Voir le devis existant
                    </Button>
                  </div>
                )}
              </div>
              <div>
                <Label>Fichier facture</Label>
                <Input className="mt-1" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={(e) => setFactureFile(e.target.files?.[0] || null)} />
                {editingDoc?.facture_file_url && (
                  <div className="mt-1 text-xs">
                    <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={() => window.open(editingDoc.facture_file_url, '_blank')}>
                      Voir la facture existante
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label>Référence</Label>
              <Input className="mt-1" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Ex: DEV-2026-001" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Montant (€) *</Label>
                <Input className="mt-1" type="number" inputMode="decimal" min={0} step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
              </div>
              <div>
                <Label>Date *</Label>
                <Input className="mt-1" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
              </div>
            </div>

            <div>
              <Label>Statut</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as ProDocStatus })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recu">Reçu</SelectItem>
                  <SelectItem value="en_attente">En attente</SelectItem>
                  <SelectItem value="paye">Payé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Description / Notes</Label>
              <Textarea className="mt-1" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Détails, conditions, etc." rows={3} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>Annuler</Button>
              <Button type="submit" disabled={isSaving} className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingDoc ? 'Enregistrer' : 'Ajouter'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
