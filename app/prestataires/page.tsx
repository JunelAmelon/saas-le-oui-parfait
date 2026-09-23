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
  UserPlus,
  CheckCircle2,
  RefreshCw,
  FileText,
  Eye,
  X,
  Upload,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getDocuments, addDocument, updateDocument, deleteDocument } from '@/lib/db';
import { VENDOR_CATEGORIES, getCategoryLabel, getCategoryColor } from '@/lib/discovery';
import { uploadFile } from '@/lib/storage';
import { DocViewerModal } from '@/components/DocViewerModal';
import { toast } from 'sonner';
import axios from 'axios';
import { auth } from '@/lib/firebase';
import { getIdToken } from 'firebase/auth';

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
  desc?: string;
  notes?: string;
  logoUrl?: string | null;
  pro_account_status?: 'none' | 'invited' | 'active';
  createdAt?: any;
}

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
  const [docFiles, setDocFiles] = useState<File[]>([]);
  const [vendorDocs, setVendorDocs] = useState<any[]>([]);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [docView, setDocView] = useState<{ url: string; name: string; fileType?: string | null } | null>(null);
  const [invitingVendorId, setInvitingVendorId] = useState<string | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [deletingVendorId, setDeletingVendorId] = useState<string | null>(null);
  const [togglingFavoriteId, setTogglingFavoriteId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    customCategory: '',
    contactName: '',
    email: '',
    phone: '',
    city: '',
    website: '',
    rating: 5,
    desc: '',
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
        desc: d.desc || '',
        notes: d.notes || '',
        logoUrl: d.logo || d.logo_url || d.logoUrl || d.logoURL || null,
        pro_account_status: d.pro_account_status || 'none',
        createdAt: d.created_at || null,
      }));
      // Plus recents en premier
      const ts = (v: any) =>
        v?.toDate ? v.toDate().getTime() : v ? new Date(v).getTime() || 0 : 0;
      mapped.sort((a, b) => ts(b.createdAt) - ts(a.createdAt));
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
      customCategory: '',
      contactName: '',
      email: '',
      phone: '',
      city: '',
      website: '',
      rating: 5,
      desc: '',
      notes: '',
      isFavorite: false,
    });
    setLogoFile(null);
    setLogoPreview(null);
    setDocFiles([]);
    setVendorDocs([]);
  };

  // Documents joints a la fiche prestataire (contrats, plaquettes, assurances…)
  const fetchVendorDocs = async (vendorId: string) => {
    try {
      const docs = await getDocuments('vendor_documents', [
        { field: 'vendor_id', operator: '==', value: vendorId },
      ]);
      setVendorDocs(docs || []);
    } catch (e) {
      console.error('Error fetching vendor docs:', e);
      setVendorDocs([]);
    }
  };

  const uploadVendorDocs = async (vendorId: string) => {
    if (!docFiles.length || !user) return;
    for (const f of docFiles) {
      try {
        const url = await uploadFile(f, `vendor-docs/${vendorId}`);
        await addDocument('vendor_documents', {
          vendor_id: vendorId,
          planner_id: user.uid,
          name: f.name,
          file_url: url,
          file_type: f.type || '',
          file_size: f.size,
          created_at: new Date(),
        });
      } catch (e) {
        console.error('Error uploading vendor doc:', e);
        toast.error(`Échec de l'envoi de ${f.name}`);
      }
    }
    await fetchVendorDocs(vendorId);
    setDocFiles([]);
  };

  const deleteVendorDoc = async (docId: string) => {
    setDeletingDocId(docId);
    try {
      await deleteDocument('vendor_documents', docId);
      setVendorDocs((prev) => prev.filter((d) => d.id !== docId));
    } catch (e) {
      toast.error('Erreur lors de la suppression du document');
    } finally {
      setDeletingDocId(null);
    }
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
    if (formData.category === 'other' && !formData.customCategory.trim()) {
      toast.error('Précisez la catégorie du prestataire');
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
        category:
          formData.category === 'other'
            ? formData.customCategory.trim()
            : formData.category,
        contact_name: formData.contactName,
        email: formData.email,
        phone: formData.phone,
        city: formData.city,
        website: formData.website,
        rating: formData.rating,
        desc: formData.desc,
        notes: formData.notes,
        is_favorite: formData.isFavorite,
        logo: logoUrl,
        created_at: new Date(),
      };

      let vendorId = selectedVendor?.id;
      if (isEditMode && selectedVendor) {
        await updateDocument('vendors', selectedVendor.id, data);
        toast.success('Prestataire modifié avec succès');
      } else {
        const created = await addDocument('vendors', data);
        vendorId = created.id;
        toast.success('Prestataire créé avec succès');
      }

      // Upload des documents joints a la fiche
      if (vendorId && docFiles.length) {
        await uploadVendorDocs(vendorId);
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
    setDeletingVendorId(vendorId);
    try {
      await deleteDocument('vendors', vendorId);
      toast.success('Prestataire supprimé');
      setIsDetailOpen(false);
      fetchVendors();
    } catch (e) {
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeletingVendorId(null);
    }
  };

  const toggleFavorite = async (vendor: Vendor) => {
    if (togglingFavoriteId) return;
    setTogglingFavoriteId(vendor.id);
    try {
      await updateDocument('vendors', vendor.id, {
        is_favorite: !vendor.isFavorite
      });
      fetchVendors();
    } catch (e) {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setTogglingFavoriteId(null);
    }
  };

  const handleInviteVendor = async (vendor: Vendor) => {
    if (!vendor.email) {
      toast.error("Ce prestataire n'a pas d'email. Ajoutez-en avant de l'inviter.");
      return;
    }
    if (!confirm(`Inviter "${vendor.name}" sur l'espace pro ? Un email sera envoyé à ${vendor.email}.`)) return;

    setInvitingVendorId(vendor.id);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Non authentifié');
      const token = await getIdToken(currentUser);

      const res = await axios.post(
        '/api/auth/invite-vendor',
        {
          vendorId: vendor.id,
          email: vendor.email,
          fullName: vendor.contactName || vendor.name,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.ok) {
        toast.success(`Invitation envoyée à ${vendor.email}`);
        await fetchVendors();
        // Refresh selected vendor to reflect updated status
        if (selectedVendor?.id === vendor.id) {
          setSelectedVendor({ ...selectedVendor, pro_account_status: 'invited' });
        }
      }
    } catch (e: any) {
      console.error('Error inviting vendor:', e);
      const msg = e?.response?.data?.error || e?.message || 'Erreur lors de l\'invitation';
      toast.error(msg);
    } finally {
      setInvitingVendorId(null);
    }
  };

  const handleMigrateBookings = async () => {
    if (!confirm('Synchroniser tous les prestataires assignés vers l\'espace pro ? Cette action crée les bookings manquants. À faire une seule fois après la mise en ligne.')) return;

    setMigrating(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Non authentifié');
      const token = await getIdToken(currentUser);

      const res = await axios.post(
        '/api/migrate-vendor-bookings',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.ok) {
        const { created, updated, skipped, total } = res.data;
        toast.success(
          `Migration terminée : ${created} créés, ${updated} mis à jour, ${skipped} ignorés sur ${total} liens.`
        );
      }
    } catch (e: any) {
      console.error('Error migrating vendor bookings:', e);
      const msg = e?.response?.data?.error || e?.message || 'Erreur lors de la migration';
      toast.error(msg);
    } finally {
      setMigrating(false);
    }
  };

  const handleViewDetail = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setIsDetailOpen(true);
    void fetchVendorDocs(vendor.id);
  };

  const handleEdit = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    const knownCat = VENDOR_CATEGORIES.some((c) => c.key === vendor.category);
    setFormData({
      name: vendor.name,
      category: knownCat ? vendor.category : vendor.category ? 'other' : '',
      customCategory: knownCat ? '' : vendor.category || '',
      contactName: vendor.contactName,
      email: vendor.email,
      phone: vendor.phone,
      city: vendor.city,
      website: vendor.website,
      rating: vendor.rating,
      desc: vendor.desc || '',
      notes: vendor.notes || '',
      isFavorite: vendor.isFavorite,
    });
    setLogoFile(null);
    setLogoPreview(vendor.logoUrl || null);
    setDocFiles([]);
    void fetchVendorDocs(vendor.id);
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
  const filteredVendors = vendors.filter((vendor) => {
    const matchesSearch =
      vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === 'all' ||
      getCategoryLabel(vendor.category) === getCategoryLabel(categoryFilter);
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
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button
              variant="outline"
              className="gap-2 w-full sm:w-auto"
              onClick={handleMigrateBookings}
              disabled={migrating}
              title="Synchronise les prestataires assignés vers l'espace pro (à faire une seule fois)"
            >
              {migrating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Sync espace pro</span>
              <span className="sm:hidden">Sync</span>
            </Button>
            <Button
              className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2 w-full sm:w-auto"
              onClick={handleNewVendor}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nouveau prestataire</span>
              <span className="sm:hidden">Nouveau</span>
            </Button>
          </div>
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
                {VENDOR_CATEGORIES
                  .filter((c, i, arr) => i === arr.findIndex((x) => x.label === c.label))
                  .map((cat) => (
                    <SelectItem key={cat.key} value={cat.key}>{cat.label}</SelectItem>
                  ))}
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
              const color = getCategoryColor(vendor.category);
              const label = getCategoryLabel(vendor.category);
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
                        <Badge className={`${color} hover:${color} text-white border-0`}>
                          {label === '—' ? 'Non catégorisé' : label}
                        </Badge>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleFavorite(vendor)}
                      disabled={togglingFavoriteId === vendor.id}
                    >
                      {togglingFavoriteId === vendor.id ? (
                        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                      ) : (
                        <Star className={`h-5 w-5 transition-colors ${
                        vendor.isFavorite 
                          ? 'fill-yellow-400 text-yellow-400' 
                          : 'text-gray-300 hover:text-yellow-400'
                      }`} />
                    )}
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
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-3xl">
          <DialogTitle className="sr-only">{selectedVendor?.name || 'Prestataire'}</DialogTitle>
          {selectedVendor && (
            <>
              {/* Bandeau identite */}
              <div className="relative overflow-hidden bg-gradient-to-br from-brand-purple to-[#2E2937] px-6 pt-8 pb-6 text-white">
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-brand-turquoise/15 blur-2xl pointer-events-none" />
                <div className="relative flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-white/15 border-2 border-white/25 overflow-hidden flex items-center justify-center shrink-0">
                    {selectedVendor.logoUrl ? (
                      <img src={selectedVendor.logoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="font-baskerville text-xl text-brand-beige">
                        {(selectedVendor.name || '?').slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-baskerville text-2xl text-brand-beige truncate">
                        {selectedVendor.name}
                      </h3>
                      {selectedVendor.isFavorite && (
                        <Star className="h-5 w-5 fill-yellow-400 text-yellow-400 shrink-0" />
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wide bg-brand-turquoise/90 text-white px-2.5 py-1 rounded-full">
                        {getCategoryLabel(selectedVendor.category)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-brand-beige/80">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${i < selectedVendor.rating ? 'fill-[#C9A96E] text-[#C9A96E]' : 'text-white/30'}`}
                          />
                        ))}
                        <span className="ml-1">{selectedVendor.rating}/5</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-6 space-y-4">
              {/* Contact */}
              <div className="rounded-2xl border border-brand-purple/8 bg-[#FAF9F7] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-gray mb-3">
                  Contact — {selectedVendor.contactName}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-brand-turquoise/15 flex items-center justify-center shrink-0">
                      <Mail className="h-4 w-4 text-brand-turquoise" />
                    </div>
                    <span className="text-[13px] text-brand-purple truncate">{selectedVendor.email}</span>
                  </div>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-brand-turquoise/15 flex items-center justify-center shrink-0">
                      <Phone className="h-4 w-4 text-brand-turquoise" />
                    </div>
                    <span className="text-[13px] text-brand-purple truncate">{selectedVendor.phone || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-brand-turquoise/15 flex items-center justify-center shrink-0">
                      <MapPin className="h-4 w-4 text-brand-turquoise" />
                    </div>
                    <span className="text-[13px] text-brand-purple truncate">{selectedVendor.city || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-brand-turquoise/15 flex items-center justify-center shrink-0">
                      <Globe className="h-4 w-4 text-brand-turquoise" />
                    </div>
                    <span className="text-[13px] text-brand-purple truncate">{selectedVendor.website || '—'}</span>
                  </div>
                </div>
              </div>

              {selectedVendor.desc ? (
                <div className="rounded-2xl border border-brand-purple/8 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-gray mb-1.5">Description</p>
                  <p className="text-[13px] text-brand-gray whitespace-pre-wrap leading-relaxed">{selectedVendor.desc}</p>
                </div>
              ) : null}

              {selectedVendor.notes ? (
                <div className="rounded-2xl border border-brand-purple/8 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-gray mb-1.5">Notes &amp; conditions</p>
                  <p className="text-[13px] text-brand-gray whitespace-pre-wrap leading-relaxed">{selectedVendor.notes}</p>
                </div>
              ) : null}

              {/* Documents joints a la fiche */}
              {vendorDocs.length > 0 && (
                <div className="rounded-2xl border border-brand-purple/8 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-gray mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-brand-turquoise" />
                    Documents ({vendorDocs.length})
                  </p>
                  <div className="space-y-1.5">
                    {vendorDocs.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        className="w-full flex items-center gap-2.5 rounded-xl bg-[#FAF9F7] hover:bg-brand-turquoise/10 px-3 py-2.5 text-[13px] text-brand-purple transition-colors text-left"
                        onClick={() => setDocView({ url: d.file_url, name: d.name, fileType: d.file_type })}
                      >
                        <div className="w-7 h-7 rounded-full bg-brand-turquoise/15 flex items-center justify-center shrink-0">
                          <FileText className="h-3.5 w-3.5 text-brand-turquoise" />
                        </div>
                        <span className="truncate">{d.name}</span>
                        <Eye className="h-3.5 w-3.5 ml-auto shrink-0 text-brand-gray" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Espace pro */}
              <div className="rounded-2xl bg-gradient-to-br from-[#F0F9F8] to-[#E6F3F1] border border-brand-turquoise/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-brand-purple flex items-center gap-2">
                      <UserPlus className="h-4 w-4 text-brand-turquoise" />
                      Espace pro
                    </p>
                    <p className="text-xs text-brand-gray mt-1">
                      {selectedVendor.pro_account_status === 'active'
                        ? 'Compte pro actif'
                        : selectedVendor.pro_account_status === 'invited'
                        ? 'Invitation envoyée'
                        : "Ce prestataire n'a pas encore accès à son espace pro"}
                    </p>
                  </div>
                  {selectedVendor.pro_account_status === 'active' ? (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0 shrink-0">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      Actif
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2 shrink-0 rounded-full"
                      disabled={invitingVendorId === selectedVendor.id}
                      onClick={() => handleInviteVendor(selectedVendor)}
                    >
                      {invitingVendorId === selectedVendor.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserPlus className="h-4 w-4" />
                      )}
                      {selectedVendor.pro_account_status === 'invited' ? 'Renvoyer' : 'Inviter'}
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="gap-2 rounded-full border-brand-purple/15 text-brand-purple">
                  <MessageSquare className="h-4 w-4" />
                  Contacter
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 rounded-full border-brand-purple/15 text-brand-purple"
                  disabled={!selectedVendor.website}
                  onClick={() => {
                    const raw = (selectedVendor.website || '').trim();
                    if (!raw) return;
                    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
                    try {
                      window.open(url, '_blank');
                    } catch {
                      // ignore
                    }
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                  Site web
                </Button>
              </div>
              </div>
            </>
          )}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 px-5 sm:px-6 pb-5 sm:pb-6">
            <Button
              variant="ghost"
              onClick={() => selectedVendor && handleDelete(selectedVendor.id)}
              className="w-full sm:w-auto text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full"
              disabled={deletingVendorId === selectedVendor?.id}
            >
              {deletingVendorId === selectedVendor?.id ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Supprimer
            </Button>
            <div className="flex-1" />
            <Button variant="outline" onClick={() => setIsDetailOpen(false)} className="w-full sm:w-auto rounded-full border-brand-purple/15 text-brand-purple">
              Fermer
            </Button>
            <Button 
              className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2 w-full sm:w-auto rounded-full"
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
          </div>
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
              <Label>Nom de l&apos;entreprise *</Label>
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
                  {VENDOR_CATEGORIES
                    .filter((c, i, arr) => i === arr.findIndex((x) => x.label === c.label))
                    .map((cat) => (
                      <SelectItem key={cat.key} value={cat.key}>{cat.label}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {formData.category === 'other' && (
                <Input
                  className="mt-2"
                  placeholder="Précisez la catégorie (ex : Officiant bilingue)"
                  value={formData.customCategory}
                  onChange={(e) => setFormData({ ...formData, customCategory: e.target.value })}
                />
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Nom / pseudo du pro *</Label>
                <Input 
                  placeholder="Prénom Nom ou pseudo" 
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
              <Label>Description</Label>
              <Textarea
                placeholder="Décrivez le rôle de ce prestataire et ce qu'il apporte..."
                className="mt-1"
                rows={3}
                value={formData.desc}
                onChange={(e) => setFormData({ ...formData, desc: e.target.value })}
              />
            </div>
            <div>
              <Label>Notes &amp; conditions</Label>
              <Textarea 
                placeholder="Conditions de paiement, contraintes spécifiques, remarques internes..." 
                className="mt-1" 
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
              />
            </div>
            <div>
              <Label>Documents (contrats, assurances, plaquettes…)</Label>
              <label
                htmlFor="vendor-docs-input"
                className="mt-2 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-turquoise/40 bg-brand-turquoise/5 hover:bg-brand-turquoise/10 hover:border-brand-turquoise/60 transition-colors px-4 py-6 cursor-pointer text-center"
              >
                <div className="w-10 h-10 rounded-full bg-brand-turquoise/15 flex items-center justify-center">
                  <Upload className="h-5 w-5 text-brand-turquoise" />
                </div>
                <p className="text-[13px] font-semibold text-brand-purple">
                  Cliquez pour ajouter des fichiers
                </p>
                <p className="text-[11px] text-brand-gray">
                  PDF, images, Word, Excel — plusieurs fichiers possibles
                </p>
                <input
                  id="vendor-docs-input"
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length) setDocFiles((prev) => [...prev, ...files]);
                    e.target.value = '';
                  }}
                />
              </label>
              {docFiles.length > 0 && (
                <div className="mt-2 space-y-1">
                  {docFiles.map((f, i) => (
                    <div
                      key={`${f.name}-${i}`}
                      className="flex items-center justify-between gap-2 text-[12px] bg-gray-50 rounded-md px-2.5 py-1.5"
                    >
                      <span className="flex items-center gap-2 truncate text-brand-gray">
                        <FileText className="h-3.5 w-3.5 text-brand-turquoise shrink-0" />
                        <span className="truncate">{f.name}</span>
                      </span>
                      <button
                        type="button"
                        className="text-red-400 hover:text-red-600 shrink-0"
                        title="Retirer"
                        onClick={() => setDocFiles((prev) => prev.filter((_, x) => x !== i))}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <p className="text-[11px] text-brand-gray italic">
                    Ces fichiers seront envoyés à l&apos;enregistrement.
                  </p>
                </div>
              )}
              {isEditMode && vendorDocs.length > 0 && (
                <div className="mt-3 space-y-1">
                  <p className="text-[11px] font-semibold text-brand-purple uppercase tracking-wide">
                    Documents existants
                  </p>
                  {vendorDocs.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between gap-2 text-[12px] border border-gray-100 rounded-md px-2.5 py-1.5"
                    >
                      <span className="flex items-center gap-2 truncate text-brand-gray">
                        <FileText className="h-3.5 w-3.5 text-brand-turquoise shrink-0" />
                        <span className="truncate">{d.name}</span>
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          className="p-1 text-brand-turquoise hover:bg-brand-turquoise/10 rounded"
                          title="Voir"
                          onClick={() => setDocView({ url: d.file_url, name: d.name, fileType: d.file_type })}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          className="p-1 text-red-400 hover:bg-red-50 rounded"
                          title="Supprimer"
                          disabled={deletingDocId === d.id}
                          onClick={() => void deleteVendorDoc(d.id)}
                        >
                          {deletingDocId === d.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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

      <DocViewerModal
        open={!!docView}
        onOpenChange={(o) => !o && setDocView(null)}
        url={docView?.url}
        name={docView?.name}
        fileType={docView?.fileType}
      />
    </DashboardLayout>
  );
}
