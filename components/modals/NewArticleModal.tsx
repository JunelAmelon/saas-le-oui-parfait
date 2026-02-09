'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { addDocument } from '@/lib/db';
import { toast as sonnerToast } from 'sonner';

interface NewArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onArticleCreated?: () => void;
}

const categories = [
  'Mobilier',
  'Linge',
  'Décoration',
  'Éclairage',
  'Vaisselle',
  'Autre',
];

const locations = [
  'Entrepôt A - Allée 1',
  'Entrepôt A - Allée 2',
  'Entrepôt A - Allée 3',
  'Entrepôt A - Zone déco',
  'Entrepôt B - Rayon 1',
  'Entrepôt B - Rayon 2',
  'Entrepôt C',
];

export function NewArticleModal({ isOpen, onClose, onArticleCreated }: NewArticleModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('');
  const [minQuantity, setMinQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name || !category || !quantity || !minQuantity || !price || !location) {
      sonnerToast.error('Veuillez remplir tous les champs');
      return;
    }

    if (!user) {
      sonnerToast.error('Vous devez être connecté');
      return;
    }

    setLoading(true);
    try {
      await addDocument('articles', {
        name,
        category,
        quantity: parseInt(quantity),
        min_quantity: parseInt(minQuantity),
        price: parseFloat(price),
        location,
        owner_id: user.uid,
        created_at: new Date(),
      });

      sonnerToast.success(`L'article "${name}" a été ajouté au stock`);

      // Reset form
      setName('');
      setCategory('');
      setQuantity('');
      setMinQuantity('');
      setPrice('');
      setLocation('');
      
      if (onArticleCreated) {
        onArticleCreated();
      }
      
      onClose();
    } catch (error) {
      console.error('Error creating article:', error);
      sonnerToast.error('Erreur lors de la création de l\'article');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-brand-purple flex items-center gap-2">
            <Package className="h-5 w-5 text-brand-turquoise" />
            Nouvel article
          </DialogTitle>
          <DialogDescription>
            Ajoutez un nouvel article à votre stock
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>Nom de l'article *</Label>
            <Input
              placeholder="Ex: Chaises Napoleon III"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Catégorie *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prix unitaire (€) *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Quantité initiale *</Label>
              <Input
                type="number"
                placeholder="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Quantité minimale *</Label>
              <Input
                type="number"
                placeholder="0"
                value={minQuantity}
                onChange={(e) => setMinQuantity(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-brand-gray mt-1">
                Alerte si stock en dessous
              </p>
            </div>
          </div>

          <div>
            <Label>Emplacement *</Label>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Sélectionner un emplacement" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => (
                  <SelectItem key={loc} value={loc}>
                    {loc}
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
          <Button
            className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Création...' : 'Créer l\'article'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
