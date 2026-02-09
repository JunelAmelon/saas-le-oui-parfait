'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Loader2, Image as ImageIcon, ArrowLeft, ExternalLink } from 'lucide-react';
import { getDocuments } from '@/lib/db';
import { getEventGalleries, GalleryData } from '@/lib/client-helpers';

export default function ClientGalleryAdminPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [eventId, setEventId] = useState<string | null>(null);
  const [galleries, setGalleries] = useState<GalleryData[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAll() {
      if (!clientId) return;

      try {
        setLoading(true);

        const events = await getDocuments('events', [
          { field: 'client_id', operator: '==', value: clientId },
        ]);

        const ev = ((events as any[]) || []).find((x) => Boolean(x?.event_date)) || (events?.[0] as any) || null;
        const evId = ev?.id || null;
        setEventId(evId);

        if (!evId) {
          setGalleries([]);
          return;
        }

        const items = await getEventGalleries(evId);
        setGalleries(items);
      } catch (e) {
        console.error('Error fetching admin client gallery:', e);
        setGalleries([]);
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, [clientId]);

  const albums = useMemo(() => {
    return galleries
      .map((g) => ({
        id: g.id,
        name: g.name,
        count: (g.photos || []).length,
        coverUrl: (g.photos || [])?.[0]?.thumbnail_url || (g.photos || [])?.[0]?.url || undefined,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [galleries]);

  const photos = useMemo(() => {
    const all = galleries.flatMap((g) =>
      (g.photos || []).map((p) => ({
        ...p,
        albumId: g.id,
        albumName: g.name,
      }))
    );

    return selectedAlbumId ? all.filter((p: any) => p.albumId === selectedAlbumId) : all;
  }, [galleries, selectedAlbumId]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-brand-purple mb-2">Galerie</h1>
            <p className="text-brand-gray">Albums et photos envoyés par le client et/ou la wedding planner</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.back()} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Button>
          </div>
        </div>

        {loading ? (
          <Card className="p-10 shadow-xl border-0">
            <div className="flex items-center justify-center gap-3 text-brand-gray">
              <Loader2 className="h-5 w-5 animate-spin" />
              Chargement...
            </div>
          </Card>
        ) : !eventId ? (
          <Card className="p-10 shadow-xl border-0">
            <div className="text-center text-brand-gray">
              Aucun événement trouvé pour ce client.
            </div>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <Card
                className={`p-4 cursor-pointer transition-all hover:shadow-lg ${
                  !selectedAlbumId ? 'ring-2 ring-brand-turquoise' : ''
                }`}
                onClick={() => setSelectedAlbumId(null)}
              >
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-brand-turquoise/10 flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-brand-turquoise" />
                  </div>
                  <p className="font-medium text-brand-purple">Tous</p>
                  <p className="text-xs text-brand-gray">{galleries.reduce((sum, g) => sum + (g.photos || []).length, 0)} photos</p>
                </div>
              </Card>

              {albums.map((album) => (
                <Card
                  key={album.id}
                  className={`p-4 cursor-pointer transition-all hover:shadow-lg ${
                    selectedAlbumId === album.id ? 'ring-2 ring-brand-turquoise' : ''
                  }`}
                  onClick={() => setSelectedAlbumId(album.id)}
                >
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                      {album.coverUrl ? (
                        <img src={album.coverUrl} alt={album.name} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-brand-gray" />
                      )}
                    </div>
                    <p className="font-medium text-brand-purple text-sm">{album.name}</p>
                    <p className="text-xs text-brand-gray">{album.count} photos</p>
                  </div>
                </Card>
              ))}
            </div>

            <Card className="p-6 shadow-xl border-0">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-brand-purple">
                    {selectedAlbumId
                      ? albums.find((a) => a.id === selectedAlbumId)?.name || 'Album'
                      : 'Toutes les photos'}
                  </h2>
                  <p className="text-sm text-brand-gray">{photos.length} photos</p>
                </div>
              </div>

              {photos.length === 0 ? (
                <div className="text-center py-12 text-brand-gray">Aucune photo</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {photos.map((p: any) => (
                    <div key={p.id} className="group relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                      <img src={p.url} alt={p.id} className="w-full h-full object-cover" />
                      <div className="absolute inset-x-0 bottom-0 bg-black/50 text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{p.albumName}</p>
                            <div className="flex items-center gap-2 text-[11px] opacity-90">
                              <Badge className="bg-white/20 text-white hover:bg-white/20" variant="secondary">
                                {p.uploaded_by === 'client' ? 'Client' : 'Planner'}
                              </Badge>
                              {p.liked ? <span>❤️</span> : null}
                            </div>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-white hover:bg-white/10"
                            onClick={() => window.open(p.url, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
