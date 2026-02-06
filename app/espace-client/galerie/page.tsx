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
} from 'lucide-react';
import { useState } from 'react';

const albums = [
  { id: '1', name: 'Inspiration', count: 24, cover: '🎨' },
  { id: '2', name: 'Lieu de réception', count: 12, cover: '🏰' },
  { id: '3', name: 'Décoration', count: 18, cover: '💐' },
  { id: '4', name: 'Robes & Costumes', count: 8, cover: '👗' },
  { id: '5', name: 'Nos photos', count: 45, cover: '📸' },
];

const photos = [
  { id: '1', album: 'Inspiration', liked: true, date: '15/01/2024', url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400' },
  { id: '2', album: 'Inspiration', liked: false, date: '15/01/2024', url: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=400' },
  { id: '3', album: 'Lieu de réception', liked: true, date: '20/01/2024', url: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=400' },
  { id: '4', album: 'Lieu de réception', liked: true, date: '20/01/2024', url: 'https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=400' },
  { id: '5', album: 'Décoration', liked: false, date: '25/01/2024', url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400' },
  { id: '6', album: 'Décoration', liked: true, date: '25/01/2024', url: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=400' },
  { id: '7', album: 'Robes & Costumes', liked: true, date: '01/02/2024', url: 'https://images.unsplash.com/photo-1594552072238-5cb96f3d0e8e?w=400' },
  { id: '8', album: 'Nos photos', liked: true, date: '05/02/2024', url: 'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=400' },
  { id: '9', album: 'Inspiration', liked: false, date: '10/02/2024', url: 'https://images.unsplash.com/photo-1460978812857-470ed1c77af0?w=400' },
  { id: '10', album: 'Décoration', liked: true, date: '12/02/2024', url: 'https://images.unsplash.com/photo-1525258437537-f9a5a3a8f4e7?w=400' },
  { id: '11', album: 'Nos photos', liked: false, date: '14/02/2024', url: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=400' },
  { id: '12', album: 'Lieu de réception', liked: true, date: '15/02/2024', url: 'https://images.unsplash.com/photo-1519167758481-83f29da8c2b0?w=400' },
  { id: '13', album: 'Inspiration', liked: true, date: '16/02/2024', url: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=400' },
  { id: '14', album: 'Décoration', liked: false, date: '18/02/2024', url: 'https://images.unsplash.com/photo-1530023367847-a683933f4172?w=400' },
  { id: '15', album: 'Robes & Costumes', liked: true, date: '20/02/2024', url: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=400' },
  { id: '16', album: 'Nos photos', liked: true, date: '22/02/2024', url: 'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=400' },
];


export default function GaleriePage() {
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [likedPhotos, setLikedPhotos] = useState<string[]>(
    photos.filter(p => p.liked).map(p => p.id)
  );
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedUploadAlbum, setSelectedUploadAlbum] = useState('');
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const handleUpload = () => {
    setIsUploadModalOpen(false);
    setIsSuccessModalOpen(true);
    setSelectedUploadAlbum('');
  };

  const navigatePhoto = (direction: 'prev' | 'next') => {
    const currentIndex = filteredPhotos.findIndex(p => p.id === selectedPhoto);
    if (direction === 'prev' && currentIndex > 0) {
      setSelectedPhoto(filteredPhotos[currentIndex - 1].id);
    } else if (direction === 'next' && currentIndex < filteredPhotos.length - 1) {
      setSelectedPhoto(filteredPhotos[currentIndex + 1].id);
    }
  };

  const toggleLike = (photoId: string) => {
    setLikedPhotos(prev => 
      prev.includes(photoId) 
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]
    );
  };

  const filteredPhotos = selectedAlbum 
    ? photos.filter(p => p.album === selectedAlbum)
    : photos;

  return (
    <ClientDashboardLayout clientName="Julie & Frédérick" daysRemaining={165}>
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

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card
            className={`p-4 cursor-pointer transition-all hover:shadow-lg ${
              !selectedAlbum ? 'ring-2 ring-brand-turquoise' : ''
            }`}
            onClick={() => setSelectedAlbum(null)}
          >
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-brand-turquoise/10 flex items-center justify-center">
                <FolderOpen className="h-6 w-6 text-brand-turquoise" />
              </div>
              <p className="font-medium text-brand-purple">Tous</p>
              <p className="text-xs text-brand-gray">{photos.length} photos</p>
            </div>
          </Card>
          {albums.map((album) => (
            <Card
              key={album.id}
              className={`p-4 cursor-pointer transition-all hover:shadow-lg ${
                selectedAlbum === album.name ? 'ring-2 ring-brand-turquoise' : ''
              }`}
              onClick={() => setSelectedAlbum(album.name)}
            >
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gray-100 flex items-center justify-center text-2xl">
                  {album.cover}
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
              {selectedAlbum || 'Toutes les photos'}
            </h2>
            <p className="text-sm text-brand-gray">
              {filteredPhotos.length} photos
            </p>
          </div>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredPhotos.map((photo, index) => (
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
                      toggleLike(photo.id);
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
              {filteredPhotos.map((photo, index) => (
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
                    <p className="text-sm text-brand-gray">{photo.album} • {photo.date}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleLike(photo.id)}
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
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-brand-turquoise transition-colors cursor-pointer">
                <Upload className="h-10 w-10 mx-auto text-brand-gray mb-2" />
                <p className="text-sm text-brand-gray">
                  Glissez vos photos ici ou cliquez pour parcourir
                </p>
                <input type="file" multiple accept="image/*" className="hidden" />
              </div>
              <div className="space-y-2">
                <Label>Album de destination</Label>
                <Select value={selectedUploadAlbum} onValueChange={setSelectedUploadAlbum}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un album" />
                  </SelectTrigger>
                  <SelectContent>
                    {albums.map((album) => (
                      <SelectItem key={album.id} value={album.name}>
                        {album.cover} {album.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUploadModalOpen(false)}>
                Annuler
              </Button>
              <Button 
                className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
                onClick={handleUpload}
                disabled={!selectedUploadAlbum}
              >
                Télécharger
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
