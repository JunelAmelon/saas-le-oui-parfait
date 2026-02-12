'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, User, X } from 'lucide-react';
import { addDocument, getDocuments, updateDocument, setDocument } from '@/lib/db';
import { toast } from 'sonner';
import axios from 'axios';
import { createClientAccount, generateSecurePassword, validatePassword } from '@/lib/auth-helpers';
import { Eye, EyeOff, RefreshCw } from 'lucide-react';
import { ColorPalette } from '@/components/wedding/ColorPalette';

interface ClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  client?: {
    id: string;
    names: string;
    email: string;
    phone: string;
    eventDate: string;
    eventLocation: string;
    budget: number;
    guests: number;
    photo?: string;
    theme?: {
      style?: string;
      description?: string;
      colors?: string[];
    };
    notes?: string;
  };
  userId: string;
  onSuccess: () => void;
}

export function ClientModal({ open, onOpenChange, mode, client, userId, onSuccess }: ClientModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(client?.photo || null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [createAccount, setCreateAccount] = useState(mode === 'create');

  const [themeStyle, setThemeStyle] = useState(client?.theme?.style || '');
  const [themeDescription, setThemeDescription] = useState(client?.theme?.description || '');
  const [themeColors, setThemeColors] = useState<string[]>(client?.theme?.colors || []);
  const [notes, setNotes] = useState(client?.notes || '');

  const normalizeDateInputValue = (v?: string) => {
    if (!v) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
      const dd = m[1].padStart(2, '0');
      const mm = m[2].padStart(2, '0');
      const yyyy = m[3];
      return `${yyyy}-${mm}-${dd}`;
    }
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) {
      const yyyy = String(d.getFullYear());
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    return '';
  };

  useEffect(() => {
    if (!open) return;
    setPhotoFile(null);
    setPhotoPreview(client?.photo || null);
    setThemeStyle(client?.theme?.style || '');
    setThemeDescription(client?.theme?.description || '');
    setThemeColors(client?.theme?.colors || []);
    setNotes(client?.notes || '');
    setPassword('');
    setShowPassword(false);
    setCreateAccount(mode === 'create');
  }, [open, client, mode]);

  useEffect(() => {
    const hydrateThemeFromEvent = async () => {
      if (!open) return;
      if (mode !== 'edit') return;
      if (!client?.id) return;

      // If the client doc doesn't have a theme, fallback to the associated wedding event theme.
      const clientHasTheme = Boolean(client?.theme?.style || client?.theme?.description || (client?.theme?.colors || []).length);
      if (clientHasTheme) return;

      try {
        const events = await getDocuments('events', [
          { field: 'client_id', operator: '==', value: client.id },
        ]);
        const ev = ((events as any[]) || []).find((x) => Boolean(x?.event_date)) || (events?.[0] as any) || null;
        const t = ev?.theme;
        if (t) {
          setThemeStyle(t.style || '');
          setThemeDescription(t.description || '');
          setThemeColors(t.colors || []);
        }
      } catch (e) {
        console.error('Error hydrating theme from event:', e);
      }
    };

    void hydrateThemeFromEvent();
  }, [open, mode, client?.id, client?.theme?.style, client?.theme?.description]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const uploadPhotoToCloudinary = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);

    const res = await axios.post(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
      formData
    );

    return res.data.secure_url;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const name = formData.get('name') as string;
    const partner = formData.get('partner') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const eventDate = formData.get('eventDate') as string;
    const eventLocation = formData.get('eventLocation') as string;
    const budget = formData.get('budget') as string;
    const guests = formData.get('guests') as string;

    if (!name || !partner || !email) {
      toast.error('Veuillez remplir les champs obligatoires');
      return;
    }

    // Validation du mot de passe si création de compte
    if (mode === 'create' && createAccount) {
      if (!password) {
        toast.error('Veuillez définir un mot de passe pour le compte client');
        return;
      }

      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        toast.error(passwordValidation.error || 'Mot de passe invalide');
        return;
      }
    }

    setIsSaving(true);

    try {
      let photoUrl = client?.photo || '';
      if (photoFile) {
        photoUrl = await uploadPhotoToCloudinary(photoFile);
      } else if (!photoPreview) {
        photoUrl = '';
      }

      const data = {
        name,
        partner,
        email,
        phone: phone || '',
        event_date: eventDate || '',
        event_location: eventLocation || '',
        budget: budget || '0',
        guests: guests || '0',
        photo: photoUrl,
        theme: {
          style: themeStyle || '',
          description: themeDescription || '',
          colors: themeColors || [],
        },
        notes: notes || '',
      };

      if (mode === 'create') {
        let clientUserId = '';

        // Créer le compte Firebase Auth si demandé
        if (createAccount && password) {
          toast.info('Création du compte utilisateur...');
          const accountResult = await createClientAccount(email, password);

          if (!accountResult.success) {
            toast.error(accountResult.error || 'Erreur lors de la création du compte');
            setIsSaving(false);
            return;
          }

          clientUserId = accountResult.uid!;

          // Créer le document profile dans Firestore (nécessaire pour la connexion)
          // IMPORTANT : Utiliser setDocument avec l'UID comme ID du document
          await setDocument('profiles', clientUserId, {
            uid: clientUserId,
            email: email,
            role: 'client',
            full_name: `${name} & ${partner}`,
            created_at: new Date().toISOString(),
          });

          toast.success('Compte utilisateur créé avec succès');
        }

        // Créer le document client dans Firestore
        const clientDoc = await addDocument('clients', {
          ...data,
          status: 'En cours',
          planner_id: userId,
          client_user_id: clientUserId, // UID Firebase Auth
          created_at: new Date().toISOString(),
        });

        // Créer automatiquement un document event pour l'espace client
        await addDocument('events', {
          client_id: clientDoc.id,
          planner_id: userId,
          couple_names: `${name} & ${partner}`,
          event_date: eventDate || '',
          location: eventLocation || '',
          guest_count: parseInt(guests) || 0,
          budget: parseFloat(budget) || 0,
          client_email: email,
          theme: {
            style: themeStyle || '',
            description: themeDescription || '',
            colors: themeColors || [],
          },
          notes: notes || '',
          created_at: new Date().toISOString(),
        });

        if (createAccount) {
          toast.success(`Client créé avec succès ! Identifiants : ${email} / ${password}`);
        } else {
          toast.success('Client créé avec succès');
        }
      } else if (client) {
        await updateDocument('clients', client.id, data);

        try {
          const events = await getDocuments('events', [
            { field: 'client_id', operator: '==', value: client.id },
          ]);
          const ev = (events as any[])?.[0];
          if (ev?.id) {
            await updateDocument('events', ev.id, {
              couple_names: `${name} & ${partner}`,
              event_date: eventDate || '',
              location: eventLocation || '',
              guest_count: parseInt(guests) || 0,
              budget: parseFloat(budget) || 0,
              client_email: email,
              theme: {
                style: themeStyle || '',
                description: themeDescription || '',
                colors: themeColors || [],
              },
              notes: notes || '',
            });
          }
        } catch (err) {
          console.error('Error updating related event:', err);
        }
        toast.success('Client mis à jour');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error(`Erreur lors de ${mode === 'create' ? 'la création' : 'la mise à jour'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const [name1, name2] = client?.names.split(' & ') || ['', ''];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Nouvelle fiche client' : 'Modifier la fiche'}</DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Créez une nouvelle fiche pour vos mariés' : 'Modifiez les informations du client'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photo Section - Améliorée */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Photo du couple</Label>

            {/* Photo Preview ou Placeholder */}
            <div className="flex items-center gap-4">
              {photoPreview ? (
                <div className="relative">
                  <img
                    src={photoPreview}
                    alt="Couple"
                    className="w-24 h-24 rounded-full object-cover border-2 border-brand-turquoise"
                  />
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300">
                  <User className="w-8 h-8 text-gray-400" />
                </div>
              )}

              {/* Upload Button */}
              <div className="flex-1 space-y-2">
                <input
                  type="file"
                  id="photo-upload"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('photo-upload')?.click()}
                  className="border-brand-turquoise text-brand-turquoise hover:bg-brand-turquoise hover:text-white transition-colors duration-200"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {photoPreview ? 'Changer la photo' : 'Télécharger une photo'}
                </Button>
                <p className="text-xs text-gray-500">JPG, PNG ou WEBP (max. 5MB)</p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200"></div>

          {/* Informations des partenaires */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Informations du couple</Label>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Partenaire 1 *</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={name1}
                  placeholder="Prénom Nom"
                  required
                  className="border-gray-300 focus:border-brand-purple focus:ring-brand-purple"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="partner">Partenaire 2 *</Label>
                <Input
                  id="partner"
                  name="partner"
                  defaultValue={name2}
                  placeholder="Prénom Nom"
                  required
                  className="border-gray-300 focus:border-brand-purple focus:ring-brand-purple"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={client?.email}
                placeholder="email@example.com"
                required
                className="border-gray-300 focus:border-brand-purple focus:ring-brand-purple"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={client?.phone}
                placeholder="+33 6 12 34 56 78"
                className="border-gray-300 focus:border-brand-purple focus:ring-brand-purple"
              />
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200"></div>

          {/* Création de compte utilisateur - Seulement en mode création */}
          {mode === 'create' && (
            <>
              <div className="space-y-4">
                <Label className="text-base font-semibold">Compte utilisateur</Label>
                <p className="text-sm text-gray-600">
                  Créer un compte pour que le client puisse accéder à l'espace client
                </p>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="createAccount"
                    checked={createAccount}
                    onChange={(e) => setCreateAccount(e.target.checked)}
                    className="w-4 h-4 text-brand-turquoise border-gray-300 rounded focus:ring-brand-turquoise"
                  />
                  <Label htmlFor="createAccount" className="cursor-pointer">
                    Créer le compte
                  </Label>
                </div>

                {createAccount && (
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="space-y-2">
                      <Label htmlFor="password">Mot de passe *</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="border-gray-300 focus:border-brand-purple focus:ring-brand-purple pr-10"
                          required={createAccount}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setPassword(generateSecurePassword())}
                      className="border-brand-turquoise text-brand-turquoise hover:bg-brand-turquoise hover:text-white"
                      title="Générer un mot de passe sécurisé"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Générer un mot de passe
                    </Button>

                    <div className="bg-blue-50 border border-blue-200 rounded p-3 space-y-2">
                      <p className="text-xs text-blue-800">
                        💡 Ce mot de passe sera communiqué au client pour qu'il puisse se connecter à l'espace client
                      </p>
                      <div className="text-xs text-blue-900 space-y-1">
                        <p className="font-semibold">📧 Identifiants de connexion :</p>
                        <p>Email : {client?.email || 'email@example.com'}</p>
                        <p>Mot de passe : {password || '******'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200"></div>
            </>
          )}

          {/* Détails de l'événement */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Détails de l'événement</Label>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="eventDate">Date de l'événement</Label>
                <Input
                  id="eventDate"
                  name="eventDate"
                  type="date"
                  defaultValue={normalizeDateInputValue(client?.eventDate)}
                  className="border-gray-300 focus:border-brand-purple focus:ring-brand-purple"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="guests">Nombre d'invités</Label>
                <Input
                  id="guests"
                  name="guests"
                  type="number"
                  defaultValue={client?.guests}
                  placeholder="100"
                  className="border-gray-300 focus:border-brand-purple focus:ring-brand-purple"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="eventLocation">Lieu de réception</Label>
              <Input
                id="eventLocation"
                name="eventLocation"
                defaultValue={client?.eventLocation}
                placeholder="Château de..."
                className="border-gray-300 focus:border-brand-purple focus:ring-brand-purple"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget">Budget estimé (€)</Label>
              <Input
                id="budget"
                name="budget"
                type="number"
                defaultValue={client?.budget}
                placeholder="20000"
                className="border-gray-300 focus:border-brand-purple focus:ring-brand-purple"
              />
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200"></div>

          <div className="space-y-4">
            <Label className="text-base font-semibold">Thème & Décoration</Label>

            <div className="space-y-2">
              <Label htmlFor="themeStyle">Style</Label>
              <Input
                id="themeStyle"
                value={themeStyle}
                onChange={(e) => setThemeStyle(e.target.value)}
                placeholder="Ex: Bohème, Chic, Champêtre..."
                className="border-gray-300 focus:border-brand-purple focus:ring-brand-purple"
              />
            </div>

            <div className="space-y-2">
              <Label>Palette de couleurs</Label>
              <ColorPalette selectedColors={themeColors} onColorsChange={setThemeColors} maxColors={6} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="themeDescription">Description</Label>
              <Input
                id="themeDescription"
                value={themeDescription}
                onChange={(e) => setThemeDescription(e.target.value)}
                placeholder="Décrivez l'univers souhaité..."
                className="border-gray-300 focus:border-brand-purple focus:ring-brand-purple"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes & Déroulement</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes importantes, déroulement, idées..."
                className="border-gray-300 focus:border-brand-purple focus:ring-brand-purple"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="border-gray-300 hover:bg-gray-50"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-brand-purple hover:bg-brand-purple/90"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {mode === 'create' ? 'Création...' : 'Mise à jour...'}
                </>
              ) : (
                mode === 'create' ? 'Créer la fiche' : 'Enregistrer'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}