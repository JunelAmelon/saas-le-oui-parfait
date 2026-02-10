'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search, Flower2, Calculator, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { NewCompositionModal } from '@/components/modals/NewCompositionModal';
import { EditCompositionModal, CompositionDoc } from '@/components/modals/EditCompositionModal';
import { FlowerCatalogModal } from '@/components/modals/FlowerCatalogModal';
import { useAuth } from '@/contexts/AuthContext';
import { getDocuments, deleteDocument } from '@/lib/db';
import { toast } from 'sonner';

const compositionsDemo = [
  {
    id: '1',
    name: 'Bouquet de mariée classique',
    flowers: ['Roses blanches (20)', 'Pivoines (10)', 'Gypsophile'],
    cost: 45,
    price: 120,
    margin: 75,
    createdFor: 'Julie & Frédérick',
  },
  {
    id: '2',
    name: 'Centre de table romantique',
    flowers: ['Roses roses (15)', 'Eucalyptus', 'Lisianthus (8)'],
    cost: 28,
    price: 75,
    margin: 47,
    createdFor: 'Sophie & Alexandre',
  },
  {
    id: '3',
    name: 'Arche florale champêtre',
    flowers: ['Roses variées (50)', 'Pivoines (30)', 'Feuillage (3kg)'],
    cost: 180,
    price: 450,
    margin: 270,
    createdFor: 'Emma & Thomas',
  },
  {
    id: '4',
    name: 'Boutonnière témoin',
    flowers: ['Rose blanche (1)', 'Gypsophile', 'Ruban'],
    cost: 5,
    price: 15,
    margin: 10,
    createdFor: 'Marie & Pierre',
  },
];

const fleursCatalog = [
  { name: 'Roses blanches', unit: 'tige', price: 2.5 },
  { name: 'Pivoines', unit: 'tige', price: 4 },
  { name: 'Lisianthus', unit: 'tige', price: 3 },
  { name: 'Gypsophile', unit: 'bouquet', price: 8 },
  { name: 'Eucalyptus', unit: 'botte', price: 12 },
  { name: 'Feuillage', unit: 'kg', price: 15 },
];

interface Composition {
  id: string;
  name: string;
  flowers: string[];
  items?: Array<{ name: string; quantity: number; unit_price: number }>;
  cost: number;
  price: number;
  margin: number;
  client_id: string;
  client_name?: string;
  planner_id?: string;
  send_to_client?: boolean;
  created_at: any;
}

export default function FleursPage() {
  const { user } = useAuth();
  const [isNewCompositionOpen, setIsNewCompositionOpen] = useState(false);
  const [compositions, setCompositions] = useState<Composition[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedComposition, setSelectedComposition] = useState<Composition | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [catalogItems, setCatalogItems] = useState<Array<{ name: string; unit: string; price: number }>>(fleursCatalog);

  useEffect(() => {
    if (user) {
      fetchCompositions();
      fetchCatalog();
    }
  }, [user]);

  const fetchCompositions = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getDocuments('compositions', [
        { field: 'planner_id', operator: '==', value: user.uid }
      ]);
      setCompositions(data as Composition[]);
    } catch (error) {
      console.error('Error fetching compositions:', error);
      toast.error('Erreur lors du chargement des compositions');
    } finally {
      setLoading(false);
    }
  };

  const fetchCatalog = async () => {
    if (!user?.uid) return;
    try {
      const data = await getDocuments('flowers_catalog', [
        { field: 'planner_id', operator: '==', value: user.uid },
      ]);
      const mapped = (data as any[])
        .map((d: any) => ({
          name: d?.name || '',
          unit: d?.unit || '',
          price: Number(d?.price ?? 0) || 0,
        }))
        .filter((x) => Boolean(x.name));
      setCatalogItems(mapped.length > 0 ? mapped : fleursCatalog);
    } catch (e) {
      console.error('Error fetching flower catalog:', e);
      setCatalogItems(fleursCatalog);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette composition ?')) return;
    
    try {
      await deleteDocument('compositions', id);
      toast.success('Composition supprimée avec succès');
      fetchCompositions();
    } catch (error) {
      console.error('Error deleting composition:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const filteredCompositions = compositions.filter(comp =>
    comp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (comp.client_name && comp.client_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-purple mb-1 sm:mb-2">
              Composition Florale
            </h1>
            <p className="text-sm sm:text-base text-brand-gray">
              Créez et calculez vos compositions florales
            </p>
          </div>
          <Button 
            className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2 w-full sm:w-auto"
            onClick={() => setIsNewCompositionOpen(true)}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nouvelle composition</span>
            <span className="sm:hidden">Nouvelle</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-pink-50 to-white">
            <p className="text-sm text-brand-gray uppercase tracking-label mb-1">Compositions</p>
            <p className="text-3xl font-bold text-brand-purple">
              {compositions.length}
            </p>
          </Card>
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-blue-50 to-white">
            <p className="text-sm text-brand-gray uppercase tracking-label mb-1">Coût moyen</p>
            <p className="text-2xl font-bold text-brand-purple">
              {compositions.length > 0 ? Math.round(compositions.reduce((acc, c) => acc + c.cost, 0) / compositions.length) : 0} €
            </p>
          </Card>
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-green-50 to-white">
            <p className="text-sm text-brand-gray uppercase tracking-label mb-1">Prix moyen</p>
            <p className="text-2xl font-bold text-brand-purple">
              {compositions.length > 0 ? Math.round(compositions.reduce((acc, c) => acc + c.price, 0) / compositions.length) : 0} €
            </p>
          </Card>
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-brand-beige to-white">
            <p className="text-sm text-brand-gray uppercase tracking-label mb-1">Marge totale</p>
            <p className="text-2xl font-bold text-brand-purple">
              {compositions.reduce((acc, c) => acc + c.margin, 0)} €
            </p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-4 shadow-xl border-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-gray" />
                <Input
                  placeholder="Rechercher une composition..."
                  className="pl-10 border-[#E5E5E5] focus-visible:ring-brand-turquoise"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </Card>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-brand-turquoise" />
              </div>
            ) : filteredCompositions.length === 0 ? (
              <div className="text-center py-20">
                <Flower2 className="h-16 w-16 text-brand-gray mx-auto mb-4" />
                <h3 className="text-xl font-bold text-brand-purple mb-2">
                  {searchTerm ? 'Aucun résultat' : 'Aucune composition'}
                </h3>
                <p className="text-brand-gray mb-6">
                  {searchTerm ? 'Essayez avec d\'autres critères' : 'Créez votre première composition florale'}
                </p>
                {!searchTerm && (
                  <Button onClick={() => setIsNewCompositionOpen(true)} className="bg-brand-turquoise hover:bg-brand-turquoise-hover">
                    <Plus className="h-4 w-4 mr-2" /> Nouvelle composition
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredCompositions.map((composition) => (
                <Card key={composition.id} className="p-6 shadow-xl border-0 hover:shadow-2xl transition-shadow">
                  <div className="flex items-start gap-4 mb-4">
                    <Flower2 className="h-8 w-8 text-pink-500" />
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-brand-purple mb-1">
                        {composition.name}
                      </h3>
                      {composition.client_name && (
                        <p className="text-sm text-brand-gray mb-2">
                          Pour: {composition.client_name}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {composition.flowers && composition.flowers.map((flower, idx) => (
                          <Badge key={idx} variant="outline" className="border-pink-300 text-pink-700">
                            {flower}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-gray-50">
                    <div>
                      <p className="text-xs text-brand-gray uppercase tracking-label mb-1">Coût</p>
                      <p className="text-lg font-bold text-brand-purple">{composition.cost} €</p>
                    </div>
                    <div>
                      <p className="text-xs text-brand-gray uppercase tracking-label mb-1">Prix vente</p>
                      <p className="text-lg font-bold text-brand-purple">{composition.price} €</p>
                    </div>
                    <div>
                      <p className="text-xs text-brand-gray uppercase tracking-label mb-1">Marge</p>
                      <p className="text-lg font-bold text-green-600">{composition.margin} €</p>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedComposition(composition);
                        setIsEditOpen(true);
                      }}
                    >
                      Modifier
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => handleDelete(composition.id)}
                    >
                      Supprimer
                    </Button>
                  </div>
                </Card>
                ))}
              </div>
            )}
          </div>

          <div>
            <Card className="p-6 shadow-xl border-0">
              <h3 className="text-lg font-bold text-brand-purple mb-4 flex items-center gap-2">
                <Flower2 className="h-5 w-5 text-pink-500" />
                Catalogue Fleurs
              </h3>
              <div className="space-y-3">
                {catalogItems.map((fleur, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div>
                      <p className="font-medium text-brand-purple text-sm">{fleur.name}</p>
                      <p className="text-xs text-brand-gray">{fleur.unit}</p>
                    </div>
                    <p className="font-bold text-brand-purple">{fleur.price} €</p>
                  </div>
                ))}
              </div>
              <Button
                className="w-full mt-4 bg-brand-turquoise hover:bg-brand-turquoise-hover"
                onClick={() => setIsCatalogOpen(true)}
              >
                Gérer le catalogue
              </Button>
            </Card>
          </div>
        </div>
      </div>

      <NewCompositionModal
        isOpen={isNewCompositionOpen}
        onClose={() => setIsNewCompositionOpen(false)}
        onCompositionCreated={() => {
          fetchCompositions();
          fetchCatalog();
        }}
      />

      <EditCompositionModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onUpdated={() => {
          fetchCompositions();
          fetchCatalog();
        }}
        composition={(selectedComposition as unknown as CompositionDoc) || null}
      />

      <FlowerCatalogModal
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        onUpdated={() => {
          fetchCatalog();
        }}
      />
    </DashboardLayout>
  );
}
