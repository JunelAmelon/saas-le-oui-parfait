'use client';

import { useEffect, useMemo, useState } from 'react';
import { ClientDashboardLayout } from '@/components/layout/ClientDashboardLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Flower2, Loader2, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useClientData } from '@/contexts/ClientDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { addDocument, getDocuments } from '@/lib/db';
import { calculateDaysRemaining } from '@/lib/client-helpers';
import { toast } from 'sonner';

interface Composition {
  id: string;
  name: string;
  flowers?: string[];
  items?: Array<{ name: string; quantity: number; unit_price: number }>;
  cost?: number;
  price?: number;
  margin?: number;
  client_id: string;
  client_name?: string;
  planner_id: string;
  send_to_client?: boolean;
  created_at?: any;
}

export default function ClientFleursPage() {
  const { user } = useAuth();
  const { client, event, loading: dataLoading } = useClientData();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [compositions, setCompositions] = useState<Composition[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const ensureConversation = async () => {
    if (!user?.uid || !client?.id || !client?.planner_id) return null;
    const existing = await getDocuments('conversations', [{ field: 'client_id', operator: '==', value: client.id }]);
    const conv0 = (existing as any[])?.find((c) => c?.planner_id === client.planner_id) || (existing as any[])?.[0] || null;
    if (conv0?.id) return conv0;

    const created = await addDocument('conversations', {
      planner_id: client.planner_id,
      client_id: client.id,
      type: 'client',
      client_name: clientName,
      participants: [client.planner_id, user.uid],
      last_message: '',
      last_message_at: new Date(),
      unread_count_client: 0,
      unread_count_planner: 0,
      created_at: new Date(),
    });

    return { id: created.id };
  };

  const clientName = useMemo(() => {
    const n1 = client?.name || '';
    const n2 = client?.partner || '';
    return `${n1}${n1 && n2 ? ' & ' : ''}${n2}`.trim() || event?.couple_names || 'Client';
  }, [client?.name, client?.partner, event?.couple_names]);

  const daysRemaining = event ? calculateDaysRemaining(event.event_date) : 0;

  useEffect(() => {
    async function fetchCompositions() {
      if (!client?.id) {
        setCompositions([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const items = await getDocuments('compositions', [
          { field: 'client_id', operator: '==', value: client.id },
        ]);

        const visible = (items as any[]).filter((c) => Boolean(c?.send_to_client));
        const mapped = visible
          .map((c) => ({
            id: c.id,
            ...(c as any),
          }))
          .sort((a, b) => {
            const da = a?.created_at?.toDate?.()?.getTime?.() || 0;
            const db = b?.created_at?.toDate?.()?.getTime?.() || 0;
            return db - da;
          }) as Composition[];

        setCompositions(mapped);
      } catch (e) {
        console.error('Error fetching compositions:', e);
        toast.error('Erreur lors du chargement des compositions');
        setCompositions([]);
      } finally {
        setLoading(false);
      }
    }

    if (!dataLoading) {
      void fetchCompositions();
    }
  }, [client?.id, dataLoading]);

  const filtered = useMemo(() => {
    const s = searchTerm.trim().toLowerCase();
    if (!s) return compositions;
    return compositions.filter((c) => {
      const inName = (c.name || '').toLowerCase().includes(s);
      const inFlowers = (c.flowers || []).join(' ').toLowerCase().includes(s);
      return inName || inFlowers;
    });
  }, [compositions, searchTerm]);

  return (
    <ClientDashboardLayout clientName={clientName} daysRemaining={daysRemaining}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-purple flex items-center gap-2 sm:gap-3">
              <Flower2 className="h-6 w-6 sm:h-8 sm:w-8 text-brand-turquoise" />
              Compositions florales
            </h1>
            <p className="text-sm sm:text-base text-brand-gray mt-1">
              Retrouvez ici les compositions florales que votre wedding planner a partagées.
            </p>
          </div>
        </div>

        <Card className="p-4 shadow-xl border-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-gray" />
            <Input
              placeholder="Rechercher une composition..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-brand-turquoise" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-10 shadow-xl border-0 text-center">
            <Flower2 className="h-14 w-14 text-brand-gray mx-auto mb-4" />
            <h3 className="text-xl font-bold text-brand-purple mb-2">Aucune composition</h3>
            <p className="text-brand-gray">
              {searchTerm ? 'Aucun résultat pour votre recherche.' : 'Votre wedding planner n\'a pas encore partagé de composition.'}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filtered.map((composition) => (
              <Card key={composition.id} className="p-6 shadow-xl border-0">
                <div className="flex items-start gap-4 mb-4">
                  <Flower2 className="h-8 w-8 text-pink-500" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-brand-purple mb-1 truncate">
                      {composition.name}
                    </h3>
                    <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-gray-50">
                      <div>
                        <p className="text-xs text-brand-gray uppercase tracking-label mb-1">Coût</p>
                        <p className="text-lg font-bold text-brand-purple">{Number(composition.cost ?? 0)} €</p>
                      </div>
                      <div>
                        <p className="text-xs text-brand-gray uppercase tracking-label mb-1">Prix</p>
                        <p className="text-lg font-bold text-brand-purple">{Number(composition.price ?? 0)} €</p>
                      </div>
                      <div>
                        <p className="text-xs text-brand-gray uppercase tracking-label mb-1">Marge</p>
                        <p className="text-lg font-bold text-green-600">{Number(composition.margin ?? 0)} €</p>
                      </div>
                    </div>
                  </div>
                </div>

                {(composition.flowers && composition.flowers.length > 0) || (composition.items && composition.items.length > 0) ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-brand-purple">Détail</p>
                    <div className="flex flex-wrap gap-2">
                      {(composition.flowers || []).map((f, idx) => (
                        <Badge key={`f:${idx}`} variant="outline" className="border-pink-300 text-pink-700">
                          {f}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}

                {composition.price ? (
                  <div className="pt-4">
                    <Button
                      type="button"
                      className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
                      onClick={() => {
                        void (async () => {
                          try {
                            const conv = await ensureConversation();
                            if (!conv?.id) {
                              router.push('/espace-client/messages');
                              return;
                            }
                            router.push(`/espace-client/messages?conversationId=${encodeURIComponent(conv.id)}`);
                          } catch (e) {
                            console.error('Error ensuring conversation:', e);
                            toast.error('Impossible d\'ouvrir la conversation');
                            router.push('/espace-client/messages');
                          }
                        })();
                      }}
                    >
                      Contacter mon planner
                    </Button>
                  </div>
                ) : null}
              </Card>
            ))}
          </div>
        )}
      </div>
    </ClientDashboardLayout>
  );
}
