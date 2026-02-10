'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { addDocument, deleteDocument, getDocuments, updateDocument } from '@/lib/db';
import { toast } from 'sonner';

export interface FlowerCatalogItem {
  id: string;
  name: string;
  unit: string;
  price: number;
  planner_id: string;
  created_at?: any;
}

interface FlowerCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

export function FlowerCatalogModal({ isOpen, onClose, onUpdated }: FlowerCatalogModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<FlowerCatalogItem[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', unit: '', price: '' });

  const canSubmit = useMemo(() => {
    const price = Number(form.price);
    return Boolean(form.name.trim() && form.unit.trim() && !Number.isNaN(price) && price >= 0);
  }, [form.name, form.unit, form.price]);

  const resetForm = () => {
    setEditingId(null);
    setForm({ name: '', unit: '', price: '' });
  };

  const fetchItems = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const data = await getDocuments('flowers_catalog', [
        { field: 'planner_id', operator: '==', value: user.uid },
      ]);
      const mapped = (data as any[])
        .map((d) => ({
          id: d.id,
          name: d.name || '',
          unit: d.unit || '',
          price: Number(d.price ?? 0),
          planner_id: d.planner_id,
          created_at: d.created_at,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'fr')) as FlowerCatalogItem[];
      setItems(mapped);
    } catch (e) {
      console.error('Error fetching flower catalog:', e);
      setItems([]);
      toast.error('Erreur lors du chargement du catalogue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      resetForm();
      void fetchItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user?.uid]);

  const handleEdit = (item: FlowerCatalogItem) => {
    setEditingId(item.id);
    setForm({ name: item.name, unit: item.unit, price: String(item.price) });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette fleur du catalogue ?')) return;
    try {
      await deleteDocument('flowers_catalog', id);
      toast.success('Fleur supprimée');
      await fetchItems();
      onUpdated?.();
    } catch (e) {
      console.error('Error deleting flower catalog item:', e);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleSave = async () => {
    if (!user?.uid) {
      toast.error('Vous devez être connecté');
      return;
    }
    if (!canSubmit) {
      toast.error('Veuillez compléter tous les champs');
      return;
    }

    const payload = {
      planner_id: user.uid,
      name: form.name.trim(),
      unit: form.unit.trim(),
      price: Number(form.price),
      created_at: new Date(),
    };

    try {
      if (editingId) {
        await updateDocument('flowers_catalog', editingId, payload);
        toast.success('Catalogue mis à jour');
      } else {
        await addDocument('flowers_catalog', payload);
        toast.success('Fleur ajoutée au catalogue');
      }
      resetForm();
      await fetchItems();
      onUpdated?.();
    } catch (e) {
      console.error('Error saving flower catalog item:', e);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-brand-purple">Gérer le catalogue</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <Card className="p-4 border">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label>Nom</Label>
                <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Unité</Label>
                <Input value={form.unit} onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))} className="mt-1" placeholder="tige, bouquet, kg..." />
              </div>
              <div>
                <Label>Prix</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-4">
              {editingId ? (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Annuler
                </Button>
              ) : null}
              <Button type="button" className="bg-brand-turquoise hover:bg-brand-turquoise-hover" onClick={handleSave} disabled={!canSubmit}>
                {editingId ? 'Enregistrer' : 'Ajouter'}
              </Button>
            </div>
          </Card>

          <div className="space-y-2">
            {loading ? (
              <div className="text-sm text-brand-gray">Chargement...</div>
            ) : items.length === 0 ? (
              <div className="text-sm text-brand-gray">Aucune fleur dans le catalogue.</div>
            ) : (
              items.map((it) => (
                <div key={it.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div className="min-w-0">
                    <p className="font-medium text-brand-purple text-sm truncate">{it.name}</p>
                    <p className="text-xs text-brand-gray">{it.unit}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-bold text-brand-purple whitespace-nowrap">{it.price} €</p>
                    <Button type="button" size="sm" variant="outline" onClick={() => handleEdit(it)}>
                      Modifier
                    </Button>
                    <Button type="button" size="sm" variant="destructive" onClick={() => void handleDelete(it.id)}>
                      Supprimer
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
