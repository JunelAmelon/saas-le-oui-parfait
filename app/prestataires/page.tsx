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
  Loader2,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getDocuments, addDocument, updateDocument, deleteDocument } from '@/lib/db';
import { toast } from 'sonner';
import axios from 'axios';

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
  notes?: string;
  logoUrl?: string | null;
}


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
  const { user } = useAuth();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isNewVendorOpen, setIsNewVendorOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    contactName: '',
    email: '',
    phone: '',
    city: '',
    website: '',
    rating: 5,
    notes: '',
    isFavorite: false,
  });

  // Fetch vendors
  const fetchVendors = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getDocuments('vendors', [
        { field: 'planner_id', operator: '==', value: user.uid }
      ]);
      const mapped = data.map((d: any) => ({
        id: d.id,
        name: d.name,
        category: d.category,
        contactName: d.contact_name,
        email: d.email,
        phone: d.phone,
        city: d.city,
        rating: d.rating,
        isFavorite: d.is_favorite || false,
        website: d.website,
        notes: d.notes || '',
        logoUrl: d.logo || d.logo_url || d.logoUrl || d.logoURL || null,
      }));
      setVendors(mapped);
    } catch (e) {
      console.error('Error fetching vendors:', e);
      toast.error('Erreur lors du chargement des prestataires');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [user]);

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      contactName: '',
      email: '',
      phone: '',
      city: '',
      website: '',
      rating: 5,
      notes: '',
      isFavorite: false,
    });
    setLogoFile(null);
    setLogoPreview(null);
  };

  const uploadLogoToCloudinary = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);

    const res = await axios.post(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
      formData
    );

    return res.data.secure_url as string;
  };

  const handleSubmit = async () => {
    if (!user || !formData.name || !formData.category || !formData.contactName || !formData.email) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      let logoUrl = selectedVendor?.logoUrl || null;
      if (logoFile) {
        logoUrl = await uploadLogoToCloudinary(logoFile);
      } else if (logoPreview === null && isEditMode) {
        logoUrl = null;
      }

      const data = {
        planner_id: user.uid,
        name: formData.name,
        category: formData.category,
        contact_name: formData.contactName,
        email: formData.email,
        phone: formData.phone,
        city: formData.city,
        website: formData.website,
        rating: formData.rating,
        notes: formData.notes,
        is_favorite: formData.isFavorite,
        logo: logoUrl,
        created_at: new Date(),
      };

      if (isEditMode && selectedVendor) {
        await updateDocument('vendors', selectedVendor.id, data);
        toast.success('Prestataire modifié avec succès');
      } else {
        await addDocument('vendors', data);
        toast.success('Prestataire créé avec succès');
      }

      setIsNewVendorOpen(false);
      resetForm();
      fetchVendors();
    } catch (e) {
      console.error('Error saving vendor:', e);
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  const handleDelete = async (vendorId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce prestataire ?')) return;
    
    try {
      await deleteDocument('vendors', vendorId);
      toast.success('Prestataire supprimé');
      setIsDetailOpen(false);
      fetchVendors();
    } catch (e) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const toggleFavorite = async (vendor: Vendor) => {
    try {
      await updateDocument('vendors', vendor.id, {
        is_favorite: !vendor.isFavorite
      });
      fetchVendors();
    } catch (e) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleViewDetail = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setIsDetailOpen(true);
  };

  const handleEdit = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setFormData({
      name: vendor.name,
      category: vendor.category,
      contactName: vendor.contactName,
      email: vendor.email,
      phone: vendor.phone,
      city: vendor.city,
      website: vendor.website,
      rating: vendor.rating,
      notes: vendor.notes || '',
      isFavorite: vendor.isFavorite,
    });
    setLogoFile(null);
    setLogoPreview(vendor.logoUrl || null);
    setIsEditMode(true);
    setIsNewVendorOpen(true);
  };

  const handleNewVendor = () => {
    setSelectedVendor(null);
    resetForm();
    setIsEditMode(false);
    setIsNewVendorOpen(true);
  };

  // Filtering and pagination
  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vendor.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vendor.city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || vendor.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.ceil(filteredVendors.length / itemsPerPage);
  const paginatedVendors = filteredVendors.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter]);

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
            onClick={handleNewVendor}
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
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[200px] border-2 border-brand-turquoise">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
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

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-brand-turquoise" />
            </div>
          ) : paginatedVendors.length === 0 ? (
            <div className="text-center py-20">
              <Globe className="h-16 w-16 text-brand-gray mx-auto mb-4" />
              <h3 className="text-xl font-bold text-brand-purple mb-2">
                {searchTerm || categoryFilter !== 'all' ? 'Aucun résultat' : 'Aucun prestataire'}
              </h3>
              <p className="text-brand-gray mb-6">
                {searchTerm || categoryFilter !== 'all' ? 'Essayez avec d\'autres critères' : 'Ajoutez votre premier prestataire'}
              </p>
              {!searchTerm && categoryFilter === 'all' && (
                <Button onClick={handleNewVendor} className="bg-brand-turquoise hover:bg-brand-turquoise-hover">
                  <Plus className="h-4 w-4 mr-2" /> Ajouter un prestataire
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {paginatedVendors.map((vendor) => {
              const config = categoryConfig[vendor.category as keyof typeof categoryConfig] || categoryConfig.other;
              return (
                <Card key={vendor.id} className="p-5 border border-[#E5E5E5] shadow-md hover:shadow-lg transition-shadow">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex-1 flex items-start gap-3 min-w-0">
                      <div className="h-12 w-12 rounded-full bg-white border border-gray-200 overflow-hidden flex-shrink-0">
                        {vendor.logoUrl ? (
                          <img src={vendor.logoUrl} alt={vendor.name} className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg font-bold text-brand-purple mb-1 truncate">
                          {vendor.name}
                        </h3>
                        <Badge className={`${config.color} hover:${config.color} text-white border-0`}>
                          {config.label}
                        </Badge>
                      </div>
                    </div>
                    <button onClick={() => toggleFavorite(vendor)}>
                      <Star className={`h-5 w-5 transition-colors ${
                        vendor.isFavorite 
                          ? 'fill-yellow-400 text-yellow-400' 
                          : 'text-gray-300 hover:text-yellow-400'
                      }`} />
                    </button>
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
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-brand-gray">
                    Page {currentPage} sur {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      {/* Modal Détail Prestataire */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="destructive" 
              onClick={() => selectedVendor && handleDelete(selectedVendor.id)}
              className="w-full sm:w-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer
            </Button>
            <div className="flex-1" />
            <Button variant="outline" onClick={() => setIsDetailOpen(false)} className="w-full sm:w-auto">
              Fermer
            </Button>
            <Button 
              className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2 w-full sm:w-auto"
              onClick={() => {
                if (selectedVendor) {
                  setIsDetailOpen(false);
                  handleEdit(selectedVendor);
                }
              }}
            >
              <Edit className="h-4 w-4" />
              Modifier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Nouveau/Modifier Prestataire */}
      <Dialog open={isNewVendorOpen} onOpenChange={setIsNewVendorOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-brand-purple">
              {isEditMode ? 'Modifier le prestataire' : 'Nouveau prestataire'}
            </DialogTitle>
            <DialogDescription>
              {isEditMode ? 'Modifiez les informations du prestataire' : 'Ajoutez un prestataire à votre réseau'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Logo (optionnel)</Label>
              <div className="mt-2 flex items-center gap-4">
                <div className="h-16 w-16 rounded-full overflow-hidden border border-gray-200 bg-white flex items-center justify-center">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="flex-1">
                  <Input
                    type="file"
                    accept="image/*"
                    className="text-sm"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      if (f) {
                        setLogoFile(f);
                        setLogoPreview(URL.createObjectURL(f));
                      }
                    }}
                  />
                  {logoPreview ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        setLogoFile(null);
                        setLogoPreview(null);
                      }}
                    >
                      Retirer le logo
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
            <div>
              <Label>Nom du prestataire *</Label>
              <Input 
                placeholder="Nom de l'entreprise" 
                className="mt-1"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div>
              <Label>Catégorie *</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Nom du contact *</Label>
                <Input 
                  placeholder="Prénom Nom" 
                  className="mt-1"
                  value={formData.contactName}
                  onChange={(e) => setFormData({...formData, contactName: e.target.value})}
                />
              </div>
              <div>
                <Label>Ville *</Label>
                <Input 
                  placeholder="Rennes" 
                  className="mt-1"
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Email *</Label>
                <Input 
                  type="email" 
                  placeholder="contact@exemple.fr" 
                  className="mt-1"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div>
                <Label>Téléphone *</Label>
                <Input 
                  placeholder="02 99 00 00 00" 
                  className="mt-1"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label>Site web</Label>
              <Input 
                placeholder="www.exemple.fr" 
                className="mt-1"
                value={formData.website}
                onChange={(e) => setFormData({...formData, website: e.target.value})}
              />
            </div>
            <div>
              <Label>Note (1-5 étoiles)</Label>
              <Select value={formData.rating?.toString() || '5'} onValueChange={(v) => setFormData({...formData, rating: parseInt(v)})}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sélectionner une note" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">⭐ 1 étoile</SelectItem>
                  <SelectItem value="2">⭐⭐ 2 étoiles</SelectItem>
                  <SelectItem value="3">⭐⭐⭐ 3 étoiles</SelectItem>
                  <SelectItem value="4">⭐⭐⭐⭐ 4 étoiles</SelectItem>
                  <SelectItem value="5">⭐⭐⭐⭐⭐ 5 étoiles</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes internes</Label>
              <Textarea 
                placeholder="Notes sur ce prestataire..." 
                className="mt-1" 
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => {
              setIsNewVendorOpen(false);
              resetForm();
            }} className="w-full sm:w-auto">
              Annuler
            </Button>
            <Button 
              className="bg-brand-turquoise hover:bg-brand-turquoise-hover w-full sm:w-auto"
              onClick={handleSubmit}
            >
              {isEditMode ? 'Enregistrer les modifications' : 'Créer le prestataire'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
