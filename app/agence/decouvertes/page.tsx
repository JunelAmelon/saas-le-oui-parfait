'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { getDocuments, getDocument } from '@/lib/db';
import { DiscoveryFormData } from '@/lib/discovery';
import { Search, Plus, Loader2, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface DiscoveryListItem extends DiscoveryFormData {
  id: string;
  clientName?: string;
}

const statusConfig: Record<string, { label: string; color: string; tab: string }> = {
  draft: { label: 'Brouillon', color: 'text-orange-500 bg-orange-50 border-orange-200', tab: 'border-orange-400 bg-orange-400' },
  completed: { label: 'Terminé', color: 'text-brand-turquoise bg-brand-turquoise/10 border-brand-turquoise/30', tab: 'border-brand-turquoise bg-brand-turquoise' },
  converted: { label: 'Converti en client', color: 'text-green-600 bg-green-50 border-green-200', tab: 'border-green-500 bg-green-500' },
};

function formatCallDate(iso?: string) {
  if (!iso) return '—';
  try {
    const [yyyy, mm, dd] = iso.split('-');
    if (yyyy && mm && dd) return `${dd}/${mm}/${yyyy}`;
    return iso;
  } catch {
    return iso;
  }
}

export default function DiscoveryListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientIdFilter = searchParams.get('clientId');
  const { user, loading: authLoading } = useAuth();
  const [forms, setForms] = useState<DiscoveryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchForms() {
      if (!user?.uid) return;
      try {
        let filters: { field: string; operator: any; value: any }[] = [
          { field: 'planner_id', operator: '==', value: user.uid },
        ];
        if (clientIdFilter) {
          filters = [{ field: 'client_id', operator: '==', value: clientIdFilter }];
        }
        const items = await getDocuments('discovery_forms', filters);

        const mapped = await Promise.all(
          (items as any[]).map(async (it) => {
            const form = { ...it } as DiscoveryListItem;
            if (form.client_id) {
              const client = await getDocument('clients', form.client_id).catch(() => null);
              if (client) {
                const c = client as any;
                form.clientName = `${c.name || ''} & ${c.partner || ''}`.trim();
              }
            }
            return form;
          })
        );

        mapped.sort((a, b) => {
          const da = a.callDate || '';
          const db = b.callDate || '';
          return db.localeCompare(da);
        });

        setForms(mapped);
      } catch (e) {
        console.error('Error fetching discovery forms:', e);
        toast.error('Erreur lors du chargement des fiches découverte');
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) fetchForms();
  }, [user, authLoading, clientIdFilter]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return forms;
    return forms.filter(
      (f) =>
        `${f.name} ${f.partner}`.toLowerCase().includes(q) ||
        f.email.toLowerCase().includes(q) ||
        f.phone.toLowerCase().includes(q)
    );
  }, [forms, searchQuery]);

  const groups = useMemo(() => {
    const order: string[] = ['draft', 'completed', 'converted'];
    const map: Record<string, DiscoveryListItem[]> = {};
    for (const s of order) map[s] = [];
    for (const f of filtered) {
      const key = f.status || 'draft';
      if (!map[key]) map[key] = [];
      map[key].push(f);
    }
    return order.map((key) => ({ key, ...statusConfig[key], items: map[key] })).filter((g) => g.items.length > 0);
  }, [filtered]);

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-12 w-12 animate-spin text-brand-turquoise" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 px-4 sm:px-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-purple mb-1 font-baskerville">
              Fiches Découverte
            </h1>
            <p className="text-sm sm:text-base text-brand-gray">
              Gérez les fiches de premier appel prospects et clients
            </p>
          </div>
          <Button
            className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2 w-full sm:w-auto"
            onClick={() => router.push('/agence/decouvertes/nouveau')}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nouvelle fiche</span>
            <span className="sm:hidden">Nouveau</span>
          </Button>
        </div>

        <Card className="p-4 shadow-xl border-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-gray" />
            <Input
              placeholder="Rechercher un prospect ou client..."
              className="pl-10 border-[#E5E5E5] focus-visible:ring-brand-turquoise"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </Card>

        {filtered.length === 0 ? (
          <Card className="p-12 text-center shadow-xl border-0">
            <h3 className="text-lg font-semibold text-brand-purple mb-2">
              {searchQuery ? 'Aucun résultat' : 'Aucune fiche découverte'}
            </h3>
            <p className="text-brand-gray mb-6">
              {searchQuery ? 'Essayez une autre recherche' : 'Créez votre première fiche de premier appel'}
            </p>
            <Button
              onClick={() => router.push('/agence/decouvertes/nouveau')}
              className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
            >
              <Plus className="h-4 w-4 mr-2" />
              Créer une fiche
            </Button>
          </Card>
        ) : (
          <div className="space-y-8">
            {groups.map((group) => (
              <div key={group.key} className="space-y-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-brand-purple font-baskerville">{group.label}</h2>
                  <Badge className={group.color}>{group.items.length}</Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {group.items.map((form) => (
                    <div
                      key={form.id}
                      className="group relative cursor-pointer"
                      onClick={() => router.push(`/agence/decouvertes/${form.id}`)}
                    >
                      <div className={`absolute -top-2 left-4 h-4 w-20 rounded-t-md ${group.tab}`} />
                      <Card className="pt-5 pb-4 px-4 shadow-md border-0 hover:shadow-xl transition-all h-full flex flex-col">
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="text-base font-bold text-brand-purple font-baskerville line-clamp-2">
                              {form.name || 'Prospect'}
                              {form.partner ? ` & ${form.partner}` : ''}
                            </h3>
                            <Eye className="h-4 w-4 text-brand-gray opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          </div>
                          <p className="text-xs text-brand-gray mb-3">
                            Appel du {formatCallDate(form.callDate)}
                          </p>
                          {(form.email || form.phone) && (
                            <div className="space-y-1 text-xs text-brand-purple/80 mb-3">
                              {form.email && <p className="truncate">{form.email}</p>}
                              {form.phone && <p>{form.phone}</p>}
                            </div>
                          )}
                          {form.clientName && (
                            <p className="text-xs text-brand-turquoise mb-2">Lié à {form.clientName}</p>
                          )}
                        </div>
                        <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                          <Badge className={group.color}>{group.label}</Badge>
                          {form.type === 'client' || form.client_id ? (
                            <Badge variant="outline" className="text-xs">Client</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Prospect</Badge>
                          )}
                        </div>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
