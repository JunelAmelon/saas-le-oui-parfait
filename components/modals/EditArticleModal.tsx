'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateDocument } from '@/lib/db';
import { toast as sonnerToast } from 'sonner';

interface Article {
  id: string;
  name: string;
  category: string;
  quantity: number;
  minQuantity: number;
  price: number;
  location: string;
  status: string;
}

interface EditArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  article: Article | null;
  onArticleUpdated?: () => void;
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

const statusOptions = [
  { value: 'available', label: 'Disponible' },
  { value: 'low_stock', label: 'Stock faible' },
  { value: 'critical', label: 'Stock critique' },
  { value: 'out_of_stock', label: 'Rupture de stock' },
];

export function EditArticleModal({ isOpen, onClose, article, onArticleUpdated }: EditArticleModalProps) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('');
  const [minQuantity, setMinQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (article) {
      setName(article.name);
      setCategory(article.category);
      setQuantity(article.quantity.toString());
      setMinQuantity(article.minQuantity.toString());
      setPrice(article.price.toString());
      setLocation(article.location);
      setStatus(article.status);
    }
  }, [article]);

  const handleSubmit = async () => {
    if (!name || !category || !quantity || !minQuantity || !price || !location || !article) {
      sonnerToast.error('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      await updateDocument('articles', article.id, {
        name,
        category,
        quantity: parseInt(quantity),
        min_quantity: parseInt(minQuantity),
        price: parseFloat(price),
        location,
        updated_at: new Date(),
      });

      sonnerToast.success(`L'article "${name}" a été mis à jour`);
      
      if (onArticleUpdated) {
        onArticleUpdated();
      }
      
      onClose();
    } catch (error) {
      console.error('Error updating article:', error);
      sonnerToast.error('Erreur lors de la modification de l\'article');
    } finally {
      setLoading(false);
    }
  };

  if (!article) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-brand-purple flex items-center gap-2">
            <Package className="h-5 w-5 text-brand-turquoise" />
            Modifier l'article
          </DialogTitle>
          <DialogDescription>
            Modifiez les informations de l'article
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>Nom de l'article *</Label>
            <Input
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
                  <SelectValue />
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
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Quantité *</Label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Quantité minimale *</Label>
              <Input
                type="number"
                value={minQuantity}
                onChange={(e) => setMinQuantity(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label>Emplacement *</Label>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger className="mt-1">
                <SelectValue />
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

          <div>
            <Label>Statut *</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-brand-gray mt-1">
              Changez le statut manuellement si nécessaire
            </p>
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
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
