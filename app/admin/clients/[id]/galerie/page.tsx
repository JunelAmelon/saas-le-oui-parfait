'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Loader2, Image as ImageIcon, ArrowLeft, ExternalLink, Upload } from 'lucide-react';
import { addDocument, getDocument, getDocuments, updateDocument } from '@/lib/db';
import { getEventGalleries, GalleryData } from '@/lib/client-helpers';
import { uploadImage } from '@/lib/storage';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function ClientGalleryAdminPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [eventId, setEventId] = useState<string | null>(null);
  const [galleries, setGalleries] = useState<GalleryData[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedUploadAlbumId, setSelectedUploadAlbumId] = useState('');
  const [newAlbumName, setNewAlbumName] = useState('');
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

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
          const fallback = await getDocuments('galleries', [
            { field: 'client_id', operator: '==', value: clientId },
          ]).catch(() => []);
          setGalleries((fallback as any) as GalleryData[]);
          return;
        }

        const itemsByEvent = await getEventGalleries(evId);
        const itemsByClient = await getDocuments('galleries', [
          { field: 'client_id', operator: '==', value: clientId },
        ]).catch(() => []);

        const merged = new Map<string, GalleryData>();
        (itemsByEvent || []).forEach((g) => merged.set(g.id, g));
        (itemsByClient as any[]).forEach((g: any) => {
          if (g?.id && !merged.has(g.id)) merged.set(g.id, g as GalleryData);
        });

        setGalleries(Array.from(merged.values()));
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
    const getPhotoUrls = (p: any) => {
      if (typeof p === 'string') {
        const url = String(p || '').trim();
        return { url, thumb: '' };
      }
      const url =
        p?.url ||
        p?.file_url ||
        p?.fileUrl ||
        p?.secure_url ||
        p?.secureUrl ||
        p?.photo_url ||
        p?.photoUrl ||
        p?.image_url ||
        p?.imageUrl ||
        '';
      const thumb =
        p?.thumbnail_url ||
        p?.thumbnailUrl ||
        p?.thumb_url ||
        p?.thumbUrl ||
        '';
      return { url: String(url || ''), thumb: String(thumb || '') };
    };

    return galleries
      .map((g) => ({
        id: g.id,
        name: g.name,
        count: (g.photos || []).length,
        coverUrl: (() => {
          const first = (g.photos || [])?.[0] as any;
          if (!first) return undefined;
          const u = getPhotoUrls(first);
          return u.thumb || u.url || undefined;
        })(),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [galleries]);

  const handleUpload = async () => {
    if (!clientId) {
      toast.error('Client introuvable');
      return;
    }
    if (uploadFiles.length === 0) {
      toast.error('Sélectionnez au moins une image');
      return;
    }

    const creatingNew = selectedUploadAlbumId === 'new';
    if (!selectedUploadAlbumId) {
      toast.error('Veuillez sélectionner un album');
      return;
    }
    if (creatingNew && !newAlbumName.trim()) {
      toast.error("Veuillez saisir le nom du nouvel album");
      return;
    }

    setUploading(true);
    try {
      const clientDoc = await getDocument('clients', clientId).catch(() => null);

      let albumId = selectedUploadAlbumId;
      if (creatingNew) {
        const created = await addDocument('galleries', {
          event_id: eventId || '',
          client_id: clientId,
          planner_id: (clientDoc as any)?.planner_id || (clientDoc as any)?.owner_id || '',
          name: newAlbumName.trim(),
          description: '',
          cover: '',
          count: 0,
          photos: [],
          created_at: new Date().toISOString(),
        });
        albumId = created.id;
      }

      const albumDoc = await getDocument('galleries', albumId);
      if (!albumDoc) {
        toast.error('Album introuvable');
        return;
      }

      const existingPhotos = ((albumDoc as any).photos || []) as any[];
      const newPhotos: any[] = [];

      for (const f of uploadFiles) {
        const url = await uploadImage(f, 'gallery');
        newPhotos.push({
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          url,
          uploaded_by: 'planner',
          uploaded_at: new Date().toISOString(),
          liked: false,
          album: (albumDoc as any).name,
          date: new Date().toLocaleDateString('fr-FR'),
        });
      }

      const updatedPhotos = [...newPhotos, ...existingPhotos];

      await updateDocument('galleries', albumId, {
        photos: updatedPhotos,
        count: updatedPhotos.length,
        cover: updatedPhotos[0]?.url || (albumDoc as any).cover || '',
      });

      const [itemsByEvent, itemsByClient] = await Promise.all([
        eventId ? getEventGalleries(eventId) : Promise.resolve([]),
        getDocuments('galleries', [{ field: 'client_id', operator: '==', value: clientId }]).catch(() => []),
      ]);

      const merged = new Map<string, GalleryData>();
      (itemsByEvent || []).forEach((g) => merged.set(g.id, g));
      (itemsByClient as any[]).forEach((g: any) => {
        if (g?.id && !merged.has(g.id)) merged.set(g.id, g as GalleryData);
      });
      setGalleries(Array.from(merged.values()));

      setIsUploadModalOpen(false);
      setSelectedUploadAlbumId('');
      setNewAlbumName('');
      setUploadFiles([]);
      toast.success('Photos ajoutées');
    } catch (e) {
      console.error('Error uploading admin gallery photos:', e);
      toast.error("Erreur lors de l'upload des photos");
    } finally {
      setUploading(false);
    }
  };

  const photos = useMemo(() => {
    const getPhotoUrls = (p: any) => {
      if (typeof p === 'string') {
        const url = String(p || '').trim();
        return { url, thumb: '' };
      }
      const url =
        p?.url ||
        p?.file_url ||
        p?.fileUrl ||
        p?.secure_url ||
        p?.secureUrl ||
        p?.photo_url ||
        p?.photoUrl ||
        p?.image_url ||
        p?.imageUrl ||
        '';
      const thumb =
        p?.thumbnail_url ||
        p?.thumbnailUrl ||
        p?.thumb_url ||
        p?.thumbUrl ||
        '';
      return { url: String(url || ''), thumb: String(thumb || '') };
    };

    const all = galleries.flatMap((g) =>
      (g.photos || [])
        .map((p: any) => {
          const u = getPhotoUrls(p);
          const displayUrl = u.url || u.thumb;
          if (!displayUrl) return null;
          return {
            ...p,
            albumId: g.id,
            albumName: g.name,
            displayUrl,
            displayThumbUrl: u.thumb || undefined,
          };
        })
        .filter(Boolean)
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
            <Button
              className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2"
              onClick={() => setIsUploadModalOpen(true)}
              disabled={loading}
            >
              <Upload className="h-4 w-4" />
              Ajouter des photos
            </Button>
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
                        <img
                          src={album.coverUrl}
                          alt={album.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const img = e.currentTarget as HTMLImageElement;
                            const fallback = img.dataset.fallback || '';
                            if (fallback && img.src !== fallback) img.src = fallback;
                          }}
                          data-fallback={album.coverUrl}
                        />
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
                      <img
                        src={p.displayThumbUrl || p.displayUrl}
                        alt={p.id}
                        className="w-full h-full object-cover"
                        data-fallback={p.displayUrl}
                        onError={(e) => {
                          const img = e.currentTarget as HTMLImageElement;
                          const fallback = img.dataset.fallback || '';
                          if (fallback && img.src !== fallback) img.src = fallback;
                        }}
                      />
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

      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="sm:max-w-lg w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-brand-purple">Ajouter des photos</DialogTitle>
            <DialogDescription>
              Importez des images dans un album existant ou créez-en un nouveau.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Album</Label>
              <Select value={selectedUploadAlbumId} onValueChange={setSelectedUploadAlbumId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un album" />
                </SelectTrigger>
                <SelectContent>
                  {albums.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="new">+ Nouvel album</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedUploadAlbumId === 'new' && (
              <div className="space-y-2">
                <Label>Nom du nouvel album</Label>
                <Input value={newAlbumName} onChange={(e) => setNewAlbumName(e.target.value)} />
              </div>
            )}

            <div className="space-y-2">
              <Label>Photos</Label>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setUploadFiles(Array.from(e.target.files || []))}
              />
              <p className="text-xs text-brand-gray">{uploadFiles.length} fichier(s) sélectionné(s)</p>
            </div>
          </div>

          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setIsUploadModalOpen(false)}
              disabled={uploading}
            >
              Annuler
            </Button>
            <Button
              className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2"
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
