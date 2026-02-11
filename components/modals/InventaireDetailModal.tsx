'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Package, Calendar, User, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getDocuments, updateDocument } from '@/lib/db';
import { toast } from 'sonner';

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

interface InventaireDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventaire: Inventaire | null;
  onInventaireUpdated?: () => void;
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

export function InventaireDetailModal({ isOpen, onClose, inventaire, onInventaireUpdated }: InventaireDetailModalProps) {
  if (!inventaire) return null;

  const { user } = useAuth();
  const [items, setItems] = useState<Array<{ id: string; name: string; expected: number; counted: number; difference: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const config = statusConfig[inventaire.status as keyof typeof statusConfig];
  const StatusIcon = config.icon;

  useEffect(() => {
    const fetchItems = async () => {
      if (!isOpen || !user) return;
      setLoading(true);
      try {
        const filters: any[] = [{ field: 'owner_id', operator: '==', value: user.uid }];
        // Si l'inventaire est sur un entrepôt précis, on filtre par location.
        if (inventaire.location) {
          filters.push({ field: 'location', operator: '==', value: inventaire.location });
        }
        const articles = await getDocuments('articles', filters);
        const mapped = (articles as any[]).map((a) => {
          const expected = Number(a.quantity ?? 0);
          const counted = expected;
          const difference = counted - expected;
          return {
            id: a.id,
            name: a.name || 'Article',
            expected,
            counted,
            difference,
          };
        });
        setItems(mapped);
      } catch (e) {
        console.error('Error fetching inventaire items:', e);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [isOpen, user, inventaire.location]);

  const discrepancies = useMemo(() => items.reduce((acc, it) => acc + (it.difference !== 0 ? 1 : 0), 0), [items]);

  const handleFinish = async () => {
    if (!user) return;
    setFinishing(true);
    try {
      await updateDocument('inventaires', inventaire.id, {
        status: 'completed',
        items_count: items.length,
        discrepancies,
        completed_at: new Date(),
      });
      toast.success("Inventaire terminé");
      onInventaireUpdated?.();
      onClose();
    } catch (e) {
      console.error('Error finishing inventaire:', e);
      toast.error("Erreur lors de la finalisation");
    } finally {
      setFinishing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-brand-purple flex items-center gap-2">
            <Package className="h-5 w-5 text-brand-turquoise" />
            Détails de l'inventaire
          </DialogTitle>
          <DialogDescription>
            {inventaire.reference}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <StatusIcon className="h-6 w-6 text-brand-turquoise" />
              <div>
                <p className="text-sm text-brand-gray">Statut</p>
                <Badge className={config.color}>
                  {config.label}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-brand-gray">Écarts détectés</p>
              <p className={`text-2xl font-bold ${inventaire.discrepancies > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {inventaire.discrepancies}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-brand-turquoise" />
                <p className="text-xs text-brand-gray uppercase tracking-wider">Date</p>
              </div>
              <p className="font-bold text-brand-purple">{inventaire.date}</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-brand-turquoise" />
                <p className="text-xs text-brand-gray uppercase tracking-wider">Emplacement</p>
              </div>
              <p className="font-bold text-brand-purple">{inventaire.location}</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-brand-turquoise" />
                <p className="text-xs text-brand-gray uppercase tracking-wider">Responsable</p>
              </div>
              <p className="font-bold text-brand-purple">{inventaire.by}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-brand-purple mb-4">
              Articles comptés ({loading ? '...' : items.length})
            </h3>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-brand-gray">
                      Article
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-brand-gray">
                      Attendu
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-brand-gray">
                      Compté
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-brand-gray">
                      Écart
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(loading ? [] : items).map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-brand-purple">
                        {item.name}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-brand-gray">
                        {item.expected}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-bold text-brand-purple">
                        {item.counted}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.difference !== 0 ? (
                          <div className="flex items-center justify-center gap-1">
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                            <span className={`text-sm font-bold ${item.difference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {item.difference > 0 ? '+' : ''}{item.difference}
                            </span>
                          </div>
                        ) : (
                          <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {inventaire.status === 'completed' && inventaire.discrepancies > 0 && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-orange-900 mb-1">Écarts détectés</p>
                  <p className="text-orange-800">
                    {inventaire.discrepancies} écart(s) ont été détectés lors de cet inventaire. 
                    Vérifiez les quantités et ajustez le stock si nécessaire.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          {inventaire.status === 'in_progress' && (
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => void handleFinish()} disabled={finishing}>
              {finishing ? 'Finalisation...' : "Terminer l'inventaire"}
            </Button>
          )}
          {inventaire.status === 'completed' && inventaire.discrepancies > 0 && (
            <Button className="bg-brand-turquoise hover:bg-brand-turquoise-hover">
              Ajuster le stock
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
