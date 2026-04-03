'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { addDocument, getDocuments } from '@/lib/db';
import { toast as sonnerToast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { uploadImage } from '@/lib/storage';

interface NewArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onArticleCreated?: () => void;
}

const categories = [
  'Prestataire',
  'Animation',
  'Location',
  'Weeding',
  'Location nappage',
  'Location vaisselle',
  'Mobilier',
  'Décoration',
  'Éclairage',
  'Vaisselle',
  'Autre',
];

export function NewArticleModal({ isOpen, onClose, onArticleCreated }: NewArticleModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [warehouses, setWarehouses] = useState<Array<{ id: string; name: string }>>([]);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('');
  const [minQuantity, setMinQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [details, setDetails] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
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

    const fetchSuppliers = async () => {
      if (!user || !isOpen) return;
      try {
        const data = await getDocuments('fournisseurs', [
          { field: 'owner_id', operator: '==', value: user.uid },
        ]);
        const mapped = (data as any[])
          .map((f) => ({ id: f.id, name: f.name || '' }))
          .filter((f) => Boolean(f.name));
        setSuppliers(mapped);
      } catch (e) {
        console.error('Error fetching suppliers:', e);
        setSuppliers([]);
      }
    };

    fetchWarehouses();
    fetchSuppliers();
  }, [user, isOpen]);

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
      let photoUrl: string | null = null;
      if (photoFile) {
        sonnerToast.info('Upload de la photo en cours...');
        photoUrl = await uploadImage(photoFile, 'articles');
      }

      await addDocument('articles', {
        name,
        category,
        quantity: parseInt(quantity),
        min_quantity: parseInt(minQuantity),
        price: parseFloat(price),
        location,
        details,
        photo_url: photoUrl,
        fournisseur_id: supplierId || null,
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
      setSupplierId('');
      setDetails('');
      setPhotoFile(null);
      
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
      <DialogContent className="sm:max-w-lg w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
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
            <Label>Nom de l&apos;article *</Label>
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
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.name}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Fournisseur (optionnel)</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Sélectionner un fournisseur" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Détails du produit (optionnel)</Label>
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="mt-1"
              rows={4}
              placeholder="Décrivez le produit (dimensions, matière, couleur, etc.)"
            />
          </div>

          <div>
            <Label>Photo (optionnel)</Label>
            <input
              id="article-photo-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                setPhotoFile(f);
              }}
            />
            <label
              htmlFor="article-photo-upload"
              className="mt-1 flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-3 text-sm text-brand-gray hover:border-brand-turquoise hover:text-brand-purple transition-colors cursor-pointer bg-white"
            >
              <Package className="h-4 w-4" />
              {photoFile ? 'Photo sélectionnée' : 'Ajouter une photo'}
            </label>
            {photoFile ? (
              <p className="text-xs text-brand-gray mt-2">{photoFile.name}</p>
            ) : null}
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
