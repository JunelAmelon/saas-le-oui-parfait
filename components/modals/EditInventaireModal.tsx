'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getDocuments, updateDocument } from '@/lib/db';
import { toast as sonnerToast } from 'sonner';

interface Inventaire {
  id: string;
  reference: string;
  date: string;
  location: string;
  itemsCount: number;
  status: string;
  discrepancies: number;
  by: string;
}

interface EditInventaireModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventaire: Inventaire | null;
  onInventaireUpdated?: () => void;
}

const statusOptions = [
  { value: 'planned', label: 'Planifié' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'completed', label: 'Terminé' },
];

export function EditInventaireModal({ isOpen, onClose, inventaire, onInventaireUpdated }: EditInventaireModalProps) {
  const { user } = useAuth();
  const [warehouses, setWarehouses] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);

  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [by, setBy] = useState('');
  const [status, setStatus] = useState('planned');

  useEffect(() => {
    if (inventaire) {
      setDate(inventaire.date || '');
      setLocation(inventaire.location || '');
      setBy(inventaire.by || '');
      setStatus(inventaire.status || 'planned');
    }
  }, [inventaire, isOpen]);

  useEffect(() => {
    const fetchWarehouses = async () => {
      if (!user || !isOpen) return;
      try {
        const data = await getDocuments('warehouses', [
          { field: 'owner_id', operator: '==', value: user.uid },
        ]);
        const mapped = (data as any[])
          .map((w) => ({ id: w.id, name: w.name || '' }))
          .filter((w) => Boolean(w.name));
        setWarehouses(mapped);
      } catch (e) {
        console.error('Error fetching warehouses:', e);
        setWarehouses([]);
      }
    };

    fetchWarehouses();
  }, [user, isOpen]);

  const canSubmit = useMemo(() => Boolean(inventaire?.id) && Boolean(date) && Boolean(location) && Boolean(by), [inventaire?.id, date, location, by]);

  const handleSave = async () => {
    if (!inventaire) return;
    if (!user) {
      sonnerToast.error('Vous devez être connecté');
      return;
    }
    if (!canSubmit) {
      sonnerToast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);
    try {
      await updateDocument('inventaires', inventaire.id, {
        date,
        location,
        by,
        status,
        updated_at: new Date(),
      });

      sonnerToast.success('Inventaire modifié');
      onInventaireUpdated?.();
      onClose();
    } catch (e) {
      console.error('Error updating inventaire:', e);
      sonnerToast.error('Erreur lors de la modification');
    } finally {
      setLoading(false);
    }
  };

  if (!inventaire) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-brand-purple flex items-center gap-2">
            <Package className="h-5 w-5 text-brand-turquoise" />
            Modifier l'inventaire
          </DialogTitle>
          <DialogDescription>
            {inventaire.reference}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>Date *</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
          </div>

          <div>
            <Label>Entrepôt *</Label>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Sélectionner un entrepôt" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.name}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Responsable *</Label>
            <Input value={by} onChange={(e) => setBy(e.target.value)} className="mt-1" />
          </div>

          <div>
            <Label>Statut *</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Sélectionner un statut" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button className="bg-brand-turquoise hover:bg-brand-turquoise-hover" onClick={handleSave} disabled={loading}>
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
