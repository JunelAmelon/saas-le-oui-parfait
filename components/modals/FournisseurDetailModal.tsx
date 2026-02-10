'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Building2, MapPin, Phone, Mail, Package, Star, Trash2, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useState } from 'react';

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
  logoUrl?: string | null;
}

interface FournisseurDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  fournisseur: Fournisseur | null;
  onEdit: (fournisseur: Fournisseur) => void;
  onDelete: (id: string) => void;
}

export function FournisseurDetailModal({ 
  isOpen, 
  onClose, 
  fournisseur, 
  onEdit,
  onDelete 
}: FournisseurDetailModalProps) {
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  if (!fournisseur) return null;

  const handleDelete = () => {
    onDelete(fournisseur.id);
    toast({
      title: 'Fournisseur supprimé',
      description: `Le fournisseur "${fournisseur.name}" a été supprimé`,
    });
    setShowDeleteDialog(false);
    onClose();
  };

  const handleEdit = () => {
    onEdit(fournisseur);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-brand-purple flex items-center gap-2">
              <Building2 className="h-5 w-5 text-brand-turquoise" />
              Détails du fournisseur
            </DialogTitle>
            <DialogDescription>
              Informations complètes
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-14 w-14 rounded-full bg-white border border-gray-200 overflow-hidden flex-shrink-0">
                  {fournisseur.logoUrl ? (
                    <img src={fournisseur.logoUrl} alt={fournisseur.name} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0">
                  <h3 className="text-2xl font-bold text-brand-purple mb-2 truncate">
                    {fournisseur.name}
                  </h3>
                  <Badge className="bg-brand-turquoise text-white">
                    {fournisseur.category}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${
                      i < fournisseur.rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'fill-gray-200 text-gray-200'
                    }`}
                  />
                ))}
                <span className="ml-2 text-sm text-brand-gray">
                  ({fournisseur.rating}/5)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-brand-turquoise" />
                  <p className="text-xs text-brand-gray uppercase tracking-wider">Localisation</p>
                </div>
                <p className="font-bold text-brand-purple">{fournisseur.city}</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4 text-brand-turquoise" />
                  <p className="text-xs text-brand-gray uppercase tracking-wider">Produits</p>
                </div>
                <p className="font-bold text-brand-purple">{fournisseur.productsCount} articles</p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-brand-purple">Contact</h4>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-brand-gray uppercase tracking-wider mb-1">Personne de contact</p>
                <p className="font-medium text-brand-purple">{fournisseur.contactName}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Phone className="h-4 w-4 text-brand-turquoise" />
                    <p className="text-xs text-brand-gray uppercase tracking-wider">Téléphone</p>
                  </div>
                  <p className="font-medium text-brand-purple">{fournisseur.phone}</p>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="h-4 w-4 text-brand-turquoise" />
                    <p className="text-xs text-brand-gray uppercase tracking-wider">Email</p>
                  </div>
                  <p className="font-medium text-brand-purple truncate">{fournisseur.email}</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900">
                <span className="font-semibold">Historique :</span> Ce fournisseur référence actuellement{' '}
                <span className="font-bold">{fournisseur.productsCount} produits</span> dans votre catalogue.
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              className="border-2 border-red-500 text-red-600 hover:bg-red-500 hover:text-white gap-2"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4" />
              Supprimer
            </Button>
            <div className="flex gap-2 flex-1 sm:flex-initial">
              <Button variant="outline" onClick={onClose}>
                Fermer
              </Button>
              <Button
                className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2"
                onClick={handleEdit}
              >
                <Edit className="h-4 w-4" />
                Modifier
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le fournisseur "{fournisseur.name}" sera définitivement supprimé 
              de votre liste. Les produits associés ne seront pas supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
