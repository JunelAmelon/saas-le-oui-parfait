'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClientDashboardLayout } from '@/components/layout/ClientDashboardLayout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Image as ImageIcon,
  Upload,
  Download,
  Heart,
  Grid,
  List,
  X,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useClientData } from '@/contexts/ClientDataContext';
import { calculateDaysRemaining, getEventGalleries, GalleryData } from '@/lib/client-helpers';
import { addDocument, getDocument, getDocuments, updateDocument } from '@/lib/db';
import { uploadImage } from '@/lib/storage';
import { toast } from 'sonner';

type GalleryPhoto = {
  id: string;
  url: string;
  thumbnail_url?: string;
  uploaded_by: 'client' | 'planner';
  uploaded_at: any;
  liked: boolean;
  album?: string;
  date?: string;
};

type PhotoWithAlbum = GalleryPhoto & {
  albumId: string;
  albumName: string;
  displayUrl: string;
  displayThumbUrl?: string;
};

export default function GaleriePage() {
  const { client, event, loading: dataLoading } = useClientData();

  const [effectiveEventId, setEffectiveEventId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [galleries, setGalleries] = useState<GalleryData[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [likedPhotos, setLikedPhotos] = useState<string[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedUploadAlbumId, setSelectedUploadAlbumId] = useState('');
  const [newAlbumName, setNewAlbumName] = useState('');
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  const clientName = useMemo(() => {
    const n1 = client?.name || '';
    const n2 = client?.partner || '';
    return `${n1}${n1 && n2 ? ' & ' : ''}${n2}`.trim() || event?.couple_names || 'Client';
  }, [client?.name, client?.partner, event?.couple_names]);

  const daysRemaining = event ? calculateDaysRemaining(event.event_date) : 0;

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

  const allPhotos: PhotoWithAlbum[] = useMemo(() => {
    const result: PhotoWithAlbum[] = [];
    for (const g of galleries) {
      const photos = (g.photos || []) as any[];
      for (const p of photos) {
        const u = getPhotoUrls(p);
        const displayUrl = u.url || u.thumb;
        if (!displayUrl) continue;
        result.push({
          ...(p as GalleryPhoto),
          albumId: g.id,
          albumName: g.name,
          displayUrl,
          displayThumbUrl: u.thumb || undefined,
        });
      }
    }
    return result;
  }, [galleries]);

  useEffect(() => {
    setEffectiveEventId(event?.id || null);
  }, [event?.id]);

  useEffect(() => {
    async function fetchFallbackEventId() {
      if (event?.id) return;
      if (!client?.id) return;
      try {
        const items = await getDocuments('events', [
          { field: 'client_id', operator: '==', value: client.id },
        ]);
        const ev = (items as any[])?.find((x) => Boolean(x?.event_date)) || (items as any[])?.[0] || null;
        setEffectiveEventId(ev?.id || null);
      } catch {
        setEffectiveEventId(null);
      }
    }

    if (!dataLoading) {
      void fetchFallbackEventId();
    }
  }, [client?.id, dataLoading, event?.id]);

  useEffect(() => {
    async function fetchGalleries() {
      const evId = effectiveEventId;
      try {
        setLoading(true);
        const [itemsByEvent, itemsByClient] = await Promise.all([
          evId ? getEventGalleries(evId) : Promise.resolve([]),
          client?.id
            ? ((await getDocuments('galleries', [{ field: 'client_id', operator: '==', value: client.id }])) as GalleryData[])
            : Promise.resolve([] as GalleryData[]),
        ]);

        const merged = new Map<string, GalleryData>();
        (itemsByEvent || []).forEach((g) => merged.set(g.id, g));
        (itemsByClient || []).forEach((g) => {
          if (!merged.has(g.id)) merged.set(g.id, g);
        });

        const items = Array.from(merged.values());
        setGalleries(items);
        const liked = items
          .flatMap((g) => (g.photos || []).map((p: any) => (p.liked ? p.id : null)))
          .filter(Boolean) as string[];
        setLikedPhotos(liked);
      } catch (e) {
        console.error('Error fetching galleries:', e);
        toast.error('Erreur lors du chargement de la galerie');
      } finally {
        setLoading(false);
      }
    }

    if (!dataLoading) {
      fetchGalleries();
    }
  }, [effectiveEventId, dataLoading, client?.id]);

  const filteredPhotos = selectedAlbumId
    ? allPhotos.filter((p) => p.albumId === selectedAlbumId)
    : allPhotos;

  const albums = useMemo(() => {
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
    if (!client?.id) {
      toast.error('Client introuvable');
      return;
    }
    if (uploadFiles.length === 0) {
      toast.error('Sélectionnez au moins une image');
      return;
    }

    const creatingNew = selectedUploadAlbumId === 'new';
    if (creatingNew && !newAlbumName.trim()) {
      toast.error("Veuillez saisir le nom du nouvel album");
      return;
    }

    setUploading(true);
    try {
      let albumId = selectedUploadAlbumId;
      if (creatingNew) {
        const created = await addDocument('galleries', {
          event_id: effectiveEventId || '',
          client_id: client.id,
          planner_id: client.planner_id,
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

      const existingPhotos = ((albumDoc as any).photos || []) as GalleryPhoto[];
      const newPhotos: GalleryPhoto[] = [];

      for (const f of uploadFiles) {
        const url = await uploadImage(f, 'gallery');
        newPhotos.push({
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          url,
          uploaded_by: 'client',
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
        effectiveEventId ? getEventGalleries(effectiveEventId) : Promise.resolve([]),
        getDocuments('galleries', [{ field: 'client_id', operator: '==', value: client.id }]).catch(() => []),
      ]);

      const merged = new Map<string, GalleryData>();
      (itemsByEvent || []).forEach((g) => merged.set(g.id, g));
      (itemsByClient as any[]).forEach((g: any) => {
        if (g?.id && !merged.has(g.id)) merged.set(g.id, g as GalleryData);
      });

      setGalleries(Array.from(merged.values()));

      setIsUploadModalOpen(false);
      setIsSuccessModalOpen(true);
      setSelectedUploadAlbumId('');
      setNewAlbumName('');
      setUploadFiles([]);
    } catch (e) {
      console.error('Error uploading photos:', e);
      toast.error("Erreur lors de l'upload des photos");
    } finally {
      setUploading(false);
    }
  };

  const navigatePhoto = (direction: 'prev' | 'next') => {
    const currentIndex = filteredPhotos.findIndex((p) => p.id === selectedPhoto);
    if (direction === 'prev' && currentIndex > 0) {
      setSelectedPhoto(filteredPhotos[currentIndex - 1].id);
    } else if (direction === 'next' && currentIndex < filteredPhotos.length - 1) {
      setSelectedPhoto(filteredPhotos[currentIndex + 1].id);
    }
  };

  const toggleLike = async (photoId: string) => {
    const photo = allPhotos.find((p) => p.id === photoId);
    if (!photo) return;

    const nextLiked = !likedPhotos.includes(photoId);
    setLikedPhotos((prev) => (nextLiked ? [...prev, photoId] : prev.filter((id) => id !== photoId)));

    try {
      const albumDoc = await getDocument('galleries', photo.albumId);
      if (!albumDoc) return;
      const photosArr = ((albumDoc as any).photos || []) as any[];
      const updated = photosArr.map((p) => (p.id === photoId ? { ...p, liked: nextLiked } : p));
      await updateDocument('galleries', photo.albumId, { photos: updated });
    } catch (e) {
      console.error('Error toggling like:', e);
    }
  };

  return (
    <ClientDashboardLayout clientName={clientName} daysRemaining={daysRemaining}>
      <div className="space-y-6">

        {/* ---------- HERO ---------- */}
        <div className="relative overflow-hidden rounded-3xl bg-brand-purple px-7 py-9 sm:px-10 sm:py-11">
          <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full bg-brand-turquoise/10 blur-3xl pointer-events-none" />
          <svg
            className="absolute right-6 top-1/2 -translate-y-1/2 opacity-[0.12] pointer-events-none hidden sm:block"
            width="140" height="140" viewBox="0 0 100 100" fill="none"
          >
            <path d="M50 5 L56 44 L95 50 L56 56 L50 95 L44 56 L5 50 L44 44 Z" fill="white" />
          </svg>

          <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <span className="inline-block text-[10px] tracking-label uppercase text-brand-purple bg-white/90 px-3 py-1.5 rounded-full mb-4">
                Galerie
              </span>
              <h1 className="font-baskerville text-3xl sm:text-4xl text-brand-beige mb-2">
                Vos inspirations et souvenirs
              </h1>
              <p className="text-brand-beige/60 text-sm">
                {allPhotos.length} photo{allPhotos.length > 1 ? 's' : ''} · {albums.length} album{albums.length > 1 ? 's' : ''}
              </p>
            </div>

            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex items-center justify-between gap-3 w-full sm:w-auto bg-[#2E2937] hover:bg-[#221f2a] text-white text-sm font-semibold pl-5 pr-1.5 py-1.5 rounded-full transition-colors shrink-0"
            >
              Ajouter des photos
              <span className="w-8 h-8 rounded-full bg-brand-turquoise flex items-center justify-center shrink-0">
                <Upload className="w-3.5 h-3.5 text-white" />
              </span>
            </button>
          </div>
        </div>

        {/* ---------- ALBUMS EN PILULES AVATAR ---------- */}
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setSelectedAlbumId(null)}
            className={`shrink-0 flex items-center gap-2.5 pl-2 pr-4 py-2 rounded-full border transition-all ${
              !selectedAlbumId
                ? 'bg-brand-purple text-white border-brand-purple'
                : 'bg-white text-brand-purple border-brand-purple/15 hover:border-brand-purple/30'
            }`}
          >
            <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${!selectedAlbumId ? 'bg-white/15' : 'bg-brand-purple/8'}`}>
              <Grid className={`w-3.5 h-3.5 ${!selectedAlbumId ? 'text-white' : 'text-brand-purple'}`} />
            </span>
            <span className="text-sm font-medium">Tous</span>
            <span className={`text-[10px] ${!selectedAlbumId ? 'text-white/70' : 'text-brand-gray/60'}`}>{allPhotos.length}</span>
          </button>

          {albums.map((album) => {
            const active = selectedAlbumId === album.id;
            return (
              <button
                key={album.id}
                onClick={() => setSelectedAlbumId(album.id)}
                className={`shrink-0 flex items-center gap-2.5 pl-2 pr-4 py-2 rounded-full border transition-all ${
                  active
                    ? 'bg-brand-purple text-white border-brand-purple'
                    : 'bg-white text-brand-purple border-brand-purple/15 hover:border-brand-purple/30'
                }`}
              >
                <span className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-brand-beige flex items-center justify-center">
                  {album.coverUrl ? (
                    <img src={album.coverUrl} alt={album.name} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-3.5 h-3.5 text-brand-gray" />
                  )}
                </span>
                <span className="text-sm font-medium truncate max-w-[120px]">{album.name}</span>
                <span className={`text-[10px] ${active ? 'text-white/70' : 'text-brand-gray/60'}`}>{album.count}</span>
              </button>
            );
          })}
        </div>

        {/* ---------- CONTENU ---------- */}
        <Card className="p-6 sm:p-8 border border-brand-purple/8 shadow-sm rounded-3xl bg-white">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-baskerville text-xl text-brand-purple">
                {selectedAlbumId ? (albums.find((a) => a.id === selectedAlbumId)?.name || 'Album') : 'Toutes les photos'}
              </h2>
              <p className="text-xs text-brand-gray mt-0.5">{filteredPhotos.length} photos</p>
            </div>
            <div className="flex items-center gap-1 bg-brand-beige rounded-full p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  viewMode === 'grid' ? 'bg-brand-turquoise text-white' : 'text-brand-gray hover:text-brand-purple'
                }`}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  viewMode === 'list' ? 'bg-brand-turquoise text-white' : 'text-brand-gray hover:text-brand-purple'
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 text-brand-gray py-16">
              <Loader2 className="h-5 w-5 animate-spin text-brand-turquoise" />
              Chargement de la galerie...
            </div>
          ) : filteredPhotos.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-14 h-14 rounded-full bg-brand-purple/8 flex items-center justify-center mx-auto mb-4">
                <ImageIcon className="h-6 w-6 text-brand-purple" />
              </div>
              <p className="text-brand-gray text-sm">Aucune photo pour le moment</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative group aspect-square rounded-2xl overflow-hidden cursor-pointer bg-brand-beige"
                  onClick={() => setSelectedPhoto(photo.id)}
                >
                  <img
                    src={photo.displayThumbUrl || photo.displayUrl}
                    alt={`Photo ${photo.id}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    data-fallback={photo.displayUrl}
                    onError={(e) => {
                      const img = e.currentTarget as HTMLImageElement;
                      const fallback = img.dataset.fallback || '';
                      if (fallback && img.src !== fallback) img.src = fallback;
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3">
                    <ZoomIn className="h-5 w-5 text-white" />
                  </div>
                  <button
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/85 backdrop-blur flex items-center justify-center transition-transform hover:scale-110"
                    onClick={(e) => {
                      e.stopPropagation();
                      void toggleLike(photo.id);
                    }}
                  >
                    <Heart
                      className={`h-4 w-4 ${
                        likedPhotos.includes(photo.id) ? 'text-brand-turquoise-hover fill-brand-turquoise' : 'text-brand-gray'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="flex items-center gap-4 p-3 rounded-2xl bg-brand-beige/60 hover:bg-brand-beige transition-colors"
                >
                  <img
                    src={photo.displayThumbUrl || photo.displayUrl}
                    alt={`Photo ${photo.id}`}
                    className="w-16 h-16 rounded-xl object-cover shrink-0"
                    data-fallback={photo.displayUrl}
                    onError={(e) => {
                      const img = e.currentTarget as HTMLImageElement;
                      const fallback = img.dataset.fallback || '';
                      if (fallback && img.src !== fallback) img.src = fallback;
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-brand-purple text-sm">Photo {photo.id.slice(0, 8)}</p>
                    <p className="text-xs text-brand-gray mt-0.5">{photo.albumName} · {photo.date || ''}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => void toggleLike(photo.id)}
                      className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white transition-colors"
                    >
                      <Heart
                        className={`h-4 w-4 ${
                          likedPhotos.includes(photo.id) ? 'text-brand-turquoise-hover fill-brand-turquoise' : 'text-brand-gray'
                        }`}
                      />
                    </button>
                    <a
                      href={photo.displayUrl}
                      download
                      className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white transition-colors"
                    >
                      <Download className="h-4 w-4 text-brand-turquoise-hover" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ---------- LIGHTBOX ---------- */}
        {selectedPhoto && (
          <div className="fixed inset-0 z-50 bg-brand-purple/95 backdrop-blur-sm flex items-center justify-center">
            <button
              className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              onClick={() => setSelectedPhoto(null)}
            >
              <X className="h-5 w-5" />
            </button>
            <button
              className="absolute left-5 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              onClick={() => navigatePhoto('prev')}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <img
              src={filteredPhotos.find((p) => p.id === selectedPhoto)?.displayUrl}
              alt="Photo agrandie"
              className="max-w-[85vw] max-h-[80vh] rounded-2xl object-contain shadow-2xl"
            />
            <button
              className="absolute right-5 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              onClick={() => navigatePhoto('next')}
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>
        )}

        {/* ---------- MODAL UPLOAD ---------- */}
        <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
          <DialogContent className="sm:max-w-md rounded-3xl">
            <DialogHeader>
              <DialogTitle className="font-baskerville text-2xl text-brand-purple">Ajouter des photos</DialogTitle>
              <DialogDescription>
                Téléchargez vos photos et choisissez un album
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="border-2 border-dashed border-brand-purple/15 rounded-2xl p-8 text-center hover:border-brand-turquoise transition-colors bg-brand-beige/40">
                <div className="w-12 h-12 rounded-full bg-brand-turquoise/15 flex items-center justify-center mx-auto mb-3">
                  <Upload className="h-5 w-5 text-brand-turquoise-hover" />
                </div>
                <p className="text-sm text-brand-gray">
                  Glissez vos photos ici ou cliquez pour parcourir
                </p>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => setUploadFiles(Array.from(e.target.files || []))}
                  className="mt-4 w-full text-sm text-brand-gray file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-turquoise file:text-white hover:file:bg-brand-turquoise-hover"
                />
                {uploadFiles.length ? (
                  <p className="text-xs text-brand-gray mt-2">{uploadFiles.length} fichier(s) sélectionné(s)</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] tracking-label uppercase text-brand-gray">Album de destination</Label>
                <Select value={selectedUploadAlbumId} onValueChange={setSelectedUploadAlbumId}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Choisir un album" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">+ Nouvel album</SelectItem>
                    {albums.map((album) => (
                      <SelectItem key={album.id} value={album.id}>
                        {album.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedUploadAlbumId === 'new' ? (
                <div className="space-y-2">
                  <Label className="text-[10px] tracking-label uppercase text-brand-gray">Nom du nouvel album</Label>
                  <Input
                    value={newAlbumName}
                    onChange={(e) => setNewAlbumName(e.target.value)}
                    placeholder="Ex: Inspiration"
                    className="rounded-xl"
                  />
                </div>
              ) : null}
            </div>
            <DialogFooter>
              <Button variant="outline" className="rounded-full" onClick={() => setIsUploadModalOpen(false)}>
                Annuler
              </Button>
              <Button
                className="bg-brand-turquoise hover:bg-brand-turquoise-hover rounded-full"
                onClick={() => void handleUpload()}
                disabled={uploading || !selectedUploadAlbumId || uploadFiles.length === 0 || (selectedUploadAlbumId === 'new' && !newAlbumName.trim())}
              >
                {uploading ? 'Upload...' : 'Télécharger'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ---------- SUCCÈS ---------- */}
        <Dialog open={isSuccessModalOpen} onOpenChange={setIsSuccessModalOpen}>
          <DialogContent className="sm:max-w-md text-center rounded-3xl">
            <div className="flex flex-col items-center py-6">
              <div className="w-16 h-16 bg-brand-turquoise/15 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-7 w-7 text-brand-turquoise-hover" />
              </div>
              <DialogTitle className="font-baskerville text-brand-purple text-xl">Photos ajoutées !</DialogTitle>
              <DialogDescription className="mt-2">
                Vos photos ont été ajoutées avec succès à l&apos;album.
              </DialogDescription>
            </div>
            <DialogFooter className="justify-center">
              <Button
                className="bg-brand-turquoise hover:bg-brand-turquoise-hover rounded-full"
                onClick={() => setIsSuccessModalOpen(false)}
              >
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ClientDashboardLayout>
  );
}