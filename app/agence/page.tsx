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
import { auth } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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
  const { user } = useAuth();
  const [agency, setAgency] = useState<Agency | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [qontoStatusLoading, setQontoStatusLoading] = useState(false);
  const [qontoConnected, setQontoConnected] = useState<boolean | null>(null);
  const [qontoConnectLoading, setQontoConnectLoading] = useState(false);
  const [qontoDebugLoading, setQontoDebugLoading] = useState(false);

  const [paymentLinksStatusLoading, setPaymentLinksStatusLoading] = useState(false);
  const [paymentLinksStatus, setPaymentLinksStatus] = useState<string | null>(null);
  const [paymentLinksLocation, setPaymentLinksLocation] = useState<string | null>(null);
  const [paymentLinksConnectLoading, setPaymentLinksConnectLoading] = useState(false);

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

  useEffect(() => {
    async function fetchQontoStatus() {
      if (!user?.uid) return;
      if (user.role !== 'planner') return;
      setQontoStatusLoading(true);
      try {
        const idToken = await auth.currentUser?.getIdToken().catch(() => null);
        if (!idToken) return;
        const res = await fetch('/api/qonto/oauth/token-info', {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          setQontoConnected(false);
          return;
        }
        setQontoConnected(Boolean(json?.connected));
      } catch {
        setQontoConnected(false);
      } finally {
        setQontoStatusLoading(false);
      }
    }

    void fetchQontoStatus();
  }, [user?.uid, user?.role]);

  useEffect(() => {
    async function fetchPaymentLinksStatus() {
      if (!user?.uid) return;
      if (user.role !== 'planner') return;
      if (!qontoConnected) return;

      setPaymentLinksStatusLoading(true);
      try {
        const idToken = await auth.currentUser?.getIdToken().catch(() => null);
        if (!idToken) return;

        const res = await fetch('/api/qonto/payment-links/connection-status', {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          setPaymentLinksStatus(null);
          setPaymentLinksLocation(null);
          return;
        }

        setPaymentLinksStatus(String(json?.status || '').toLowerCase() || null);
        setPaymentLinksLocation(String(json?.connection_location || '').trim() || null);
      } catch {
        setPaymentLinksStatus(null);
        setPaymentLinksLocation(null);
      } finally {
        setPaymentLinksStatusLoading(false);
      }
    }

    void fetchPaymentLinksStatus();
  }, [user?.uid, user?.role, qontoConnected]);

  const handleConnectQonto = async () => {
    if (!user?.uid) return;
    if (user.role !== 'planner') {
      toast.error('Connexion Qonto disponible uniquement en mode admin');
      return;
    }

    setQontoConnectLoading(true);
    try {
      const idToken = await auth.currentUser?.getIdToken().catch(() => null);
      if (!idToken) throw new Error('missing_auth');

      const res = await fetch('/api/qonto/oauth/start', {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.url) {
        throw new Error(String(json?.error || 'qonto_oauth_start_error'));
      }

      window.location.href = String(json.url);
    } catch (e: any) {
      console.error('Qonto connect error:', e);
      toast.error("Impossible de lancer la connexion Qonto");
    } finally {
      setQontoConnectLoading(false);
    }
  };

  const handleDebugQonto = async () => {
    if (!user?.uid) return;
    if (user.role !== 'planner') {
      toast.error('Diagnostic Qonto disponible uniquement en mode admin');
      return;
    }

    setQontoDebugLoading(true);
    try {
      const idToken = await auth.currentUser?.getIdToken().catch(() => null);
      if (!idToken) throw new Error('missing_auth');

      const res = await fetch('/api/qonto/oauth/debug', {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(String(json?.error || 'Erreur diagnostic Qonto'));
        return;
      }

      const env = json?.env || {};
      toast.success(
        `Qonto env=${env?.QONTO_ENV || 'n/a'} | oauth_base=${env?.oauth_base || 'n/a'} | client_id_len=${env?.QONTO_OAUTH_CLIENT_ID_length || 0} | secret_len=${env?.QONTO_OAUTH_CLIENT_SECRET_length || 0}`
      );
    } catch (e: any) {
      console.error('Qonto debug error:', e);
      toast.error('Erreur diagnostic Qonto');
    } finally {
      setQontoDebugLoading(false);
    }
  };

  const handleConnectPaymentLinks = async () => {
    if (!user?.uid) return;
    if (user.role !== 'planner') {
      toast.error('Activation Payment Links disponible uniquement en mode admin');
      return;
    }

    setPaymentLinksConnectLoading(true);
    try {
      const idToken = await auth.currentUser?.getIdToken().catch(() => null);
      if (!idToken) throw new Error('missing_auth');

      const res = await fetch('/api/qonto/payment-links/connect', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const code = String(json?.error || 'Erreur activation Payment Links');
        const value = json?.value ? ` (${String(json.value)})` : '';
        toast.error(`${code}${value}`);
        return;
      }

      const status = String(json?.status || '').toLowerCase();
      setPaymentLinksStatus(status || null);
      const location = String(json?.connection_location || '').trim();
      setPaymentLinksLocation(location || null);
      toast.success(status ? `Payment Links: ${status}` : 'Payment Links: demande envoyée');
      if (location) {
        window.open(location, '_blank', 'noopener,noreferrer');
      }
    } catch (e: any) {
      console.error('Payment Links connect error:', e);
      toast.error('Erreur activation Payment Links');
    } finally {
      setPaymentLinksConnectLoading(false);
    }
  };

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
              <h2 className="text-xl font-bold text-brand-purple mb-2">Paiements Qonto</h2>
              <p className="text-sm text-brand-gray mb-4">
                Connecte Qonto pour activer les liens de paiement (le bouton “Payer” redirigera vers Qonto).
              </p>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="text-sm text-brand-gray">
                  Statut :{' '}
                  {qontoStatusLoading ? (
                    <span>Chargement…</span>
                  ) : qontoConnected ? (
                    <span className="text-green-700 font-medium">Connecté</span>
                  ) : (
                    <span className="text-orange-700 font-medium">Non connecté</span>
                  )}
                </div>

                <div className="text-sm text-brand-gray">
                  Payment Links :{' '}
                  {paymentLinksStatusLoading ? (
                    <span>Chargement…</span>
                  ) : paymentLinksStatus ? (
                    <span className={paymentLinksStatus === 'enabled' ? 'text-green-700 font-medium' : 'text-orange-700 font-medium'}>
                      {paymentLinksStatus}
                    </span>
                  ) : (
                    <span className="text-brand-gray">n/a</span>
                  )}
                </div>

                {paymentLinksLocation ? (
                  <Button type="button" variant="outline" onClick={() => window.open(paymentLinksLocation, '_blank', 'noopener,noreferrer')}>
                    Ouvrir onboarding
                  </Button>
                ) : null}

                <div className="flex-1" />

                <Button type="button" variant="outline" onClick={handleDebugQonto} disabled={qontoDebugLoading}>
                  {qontoDebugLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Diagnostic…
                    </span>
                  ) : (
                    'Diagnostiquer Qonto'
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleConnectPaymentLinks}
                  disabled={paymentLinksConnectLoading || !qontoConnected}
                >
                  {paymentLinksConnectLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Activation…
                    </span>
                  ) : (
                    'Activer Payment Links'
                  )}
                </Button>

                <Button
                  type="button"
                  onClick={handleConnectQonto}
                  disabled={qontoConnectLoading}
                  className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
                >
                  {qontoConnectLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Connexion…
                    </span>
                  ) : (
                    'Connecter Qonto'
                  )}
                </Button>
              </div>
            </Card>

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