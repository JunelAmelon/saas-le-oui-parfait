'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Archive, RefreshCcw, Trash2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import {
  collection,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';

interface ArchivedProspect {
  id: string;
  name: string;
  partner: string;
  email: string;
  phone: string;
  eventDate: string;
  budget: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  notes?: string;
  archived: boolean;
  archivedAt?: any;
  createdAt?: any;
  updatedAt?: any;
}

const statusConfig = {
  new: { label: 'Nouveau', color: 'bg-blue-100 text-blue-700' },
  contacted: { label: 'Contacté', color: 'bg-yellow-100 text-yellow-700' },
  qualified: { label: 'Qualifié', color: 'bg-green-100 text-green-700' },
  converted: { label: 'Converti', color: 'bg-brand-turquoise/20 text-brand-turquoise' },
  lost: { label: 'Perdu', color: 'bg-red-100 text-red-700' },
};

export default function ProspectsArchivesPage() {
  const [archivedProspects, setArchivedProspects] = useState<ArchivedProspect[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Charger les prospects archivés depuis Firestore
  useEffect(() => {
    loadArchivedProspects();
  }, []);

  const loadArchivedProspects = async () => {
    try {
      setLoading(true);
      const prospectsRef = collection(db, 'prospects');
      const q = query(prospectsRef, where('archived', '==', true));
      const querySnapshot = await getDocs(q);

      const loadedProspects: ArchivedProspect[] = [];
      querySnapshot.forEach((doc) => {
        loadedProspects.push({ id: doc.id, ...doc.data() } as ArchivedProspect);
      });

      // Trier par date d'archivage (plus récent en premier)
      loadedProspects.sort((a, b) => {
        const dateA = a.archivedAt?.toDate?.() || new Date(0);
        const dateB = b.archivedAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      setArchivedProspects(loadedProspects);
    } catch (error) {
      console.error('Erreur lors du chargement des archives:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrer selon la recherche
  const filteredProspects = archivedProspects.filter(p =>
    `${p.name} ${p.partner} ${p.email} ${p.notes || ''}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleRestore = async (id: string) => {
    try {
      setLoading(true);
      const prospectRef = doc(db, 'prospects', id);
      await updateDoc(prospectRef, {
        archived: false,
        archivedAt: null,
        updatedAt: serverTimestamp(),
      });

      // Retirer de la liste des archives
      setArchivedProspects(prev => prev.filter(p => p.id !== id));

      alert('Prospect restauré avec succès !');
    } catch (error) {
      console.error('Erreur lors de la restauration:', error);
      alert('Erreur lors de la restauration');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer définitivement ce prospect ? Cette action est irréversible.')) {
      return;
    }

    try {
      setLoading(true);
      const prospectRef = doc(db, 'prospects', id);
      await deleteDoc(prospectRef);

      // Retirer de la liste
      setArchivedProspects(prev => prev.filter(p => p.id !== id));

      alert('Prospect supprimé définitivement');
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('fr-FR');
    } catch {
      return 'N/A';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-brand-purple mb-2">
              Archives Prospects
            </h1>
            <p className="text-brand-gray">
              Consultez vos anciens prospects
            </p>
          </div>
          <Badge className="bg-gray-100 text-gray-700 px-4 py-2 text-base">
            <Archive className="h-4 w-4 mr-2" />
            {archivedProspects.length} prospects archivés
          </Badge>
        </div>

        <Card className="p-4 shadow-xl border-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-gray" />
            <Input
              placeholder="Rechercher dans les archives..."
              className="pl-10 border-[#E5E5E5] focus-visible:ring-brand-turquoise"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </Card>

        {loading && (
          <Card className="p-8 text-center text-brand-gray shadow-xl border-0">
            Chargement des archives...
          </Card>
        )}

        {!loading && (
          <div className="space-y-4">
            {filteredProspects.length > 0 ? (
              filteredProspects.map((p) => {
                const status = statusConfig[p.status];
                return (
                  <Card key={p.id} className="p-6 shadow-xl border-0 opacity-80 hover:opacity-100 transition-opacity">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-brand-purple">
                            {p.name} {p.partner}
                          </h3>
                          <Badge className={status.color}>
                            {status.label}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-brand-gray">
                          <div>
                            <span className="font-medium">Email:</span> {p.email}
                          </div>
                          <div>
                            <span className="font-medium">Date événement:</span> {p.eventDate}
                          </div>
                          {p.notes && (
                            <div>
                              <span className="font-medium">Motif:</span> {p.notes}
                            </div>
                          )}
                          <div>
                            <span className="font-medium">Archivé le:</span> {formatDate(p.archivedAt)}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-2 border-brand-turquoise text-brand-gray hover:bg-brand-turquoise hover:text-white gap-2"
                          onClick={() => handleRestore(p.id)}
                          disabled={loading}
                        >
                          <RefreshCcw className="h-3 w-3" />
                          Restaurer
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-2 border-red-300 text-red-600 hover:bg-red-500 hover:text-white gap-2"
                          onClick={() => handleDelete(p.id)}
                          disabled={loading}
                        >
                          <Trash2 className="h-3 w-3" />
                          Supprimer
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
            ) : (
              <Card className="p-6 shadow-xl border-0 text-center text-brand-gray">
                {search ? 'Aucun résultat trouvé.' : 'Aucun prospect archivé pour l\'instant.'}
              </Card>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}