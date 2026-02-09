'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { addDocument, updateDocument } from '@/lib/db';
import { toast as sonnerToast } from 'sonner';

interface Fournisseur {
  id: string;
  name: string;
  category: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  rating: number;
  productsCount: number;
}

interface FournisseurModalProps {
  isOpen: boolean;
  onClose: () => void;
  fournisseur?: Fournisseur | null;
  mode: 'create' | 'edit';
  onFournisseurSaved?: () => void;
}

const categories = [
  'Mobilier',
  'Linge',
  'Décoration',
  'Éclairage',
  'Vaisselle',
  'Fleurs',
  'Traiteur',
  'Autre',
];

export function FournisseurModal({ isOpen, onClose, fournisseur, mode, onFournisseurSaved }: FournisseurModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [rating, setRating] = useState(5);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && fournisseur) {
      setName(fournisseur.name);
      setCategory(fournisseur.category);
      setContactName(fournisseur.contactName);
      setEmail(fournisseur.email);
      setPhone(fournisseur.phone);
      setCity(fournisseur.city);
      setRating(fournisseur.rating);
    } else if (mode === 'create') {
      // Reset form for create mode
      setName('');
      setCategory('');
      setContactName('');
      setEmail('');
      setPhone('');
      setCity('');
      setAddress('');
      setRating(5);
      setNotes('');
    }
  }, [mode, fournisseur, isOpen]);

  const handleSubmit = async () => {
    if (!name || !category || !contactName || !email || !phone || !city) {
      sonnerToast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (!user) {
      sonnerToast.error('Vous devez être connecté');
      return;
    }

    setLoading(true);
    try {
      const data = {
        name,
        category,
        contact_name: contactName,
        email,
        phone,
        city,
        address,
        rating,
        notes,
        products_count: 0,
      };

      if (mode === 'create') {
        await addDocument('vendors', {
          ...data,
          planner_id: user.uid,
          created_at: new Date(),
        });
        sonnerToast.success(`Le fournisseur "${name}" a été ajouté avec succès`);
      } else if (fournisseur) {
        await updateDocument('vendors', fournisseur.id, {
          ...data,
          updated_at: new Date(),
        });
        sonnerToast.success(`Les informations de "${name}" ont été mises à jour`);
      }

      if (onFournisseurSaved) {
        onFournisseurSaved();
      }

      onClose();
    } catch (error) {
      console.error('Error saving fournisseur:', error);
      sonnerToast.error('Erreur lors de l\'enregistrement du fournisseur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-brand-purple flex items-center gap-2">
            <Building2 className="h-5 w-5 text-brand-turquoise" />
            {mode === 'create' ? 'Nouveau fournisseur' : 'Modifier le fournisseur'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'Ajoutez un nouveau fournisseur à votre liste'
              : 'Modifiez les informations du fournisseur'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Nom du fournisseur *</Label>
              <Input
                placeholder="Ex: Mobilier Pro Bretagne"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
              />
            </div>
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Nom du contact *</Label>
              <Input
                placeholder="Prénom Nom"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                placeholder="contact@fournisseur.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Téléphone *</Label>
              <Input
                type="tel"
                placeholder="02 99 00 00 00"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Ville *</Label>
              <Input
                placeholder="Rennes"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label>Adresse complète</Label>
            <Input
              placeholder="123 rue de la République"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Évaluation</Label>
            <div className="flex items-center gap-2 mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="focus:outline-none"
                >
                  <Star
                    className={`h-6 w-6 transition-colors ${
                      star <= rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'fill-gray-200 text-gray-200'
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm text-brand-gray">
                {rating}/5
              </span>
            </div>
          </div>

          <div>
            <Label>Notes internes</Label>
            <Textarea
              placeholder="Informations complémentaires, conditions de paiement, délais..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1"
              rows={3}
            />
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
            {loading ? 'Enregistrement...' : (mode === 'create' ? 'Créer le fournisseur' : 'Enregistrer')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
