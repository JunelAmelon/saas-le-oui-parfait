'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building2, Mail, Phone, MapPin, Globe, Upload, X, Loader2 } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Agency {
  name: string;
  siret: string;
  description: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  logoUrl?: string;
}

export default function AgencyPage() {
  const [agency, setAgency] = useState<Agency | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Charger les infos depuis Firestore
  useEffect(() => {
    const fetchAgency = async () => {
      try {
        const docRef = doc(db, 'agency', 'leOuiParfait');
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          setAgency(snapshot.data() as Agency);
        } else {
          // Données par défaut si aucune donnée n'existe
          const defaultAgency: Agency = {
            name: 'Le Oui Parfait',
            siret: '',
            description: '',
            email: 'contact@leouiparfait.fr',
            phone: '',
            website: '',
            address: '',
            postalCode: '',
            city: '',
            country: 'France',
            logoUrl: ''
          };
          setAgency(defaultAgency);
          // Sauvegarder les données par défaut
          await setDoc(docRef, defaultAgency);
        }
      } catch (error) {
        console.error('Erreur lors du fetch de l\'agence:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAgency();
  }, []);

  // Mise à jour d'un champ
  const handleChange = (field: keyof Agency, value: string) => {
    setAgency((prev) => prev ? { ...prev, [field]: value } : prev);
  };

  // Upload du logo vers Cloudinary
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !agency) return;

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image');
      return;
    }

    // Vérifier la taille (max 5MB pour Cloudinary)
    if (file.size > 5 * 1024 * 1024) {
      alert('L\'image ne doit pas dépasser 5MB');
      return;
    }

    try {
      setUploadingLogo(true);

      // Créer un FormData pour l'upload Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'your_upload_preset'); // À remplacer
      formData.append('folder', 'agencies/logos'); // Dossier dans Cloudinary

      // Upload vers Cloudinary
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Erreur lors de l\'upload');
      }

      const data = await response.json();
      const logoUrl = data.secure_url;

      // Mettre à jour l'état local
      setAgency(prev => prev ? { ...prev, logoUrl } : prev);
      alert('Logo téléchargé avec succès');
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      alert('Erreur lors du téléchargement du logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  // Supprimer le logo (juste l'URL, pas le fichier Cloudinary)
  const handleRemoveLogo = () => {
    if (!agency?.logoUrl) return;

    if (confirm('Voulez-vous vraiment supprimer ce logo ?')) {
      setAgency(prev => prev ? { ...prev, logoUrl: '' } : prev);
      alert('Logo supprimé. N\'oubliez pas de sauvegarder.');
    }
  };

  // Enregistrer les modifications
  const handleSave = async () => {
    if (!agency) return;
    setSaving(true);
    try {
      const docRef = doc(db, 'agency', 'leOuiParfait');
      await setDoc(docRef, agency, { merge: true });
      alert('Informations mises à jour !');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  // Annuler les modifications
  const handleCancel = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, 'agency', 'leOuiParfait');
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        setAgency(snapshot.data() as Agency);
        alert('Modifications annulées');
      }
    } catch (error) {
      console.error('Erreur lors du rechargement:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-brand-turquoise" />
        </div>
      </DashboardLayout>
    );
  }

  if (!agency) {
    return (
      <DashboardLayout>
        <p className="text-center text-brand-gray">Aucune donnée disponible pour l&apos;agence.</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-purple mb-1 sm:mb-2">
            Mon Agence
          </h1>
          <p className="text-sm sm:text-base text-brand-gray">
            Gérez les informations de votre agence Le Oui Parfait
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 shadow-xl border-0">
              <h2 className="text-xl font-bold text-brand-purple mb-6 flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Informations générales
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium text-brand-gray">
                      Nom de l&apos;agence
                    </Label>
                    <Input
                      id="name"
                      value={agency.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className="border-[#E5E5E5] focus-visible:ring-brand-turquoise"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="siret" className="text-sm font-medium text-brand-gray">
                      SIRET
                    </Label>
                    <Input
                      id="siret"
                      value={agency.siret}
                      onChange={(e) => handleChange('siret', e.target.value)}
                      placeholder="XXX XXX XXX XXXXX"
                      className="border-[#E5E5E5] focus-visible:ring-brand-turquoise"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium text-brand-gray">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={agency.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Décrivez votre activité..."
                    rows={4}
                    className="border-[#E5E5E5] focus-visible:ring-brand-turquoise resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-brand-gray flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={agency.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="contact@leouiparfait.fr"
                      className="border-[#E5E5E5] focus-visible:ring-brand-turquoise"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium text-brand-gray flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Téléphone
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={agency.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      placeholder="+33 X XX XX XX XX"
                      className="border-[#E5E5E5] focus-visible:ring-brand-turquoise"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website" className="text-sm font-medium text-brand-gray flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Site web
                  </Label>
                  <Input
                    id="website"
                    type="url"
                    value={agency.website}
                    onChange={(e) => handleChange('website', e.target.value)}
                    placeholder="https://www.leouiparfait.fr"
                    className="border-[#E5E5E5] focus-visible:ring-brand-turquoise"
                  />
                </div>
              </div>
            </Card>

            <Card className="p-6 shadow-xl border-0">
              <h2 className="text-xl font-bold text-brand-purple mb-6 flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Adresse
              </h2>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-sm font-medium text-brand-gray">
                    Adresse
                  </Label>
                  <Input
                    id="address"
                    value={agency.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder="123 rue de la République"
                    className="border-[#E5E5E5] focus-visible:ring-brand-turquoise"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="postalCode" className="text-sm font-medium text-brand-gray">
                      Code postal
                    </Label>
                    <Input
                      id="postalCode"
                      value={agency.postalCode}
                      onChange={(e) => handleChange('postalCode', e.target.value)}
                      placeholder="35000"
                      className="border-[#E5E5E5] focus-visible:ring-brand-turquoise"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-sm font-medium text-brand-gray">
                      Ville
                    </Label>
                    <Input
                      id="city"
                      value={agency.city}
                      onChange={(e) => handleChange('city', e.target.value)}
                      placeholder="Rennes"
                      className="border-[#E5E5E5] focus-visible:ring-brand-turquoise"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country" className="text-sm font-medium text-brand-gray">
                      Pays
                    </Label>
                    <Input
                      id="country"
                      value={agency.country}
                      onChange={(e) => handleChange('country', e.target.value)}
                      className="border-[#E5E5E5] focus-visible:ring-brand-turquoise"
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-6 shadow-xl border-0">
              <h3 className="text-lg font-bold text-brand-purple mb-4">
                Logo de l&apos;agence
              </h3>
              <div className="mb-4 flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-[#E5E5E5] bg-gray-50 relative overflow-hidden">
                {agency.logoUrl ? (
                  <>
                    <img
                      src={agency.logoUrl}
                      alt="Logo de l&apos;agence"
                      className="h-full w-full object-contain p-2"
                    />
                    <button
                      onClick={handleRemoveLogo}
                      disabled={uploadingLogo}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors disabled:opacity-50"
                      type="button"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <div className="text-center">
                    <Building2 className="mx-auto h-12 w-12 text-brand-gray mb-2" />
                    <p className="text-sm text-brand-gray">
                      Aucun logo
                    </p>
                  </div>
                )}
              </div>
              <Button
                type="button"
                disabled={uploadingLogo}
                className="w-full bg-brand-turquoise hover:bg-brand-turquoise-hover"
                onClick={() => document.getElementById('logo-upload')?.click()}
              >
                {uploadingLogo ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Téléchargement...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Télécharger un logo
                  </>
                )}
              </Button>
              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <p className="text-xs text-brand-gray mt-2 text-center">
                Format accepté: PNG, JPG (max 5MB)
              </p>
            </Card>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={saving}
            className="border-2 border-brand-turquoise text-brand-gray hover:bg-brand-turquoise hover:text-white"
          >
            Annuler
          </Button>
          <Button
            className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              'Enregistrer les modifications'
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}