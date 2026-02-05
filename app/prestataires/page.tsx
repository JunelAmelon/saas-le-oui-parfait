'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Plus,
  Search,
  Filter,
  MapPin,
  Phone,
  Mail,
  Star,
  Globe,
  Edit,
  MessageSquare,
  ExternalLink,
} from 'lucide-react';
import { useState } from 'react';

interface Vendor {
  id: string;
  name: string;
  category: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  rating: number;
  isFavorite: boolean;
  website: string;
}

const vendors: Vendor[] = [
  {
    id: '1',
    name: 'Château d\'Apigné',
    category: 'venue',
    contactName: 'Marie Dupont',
    email: 'contact@chateau-apigne.fr',
    phone: '02 99 00 00 00',
    city: 'Rennes',
    rating: 5,
    isFavorite: true,
    website: 'www.chateau-apigne.fr',
  },
  {
    id: '2',
    name: 'Fleurs de Bretagne',
    category: 'flowers',
    contactName: 'Sophie Martin',
    email: 'contact@fleursdebreatagne.fr',
    phone: '02 99 11 11 11',
    city: 'Rennes',
    rating: 4,
    isFavorite: true,
    website: 'www.fleursdebreatagne.fr',
  },
  {
    id: '3',
    name: 'PhotoMagie',
    category: 'photography',
    contactName: 'Pierre Durand',
    email: 'contact@photomagie.fr',
    phone: '06 12 34 56 78',
    city: 'Nantes',
    rating: 5,
    isFavorite: false,
    website: 'www.photomagie.fr',
  },
  {
    id: '4',
    name: 'Traiteur Gourmet',
    category: 'catering',
    contactName: 'Luc Bernard',
    email: 'contact@traiteur-gourmet.fr',
    phone: '02 99 22 22 22',
    city: 'Vannes',
    rating: 4,
    isFavorite: false,
    website: 'www.traiteur-gourmet.fr',
  },
];

const categoryConfig = {
  venue: { label: 'Lieu', color: 'bg-purple-500' },
  catering: { label: 'Traiteur', color: 'bg-orange-500' },
  photography: { label: 'Photographe', color: 'bg-blue-500' },
  video: { label: 'Vidéo', color: 'bg-red-500' },
  music: { label: 'Musique', color: 'bg-green-500' },
  flowers: { label: 'Fleuriste', color: 'bg-pink-500' },
  decoration: { label: 'Décoration', color: 'bg-yellow-500' },
  transport: { label: 'Transport', color: 'bg-indigo-500' },
  other: { label: 'Autre', color: 'bg-gray-500' },
};

export default function VendorsPage() {
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isNewVendorOpen, setIsNewVendorOpen] = useState(false);

  const handleViewDetail = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setIsDetailOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-purple mb-1 sm:mb-2">
              Mes Prestataires
            </h1>
            <p className="text-sm sm:text-base text-brand-gray">
              Gérez votre réseau de prestataires de confiance
            </p>
          </div>
          <Button 
            className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2 w-full sm:w-auto"
            onClick={() => setIsNewVendorOpen(true)}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nouveau prestataire</span>
            <span className="sm:hidden">Nouveau</span>
          </Button>
        </div>

        <Card className="p-6 shadow-xl border-0">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-gray" />
              <Input
                placeholder="Rechercher un prestataire..."
                className="pl-10 border-[#E5E5E5] focus-visible:ring-brand-turquoise"
              />
            </div>
            <Button
              variant="outline"
              className="border-2 border-brand-turquoise text-brand-gray hover:bg-brand-turquoise hover:text-white gap-2"
            >
              <Filter className="h-4 w-4" />
              Filtrer par catégorie
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {vendors.map((vendor) => {
              const config = categoryConfig[vendor.category as keyof typeof categoryConfig];
              return (
                <Card key={vendor.id} className="p-5 border border-[#E5E5E5] shadow-md hover:shadow-lg transition-shadow">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-brand-purple mb-1">
                        {vendor.name}
                      </h3>
                      <Badge className={`${config.color} hover:${config.color} text-white border-0`}>
                        {config.label}
                      </Badge>
                    </div>
                    {vendor.isFavorite && (
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    )}
                  </div>

                  <div className="space-y-2 mb-4 text-sm">
                    <div className="flex items-center gap-2 text-brand-gray">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span>{vendor.city}</span>
                    </div>
                    <div className="flex items-center gap-2 text-brand-gray">
                      <Phone className="h-4 w-4 flex-shrink-0" />
                      <span>{vendor.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-brand-gray">
                      <Mail className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{vendor.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-brand-gray">
                      <Globe className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{vendor.website}</span>
                    </div>
                  </div>

                  <div className="mb-4 flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < vendor.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'fill-gray-200 text-gray-200'
                        }`}
                      />
                    ))}
                    <span className="ml-2 text-sm text-brand-gray">
                      ({vendor.rating}/5)
                    </span>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full border-2 border-brand-turquoise text-brand-turquoise hover:bg-brand-turquoise hover:text-white"
                    size="sm"
                    onClick={() => handleViewDetail(vendor)}
                  >
                    Voir les détails
                  </Button>
                </Card>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Modal Détail Prestataire */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-brand-purple flex items-center gap-2">
              {selectedVendor?.name}
              {selectedVendor?.isFavorite && (
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedVendor && categoryConfig[selectedVendor.category as keyof typeof categoryConfig]?.label}
            </DialogDescription>
          </DialogHeader>
          {selectedVendor && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${
                      i < selectedVendor.rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'fill-gray-200 text-gray-200'
                    }`}
                  />
                ))}
                <span className="ml-2 text-sm text-brand-gray">
                  ({selectedVendor.rating}/5)
                </span>
              </div>

              <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-brand-purple">Contact: {selectedVendor.contactName}</p>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-brand-turquoise" />
                  <span className="text-sm">{selectedVendor.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-brand-turquoise" />
                  <span className="text-sm">{selectedVendor.phone}</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-brand-turquoise" />
                  <span className="text-sm">{selectedVendor.city}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-brand-turquoise" />
                  <span className="text-sm">{selectedVendor.website}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Contacter
                </Button>
                <Button 
                  variant="outline" 
                  className="gap-2"
                  onClick={() => window.open(`https://${selectedVendor.website}`, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                  Site web
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Fermer
            </Button>
            <Button className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2">
              <Edit className="h-4 w-4" />
              Modifier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Nouveau Prestataire */}
      <Dialog open={isNewVendorOpen} onOpenChange={setIsNewVendorOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-brand-purple">Nouveau prestataire</DialogTitle>
            <DialogDescription>
              Ajoutez un prestataire à votre réseau
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nom du prestataire</Label>
              <Input placeholder="Nom de l'entreprise" className="mt-1" />
            </div>
            <div>
              <Label>Catégorie</Label>
              <Select>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sélectionner une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="venue">Lieu</SelectItem>
                  <SelectItem value="catering">Traiteur</SelectItem>
                  <SelectItem value="photography">Photographe</SelectItem>
                  <SelectItem value="video">Vidéo</SelectItem>
                  <SelectItem value="music">Musique</SelectItem>
                  <SelectItem value="flowers">Fleuriste</SelectItem>
                  <SelectItem value="decoration">Décoration</SelectItem>
                  <SelectItem value="transport">Transport</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nom du contact</Label>
                <Input placeholder="Prénom Nom" className="mt-1" />
              </div>
              <div>
                <Label>Ville</Label>
                <Input placeholder="Rennes" className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input type="email" placeholder="contact@exemple.fr" className="mt-1" />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input placeholder="02 99 00 00 00" className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Site web</Label>
              <Input placeholder="www.exemple.fr" className="mt-1" />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea placeholder="Notes sur ce prestataire..." className="mt-1" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewVendorOpen(false)}>
              Annuler
            </Button>
            <Button 
              className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
              onClick={() => setIsNewVendorOpen(false)}
            >
              Créer le prestataire
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
