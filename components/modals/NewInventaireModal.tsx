'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Calendar, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { addDocument, getDocuments } from '@/lib/db';
import { toast as sonnerToast } from 'sonner';

interface NewInventaireModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInventaireCreated?: () => void;
}

export function NewInventaireModal({ isOpen, onClose, onInventaireCreated }: NewInventaireModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [warehouses, setWarehouses] = useState<Array<{ id: string; name: string }>>([]);
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [responsiblePerson, setResponsiblePerson] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async () => {
    if (!location || !date || !responsiblePerson) {
      sonnerToast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (!user) {
      sonnerToast.error('Vous devez être connecté');
      return;
    }

    setLoading(true);
    try {
      const reference = `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

      await addDocument('inventaires', {
        reference,
        location,
        date,
        by: responsiblePerson,
        notes,
        status: 'planned',
        items_count: 0,
        discrepancies: 0,
        owner_id: user.uid,
        created_at: new Date(),
      });

      sonnerToast.success(`L'inventaire ${reference} a été planifié pour ${location}`);

      // Reset form
      setLocation('');
      setDate('');
      setResponsiblePerson('');
      setNotes('');
      
      if (onInventaireCreated) {
        onInventaireCreated();
      }
      
      onClose();
    } catch (error) {
      console.error('Error creating inventaire:', error);
      sonnerToast.error('Erreur lors de la création de l\'inventaire');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-brand-purple flex items-center gap-2">
            <Package className="h-5 w-5 text-brand-turquoise" />
            Nouvel inventaire
          </DialogTitle>
          <DialogDescription>
            Planifiez un nouvel inventaire de stock
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">À quoi sert un inventaire ?</p>
                <p className="text-blue-800">
                  Un inventaire permet de compter physiquement tous les articles en stock pour vérifier 
                  qu'ils correspondent aux quantités enregistrées dans le système. Cela aide à détecter 
                  les écarts (pertes, vols, erreurs) et à maintenir des données précises.
                </p>
              </div>
            </div>
          </div>

          <div>
            <Label>Emplacement à inventorier *</Label>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Sélectionner un emplacement" />
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
            <Label>Date prévue *</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Responsable de l'inventaire *</Label>
            <Input
              placeholder="Nom de la personne"
              value={responsiblePerson}
              onChange={(e) => setResponsiblePerson(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Notes (optionnel)</Label>
            <Textarea
              placeholder="Instructions particulières, zones à vérifier en priorité..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>

          <div className="p-3 bg-gray-50 rounded-lg text-sm text-brand-gray">
            <p className="font-medium mb-1">Processus d'inventaire :</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Planification : créer l'inventaire (statut "Planifié")</li>
              <li>Comptage : compter physiquement les articles (statut "En cours")</li>
              <li>Vérification : comparer avec les quantités système</li>
              <li>Ajustement : corriger les écarts détectés</li>
              <li>Finalisation : terminer l'inventaire (statut "Terminé")</li>
            </ol>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Création...' : 'Créer l\'inventaire'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
