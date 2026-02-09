'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search, MapPin, Phone, Mail, Star, Package, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getDocuments, addDocument, updateDocument, deleteDocument } from '@/lib/db';
import { toast } from 'sonner';
import { FournisseurModal } from '@/components/modals/FournisseurModal';
import { FournisseurDetailModal } from '@/components/modals/FournisseurDetailModal';

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

export default function FournisseursPage() {
  const { user } = useAuth();
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFournisseurModalOpen, setIsFournisseurModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedFournisseur, setSelectedFournisseur] = useState<Fournisseur | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

  // Fetch fournisseurs
  const fetchFournisseurs = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getDocuments('fournisseurs', [
        { field: 'owner_id', operator: '==', value: user.uid }
      ]);
      const mapped = data.map((d: any) => ({
        id: d.id,
        name: d.name,
        category: d.category,
        contactName: d.contact_name || '',
        email: d.email || '',
        phone: d.phone || '',
        city: d.city || '',
        rating: d.rating || 0,
        productsCount: d.products_count || 0,
      }));
      setFournisseurs(mapped);
    } catch (e) {
      console.error('Error fetching fournisseurs:', e);
      toast.error('Erreur lors du chargement des fournisseurs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFournisseurs();
  }, [user]);

  const handleViewDetail = (fournisseur: Fournisseur) => {
    setSelectedFournisseur(fournisseur);
    setIsDetailOpen(true);
  };

  const handleEdit = (fournisseur: Fournisseur) => {
    setSelectedFournisseur(fournisseur);
    setModalMode('edit');
    setIsFournisseurModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce fournisseur ?')) return;
    
    try {
      await deleteDocument('fournisseurs', id);
      toast.success('Fournisseur supprimé');
      setIsDetailOpen(false);
      fetchFournisseurs();
    } catch (e) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleCreate = () => {
    setSelectedFournisseur(null);
    setModalMode('create');
    setIsFournisseurModalOpen(true);
  };

  const filteredFournisseurs = fournisseurs.filter(f =>
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-purple mb-2">
              Fournisseurs
            </h1>
            <p className="text-sm sm:text-base text-brand-gray">
              Gérez vos fournisseurs de stock et matériel
            </p>
          </div>
          <Button 
            className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2 w-full sm:w-auto"
            onClick={handleCreate}
          >
            <Plus className="h-4 w-4" />
            Nouveau fournisseur
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-brand-beige to-white">
            <p className="text-sm text-brand-gray uppercase tracking-label mb-1">Total fournisseurs</p>
            <p className="text-3xl font-bold text-brand-purple">
              {fournisseurs.length}
            </p>
          </Card>
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-blue-50 to-white">
            <p className="text-sm text-brand-gray uppercase tracking-label mb-1">Produits référencés</p>
            <p className="text-3xl font-bold text-brand-purple">
              {fournisseurs.reduce((acc, f) => acc + f.productsCount, 0)}
            </p>
          </Card>
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-yellow-50 to-white">
            <p className="text-sm text-brand-gray uppercase tracking-label mb-1">Note moyenne</p>
            <p className="text-3xl font-bold text-brand-purple">
              {fournisseurs.length > 0 ? (fournisseurs.reduce((acc, f) => acc + f.rating, 0) / fournisseurs.length).toFixed(1) : '0'}/5
            </p>
          </Card>
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-green-50 to-white">
            <p className="text-sm text-brand-gray uppercase tracking-label mb-1">Catégories</p>
            <p className="text-3xl font-bold text-brand-purple">
              {new Set(fournisseurs.map(f => f.category)).size}
            </p>
          </Card>
        </div>

        <Card className="p-4 shadow-xl border-0">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-gray" />
              <Input
                placeholder="Rechercher un fournisseur..."
                className="pl-10 border-[#E5E5E5] focus-visible:ring-brand-turquoise"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" className="border-2 border-brand-turquoise text-brand-gray hover:bg-brand-turquoise hover:text-white">
              Filtrer
            </Button>
          </div>
        </Card>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-brand-turquoise" />
          </div>
        ) : filteredFournisseurs.length === 0 ? (
          <Card className="p-12 text-center">
            <Package className="h-16 w-16 text-brand-gray mx-auto mb-4" />
            <h3 className="text-xl font-bold text-brand-purple mb-2">
              {searchTerm ? 'Aucun résultat' : 'Aucun fournisseur'}
            </h3>
            <p className="text-brand-gray mb-6">
              {searchTerm ? 'Essayez avec d\'autres mots-clés' : 'Ajoutez votre premier fournisseur'}
            </p>
            {!searchTerm && (
              <Button onClick={handleCreate} className="bg-brand-turquoise hover:bg-brand-turquoise-hover">
                <Plus className="h-4 w-4 mr-2" /> Ajouter un fournisseur
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFournisseurs.map((fournisseur) => (
            <Card key={fournisseur.id} className="p-6 shadow-xl border-0 hover:shadow-2xl transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-brand-purple mb-1">
                    {fournisseur.name}
                  </h3>
                  <Badge className="bg-brand-turquoise text-white">
                    {fournisseur.category}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2 mb-4 text-sm">
                <div className="flex items-center gap-2 text-brand-gray">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span>{fournisseur.city}</span>
                </div>
                <div className="flex items-center gap-2 text-brand-gray">
                  <Phone className="h-4 w-4 flex-shrink-0" />
                  <span>{fournisseur.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-brand-gray">
                  <Mail className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{fournisseur.email}</span>
                </div>
                <div className="flex items-center gap-2 text-brand-gray">
                  <Package className="h-4 w-4 flex-shrink-0" />
                  <span>{fournisseur.productsCount} produits</span>
                </div>
              </div>

              <div className="mb-4 flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
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

              <div className="pt-4 border-t border-[#E5E5E5]">
                <p className="text-sm text-brand-gray mb-2">
                  Contact: {fournisseur.contactName}
                </p>
                <Button
                  size="sm"
                  className="w-full bg-brand-turquoise hover:bg-brand-turquoise-hover"
                  onClick={() => handleViewDetail(fournisseur)}
                >
                  Voir les détails
                </Button>
              </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <FournisseurModal
        isOpen={isFournisseurModalOpen}
        onClose={() => setIsFournisseurModalOpen(false)}
        fournisseur={selectedFournisseur}
        mode={modalMode}
        onFournisseurSaved={fetchFournisseurs}
      />

      <FournisseurDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        fournisseur={selectedFournisseur}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </DashboardLayout>
  );
}
