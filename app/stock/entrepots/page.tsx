'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Building2, Plus, Loader2, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { addDocument, deleteDocument, getDocuments, updateDocument } from '@/lib/db';
import { toast } from 'sonner';

interface Warehouse {
  id: string;
  name: string;
  createdAt?: any;
}

export default function WarehousesPage() {
  const { user } = useAuth();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [nameDraft, setNameDraft] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);

  const fetchWarehouses = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getDocuments('warehouses', [
        { field: 'owner_id', operator: '==', value: user.uid },
      ]);
      const mapped = (data as any[]).map((w) => ({
        id: w.id,
        name: w.name || '',
        createdAt: w.created_at || w.createdAt || null,
      }));

      mapped.sort((a, b) => {
        const da = a.createdAt?.toDate ? a.createdAt.toDate() : (a.createdAt ? new Date(a.createdAt) : new Date(0));
        const db = b.createdAt?.toDate ? b.createdAt.toDate() : (b.createdAt ? new Date(b.createdAt) : new Date(0));
        return db.getTime() - da.getTime();
      });

      setWarehouses(mapped);
    } catch (e) {
      console.error('Error fetching warehouses:', e);
      toast.error('Erreur lors du chargement des entrepôts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, [user]);

  const canSubmit = useMemo(() => nameDraft.trim().length > 0, [nameDraft]);

  const openCreate = () => {
    setSelectedWarehouse(null);
    setNameDraft('');
    setIsCreateOpen(true);
  };

  const openEdit = (w: Warehouse) => {
    setSelectedWarehouse(w);
    setNameDraft(w.name);
    setIsEditOpen(true);
  };

  const handleCreate = async () => {
    if (!user) return;
    if (!canSubmit) {
      toast.error('Veuillez saisir un nom');
      return;
    }

    setSaving(true);
    try {
      await addDocument('warehouses', {
        owner_id: user.uid,
        name: nameDraft.trim(),
        created_at: new Date(),
      });
      toast.success('Entrepôt ajouté');
      setIsCreateOpen(false);
      setNameDraft('');
      fetchWarehouses();
    } catch (e) {
      console.error('Error creating warehouse:', e);
      toast.error('Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedWarehouse) return;
    if (!canSubmit) {
      toast.error('Veuillez saisir un nom');
      return;
    }

    setSaving(true);
    try {
      await updateDocument('warehouses', selectedWarehouse.id, {
        name: nameDraft.trim(),
        updated_at: new Date(),
      });
      toast.success('Entrepôt modifié');
      setIsEditOpen(false);
      setSelectedWarehouse(null);
      setNameDraft('');
      fetchWarehouses();
    } catch (e) {
      console.error('Error updating warehouse:', e);
      toast.error('Erreur lors de la modification');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (w: Warehouse) => {
    if (!confirm(`Supprimer l'entrepôt "${w.name}" ?`)) return;

    try {
      await deleteDocument('warehouses', w.id);
      toast.success('Entrepôt supprimé');
      fetchWarehouses();
    } catch (e) {
      console.error('Error deleting warehouse:', e);
      toast.error('Erreur lors de la suppression');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-purple mb-2">Entrepôts</h1>
            <p className="text-sm sm:text-base text-brand-gray">Gérez vos emplacements de stockage</p>
          </div>
          <Button className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2 w-full sm:w-auto" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nouvel entrepôt
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-brand-turquoise" />
          </div>
        ) : warehouses.length === 0 ? (
          <Card className="p-12 text-center">
            <Building2 className="h-16 w-16 text-brand-gray mx-auto mb-4" />
            <h3 className="text-xl font-bold text-brand-purple mb-2">Aucun entrepôt</h3>
            <p className="text-brand-gray mb-6">Ajoutez votre premier entrepôt pour structurer vos emplacements</p>
            <Button onClick={openCreate} className="bg-brand-turquoise hover:bg-brand-turquoise-hover">
              <Plus className="h-4 w-4 mr-2" /> Ajouter un entrepôt
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {warehouses.map((w) => (
              <Card key={w.id} className="p-6 shadow-xl border-0 hover:shadow-2xl transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="h-5 w-5 text-brand-turquoise" />
                      <h3 className="text-lg font-bold text-brand-purple truncate" title={w.name}>
                        {w.name}
                      </h3>
                    </div>
                    <p className="text-xs text-brand-gray">Collection: warehouses</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button size="sm" variant="outline" className="gap-2" onClick={() => openEdit(w)}>
                      <Pencil className="h-4 w-4" />
                      Modifier
                    </Button>
                    <Button size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-500 hover:text-white" onClick={() => void handleDelete(w)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvel entrepôt</DialogTitle>
            <DialogDescription>Créez un emplacement de stockage (ex: Entrepôt A, Atelier, Garage).</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} placeholder="Nom de l'entrepôt" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Annuler
            </Button>
            <Button className="bg-brand-turquoise hover:bg-brand-turquoise-hover" onClick={handleCreate} disabled={saving}>
              {saving ? 'Création...' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier l&apos;entrepôt</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} placeholder="Nom de l&apos;entrepôt" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Annuler
            </Button>
            <Button className="bg-brand-turquoise hover:bg-brand-turquoise-hover" onClick={handleEdit} disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
