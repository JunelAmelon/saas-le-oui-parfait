'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, CheckCircle, Clock, Package, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getDocuments, addDocument, updateDocument, deleteDocument } from '@/lib/db';
import { toast } from 'sonner';
import { NewInventaireModal } from '@/components/modals/NewInventaireModal';
import { InventaireDetailModal } from '@/components/modals/InventaireDetailModal';
import { EditInventaireModal } from '@/components/modals/EditInventaireModal';

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

const statusConfig = {
  completed: {
    label: 'Terminé',
    color: 'bg-green-100 text-green-700',
    icon: CheckCircle,
  },
  in_progress: {
    label: 'En cours',
    color: 'bg-blue-100 text-blue-700',
    icon: Clock,
  },
  planned: {
    label: 'Planifié',
    color: 'bg-gray-100 text-gray-700',
    icon: Calendar,
  },
};

export default function InventairePage() {
  const { user } = useAuth();
  const [inventaires, setInventaires] = useState<Inventaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewInventaireOpen, setIsNewInventaireOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedInventaire, setSelectedInventaire] = useState<Inventaire | null>(null);

  // Fetch inventaires
  const fetchInventaires = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getDocuments('inventaires', [
        { field: 'owner_id', operator: '==', value: user.uid }
      ]);
      const mapped = data.map((d: any) => ({
        id: d.id,
        reference: d.reference,
        date: d.date,
        location: d.location,
        itemsCount: d.items_count || 0,
        status: d.status,
        discrepancies: d.discrepancies || 0,
        by: d.by || '',
      }));
      setInventaires(mapped);
    } catch (e) {
      console.error('Error fetching inventaires:', e);
      toast.error('Erreur lors du chargement des inventaires');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventaires();
  }, [user]);

  const handleViewDetail = (inventaire: Inventaire) => {
    setSelectedInventaire(inventaire);
    setIsDetailOpen(true);
  };

  const handleEdit = (inventaire: Inventaire) => {
    setSelectedInventaire(inventaire);
    setIsEditOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-purple mb-2">
              Inventaire
            </h1>
            <p className="text-sm sm:text-base text-brand-gray">
              Suivez et planifiez vos inventaires
            </p>
          </div>
          <Button 
            className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2 w-full sm:w-auto"
            onClick={() => setIsNewInventaireOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Nouvel inventaire
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-green-50 to-white">
            <p className="text-sm text-brand-gray uppercase tracking-label mb-1">Terminés</p>
            <p className="text-3xl font-bold text-brand-purple">
              {inventaires.filter(i => i.status === 'completed').length}
            </p>
          </Card>
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-blue-50 to-white">
            <p className="text-sm text-brand-gray uppercase tracking-label mb-1">En cours</p>
            <p className="text-3xl font-bold text-brand-purple">
              {inventaires.filter(i => i.status === 'in_progress').length}
            </p>
          </Card>
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-gray-50 to-white">
            <p className="text-sm text-brand-gray uppercase tracking-label mb-1">Planifiés</p>
            <p className="text-3xl font-bold text-brand-purple">
              {inventaires.filter(i => i.status === 'planned').length}
            </p>
          </Card>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-brand-turquoise" />
          </div>
        ) : inventaires.length === 0 ? (
          <Card className="p-12 text-center">
            <Package className="h-16 w-16 text-brand-gray mx-auto mb-4" />
            <h3 className="text-xl font-bold text-brand-purple mb-2">Aucun inventaire</h3>
            <p className="text-brand-gray mb-6">Créez votre premier inventaire</p>
            <Button onClick={() => setIsNewInventaireOpen(true)} className="bg-brand-turquoise hover:bg-brand-turquoise-hover">
              <Plus className="h-4 w-4 mr-2" /> Créer un inventaire
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {inventaires.map((inventaire) => {
            const config = statusConfig[inventaire.status as keyof typeof statusConfig];
            const StatusIcon = config.icon;

            return (
              <Card key={inventaire.id} className="p-6 shadow-xl border-0 hover:shadow-2xl transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Package className="h-5 w-5 text-brand-turquoise" />
                      <h3 className="text-lg font-bold text-brand-purple">
                        {inventaire.reference}
                      </h3>
                    </div>
                    <p className="text-sm text-brand-gray">
                      {inventaire.location}
                    </p>
                  </div>
                  <Badge className={config.color}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {config.label}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 rounded-lg bg-gray-50">
                  <div>
                    <p className="text-xs text-brand-gray uppercase tracking-label mb-1">Date</p>
                    <p className="text-sm font-bold text-brand-purple">{inventaire.date}</p>
                  </div>
                  <div>
                    <p className="text-xs text-brand-gray uppercase tracking-label mb-1">Articles comptés</p>
                    <p className="text-sm font-bold text-brand-purple">{inventaire.itemsCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-brand-gray uppercase tracking-label mb-1">Écarts</p>
                    <p className={`text-sm font-bold ${inventaire.discrepancies > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {inventaire.discrepancies}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-brand-gray uppercase tracking-label mb-1">Par</p>
                    <p className="text-sm font-medium text-brand-purple">{inventaire.by}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
                    onClick={() => handleViewDetail(inventaire)}
                  >
                    Voir les détails
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-2 border-brand-turquoise text-brand-gray hover:bg-brand-turquoise hover:text-white"
                    onClick={() => handleEdit(inventaire)}
                  >
                    Modifier
                  </Button>
                  {inventaire.status === 'in_progress' && (
                    <Button size="sm" variant="outline" className="border-2 border-green-500 text-green-600 hover:bg-green-500 hover:text-white">
                      Terminer l'inventaire
                    </Button>
                  )}
                </div>
              </Card>
              );
            })}
          </div>
        )}
      </div>

      <NewInventaireModal
        isOpen={isNewInventaireOpen}
        onClose={() => setIsNewInventaireOpen(false)}
        onInventaireCreated={fetchInventaires}
      />

      <InventaireDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        inventaire={selectedInventaire}
        onInventaireUpdated={fetchInventaires}
      />

      <EditInventaireModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        inventaire={selectedInventaire}
        onInventaireUpdated={fetchInventaires}
      />
    </DashboardLayout>
  );
}
