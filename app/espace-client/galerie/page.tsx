'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  FolderOpen,
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
import { addDocument, getDocument, updateDocument } from '@/lib/db';
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
};


export default function GaleriePage() {
  const { client, event, loading: dataLoading } = useClientData();

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

  const allPhotos: PhotoWithAlbum[] = useMemo(() => {
    const result: PhotoWithAlbum[] = [];
    for (const g of galleries) {
      const photos = (g.photos || []) as any[];
      for (const p of photos) {
        result.push({
          ...(p as GalleryPhoto),
          albumId: g.id,
          albumName: g.name,
        });
      }
    }
    return result;
  }, [galleries]);

  useEffect(() => {
    async function fetchGalleries() {
      if (!event?.id) {
        setGalleries([]);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const items = await getEventGalleries(event.id);
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
  }, [event?.id, dataLoading]);

  const filteredPhotos = selectedAlbumId
    ? allPhotos.filter((p) => p.albumId === selectedAlbumId)
    : allPhotos;

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

  const handleUpload = async () => {
    if (!client?.id || !event?.id) {
      toast.error('Client / événement introuvable');
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
          event_id: event.id,
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

      const items = await getEventGalleries(event.id);
      setGalleries(items);

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
    const currentIndex = filteredPhotos.findIndex(p => p.id === selectedPhoto);
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-purple flex items-center gap-2 sm:gap-3">
              <ImageIcon className="h-6 w-6 sm:h-8 sm:w-8 text-brand-turquoise" />
              Galerie Photos
            </h1>
            <p className="text-sm sm:text-base text-brand-gray mt-1">
              Vos inspirations et souvenirs
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              className="gap-2 flex-1 sm:flex-none"
              onClick={() => setIsUploadModalOpen(true)}
            >
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Ajouter des photos</span>
              <span className="sm:hidden">Ajouter</span>
            </Button>
            <div className="flex border rounded-lg overflow-hidden">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="icon"
                className={viewMode === 'grid' ? 'bg-brand-turquoise' : ''}
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="icon"
                className={viewMode === 'list' ? 'bg-brand-turquoise' : ''}
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <Card className="p-10 shadow-xl border-0">
            <div className="flex items-center justify-center gap-3 text-brand-gray">
              <Loader2 className="h-5 w-5 animate-spin" />
              Chargement de la galerie...
            </div>
          </Card>
        ) : null}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card
            className={`p-4 cursor-pointer transition-all hover:shadow-lg ${
              !selectedAlbumId ? 'ring-2 ring-brand-turquoise' : ''
            }`}
            onClick={() => setSelectedAlbumId(null)}
          >
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-brand-turquoise/10 flex items-center justify-center">
                <FolderOpen className="h-6 w-6 text-brand-turquoise" />
              </div>
              <p className="font-medium text-brand-purple">Tous</p>
              <p className="text-xs text-brand-gray">{allPhotos.length} photos</p>
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
            <h2 className="text-xl font-bold text-brand-purple">
              {selectedAlbumId ? (albums.find((a) => a.id === selectedAlbumId)?.name || 'Album') : 'Toutes les photos'}
            </h2>
            <p className="text-sm text-brand-gray">
              {filteredPhotos.length} photos
            </p>
          </div>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative group aspect-square rounded-lg overflow-hidden cursor-pointer"
                  onClick={() => setSelectedPhoto(photo.id)}
                >
                  <img 
                    src={photo.url} 
                    alt={`Photo ${photo.id}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <button
                    className="absolute top-2 right-2 p-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      void toggleLike(photo.id);
                    }}
                  >
                    <Heart
                      className={`h-5 w-5 ${
                        likedPhotos.includes(photo.id)
                          ? 'text-red-500 fill-red-500'
                          : 'text-white'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <img 
                    src={photo.url} 
                    alt={`Photo ${photo.id}`}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-brand-purple">Photo {photo.id}</p>
                    <p className="text-sm text-brand-gray">{photo.albumName} • {photo.date || ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => void toggleLike(photo.id)}
                    >
                      <Heart
                        className={`h-5 w-5 ${
                          likedPhotos.includes(photo.id)
                            ? 'text-red-500 fill-red-500'
                            : 'text-brand-gray'
                        }`}
                      />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Download className="h-5 w-5 text-brand-turquoise" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {selectedPhoto && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white hover:bg-white/10"
              onClick={() => setSelectedPhoto(null)}
            >
              <X className="h-6 w-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 text-white hover:bg-white/10"
              onClick={() => navigatePhoto('prev')}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
            <img 
              src={filteredPhotos.find(p => p.id === selectedPhoto)?.url} 
              alt="Photo agrandie"
              className="w-[80vw] h-[80vh] rounded-lg object-contain"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 text-white hover:bg-white/10"
              onClick={() => navigatePhoto('next')}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          </div>
        )}

        <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-brand-purple">Ajouter des photos</DialogTitle>
              <DialogDescription>
                Téléchargez vos photos et choisissez un album
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-brand-turquoise transition-colors">
                <Upload className="h-10 w-10 mx-auto text-brand-gray mb-2" />
                <p className="text-sm text-brand-gray">
                  Glissez vos photos ici ou cliquez pour parcourir
                </p>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => setUploadFiles(Array.from(e.target.files || []))}
                  className="mt-4 w-full text-sm text-brand-gray file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-turquoise file:text-white hover:file:bg-brand-turquoise-hover"
                />
                {uploadFiles.length ? (
                  <p className="text-xs text-brand-gray mt-2">{uploadFiles.length} fichier(s) sélectionné(s)</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label>Album de destination</Label>
                <Select value={selectedUploadAlbumId} onValueChange={setSelectedUploadAlbumId}>
                  <SelectTrigger>
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
                  <Label>Nom du nouvel album</Label>
                  <Input value={newAlbumName} onChange={(e) => setNewAlbumName(e.target.value)} placeholder="Ex: Inspiration" />
                </div>
              ) : null}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUploadModalOpen(false)}>
                Annuler
              </Button>
              <Button 
                className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
                onClick={() => void handleUpload()}
                disabled={uploading || !selectedUploadAlbumId || uploadFiles.length === 0 || (selectedUploadAlbumId === 'new' && !newAlbumName.trim())}
              >
                {uploading ? 'Upload...' : 'Télécharger'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isSuccessModalOpen} onOpenChange={setIsSuccessModalOpen}>
          <DialogContent className="sm:max-w-md text-center">
            <div className="flex flex-col items-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <DialogTitle className="text-brand-purple text-xl">Photos ajoutées !</DialogTitle>
              <DialogDescription className="mt-2">
                Vos photos ont été ajoutées avec succès à l'album.
              </DialogDescription>
            </div>
            <DialogFooter className="justify-center">
              <Button 
                className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
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
