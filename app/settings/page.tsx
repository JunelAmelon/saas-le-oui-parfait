'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getDocuments, updateDocument } from '@/lib/db';
import { toast as sonnerToast } from 'sonner';
import {
  Settings as SettingsIcon,
  Lock,
  Palette,
  Save,
  Shield,
  Calendar,
  Check,
  Loader2,
} from 'lucide-react';

export default function SettingsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [checkingGoogle, setCheckingGoogle] = useState(true);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [notifications, setNotifications] = useState({
    emailNewProspect: true,
    emailNewMessage: true,
    emailPayment: true,
    emailReminder: true,
    pushNewProspect: false,
    pushNewMessage: true,
    pushPayment: true,
  });

  const [preferences, setPreferences] = useState({
    language: 'fr',
    timezone: 'Europe/Paris',
    dateFormat: 'DD/MM/YYYY',
    currency: 'EUR',
  });

  // Charger les paramètres depuis Firebase
  useEffect(() => {
    const loadSettings = async () => {
      if (!user) return;
      try {
        const settings = await getDocuments('settings', [
          { field: 'planner_id', operator: '==', value: user.uid }
        ]);
        if (settings.length > 0) {
          const userSettings = settings[0];
          setSettingsId(userSettings.id);
          if (userSettings.notifications) setNotifications(userSettings.notifications);
          if (userSettings.preferences) setPreferences(userSettings.preferences);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    loadSettings();
  }, [user]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('google_connected') === 'true') {
      setGoogleConnected(true);
      setCheckingGoogle(false);
      window.history.replaceState({}, '', '/settings');
      return;
    }
    if (urlParams.get('google_error')) {
      setCheckingGoogle(false);
      window.history.replaceState({}, '', '/settings');
      return;
    }

    const checkGoogleConnection = async () => {
      if (!user?.uid) {
        setCheckingGoogle(false);
        return;
      }
      try {
        const res = await fetch(`/api/google/status?userId=${user.uid}`);
        const data = await res.json();
        setGoogleConnected(data.connected);
      } catch {
        setGoogleConnected(false);
      } finally {
        setCheckingGoogle(false);
      }
    };
    checkGoogleConnection();
  }, [user?.uid]);

  const handleSave = async () => {
    if (!user) {
      sonnerToast.error('Vous devez être connecté');
      return;
    }

    setLoading(true);
    try {
      const settingsData = {
        planner_id: user.uid,
        notifications,
        preferences,
        updated_at: new Date(),
      };

      if (settingsId) {
        await updateDocument('settings', settingsId, settingsData);
      } else {
        // Créer un nouveau document de paramètres si nécessaire
        const { addDocument } = await import('@/lib/db');
        await addDocument('settings', {
          ...settingsData,
          created_at: new Date(),
        });
      }

      sonnerToast.success('Paramètres enregistrés avec succès');
    } catch (error) {
      console.error('Error saving settings:', error);
      sonnerToast.error('Erreur lors de la sauvegarde des paramètres');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      sonnerToast.error('Veuillez remplir tous les champs');
      return;
    }

    if (newPassword !== confirmPassword) {
      sonnerToast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (newPassword.length < 6) {
      sonnerToast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);
    try {
      // Utiliser Firebase Auth pour changer le mot de passe
      const { updatePassword, reauthenticateWithCredential, EmailAuthProvider } = await import('firebase/auth');
      const { auth } = await import('@/lib/firebase');
      
      if (!auth.currentUser) {
        sonnerToast.error('Utilisateur non connecté');
        return;
      }

      // Ré-authentifier l'utilisateur avec le mot de passe actuel
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email!,
        currentPassword
      );
      
      await reauthenticateWithCredential(auth.currentUser, credential);
      
      // Mettre à jour le mot de passe
      await updatePassword(auth.currentUser, newPassword);
      
      sonnerToast.success('Mot de passe modifié avec succès');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      if (error.code === 'auth/wrong-password') {
        sonnerToast.error('Mot de passe actuel incorrect');
      } else if (error.code === 'auth/weak-password') {
        sonnerToast.error('Le mot de passe est trop faible');
      } else {
        sonnerToast.error('Erreur lors du changement de mot de passe');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-brand-purple mb-2">Paramètres</h1>
          <p className="text-brand-gray">Configurez votre espace de travail</p>
        </div>

        <Tabs defaultValue="security" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-3 mb-6">
            <TabsTrigger value="security" className="gap-2">
              <Lock className="h-4 w-4" />
              <span className="hidden sm:inline">Sécurité</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Apparence</span>
            </TabsTrigger>
            <TabsTrigger value="integrations" className="gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Intégrations</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="security">
            <Card className="p-6 md:p-8 shadow-xl border-0">
              <h2 className="text-xl font-bold text-brand-purple mb-6 flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Sécurité
              </h2>
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-medium text-brand-purple">
                    Modifier le mot de passe
                  </h3>
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Mot de passe actuel</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="border-[#E5E5E5] focus-visible:ring-brand-turquoise"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Nouveau mot de passe</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="border-[#E5E5E5] focus-visible:ring-brand-turquoise"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">
                      Confirmer le nouveau mot de passe
                    </Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="border-[#E5E5E5] focus-visible:ring-brand-turquoise"
                    />
                  </div>
                  <Button 
                    onClick={handleChangePassword}
                    disabled={loading}
                    className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
                  >
                    {loading ? 'Modification...' : 'Modifier le mot de passe'}
                  </Button>
                </div>

                <div className="pt-6 border-t border-gray-200">
                  <h3 className="font-medium text-brand-purple mb-4">
                    Authentification à deux facteurs
                  </h3>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">2FA désactivée</p>
                      <p className="text-xs text-brand-gray">
                        Ajoutez une couche de sécurité supplémentaire
                      </p>
                    </div>
                    <Button variant="outline" className="border-2 border-brand-turquoise">
                      Activer
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="appearance">
            <Card className="p-6 md:p-8 shadow-xl border-0">
              <h2 className="text-xl font-bold text-brand-purple mb-6">
                Apparence
              </h2>
              <div className="space-y-6">
                <div className="space-y-4">
                  <Label>Thème</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="border-2 border-brand-turquoise rounded-lg p-4 cursor-pointer">
                      <div className="w-full h-20 bg-white border border-gray-200 rounded mb-2"></div>
                      <p className="text-sm font-medium text-center">Clair</p>
                    </div>
                    <div className="border-2 border-gray-200 rounded-lg p-4 cursor-pointer opacity-50">
                      <div className="w-full h-20 bg-gray-900 rounded mb-2"></div>
                      <p className="text-sm font-medium text-center">Sombre</p>
                    </div>
                    <div className="border-2 border-gray-200 rounded-lg p-4 cursor-pointer opacity-50">
                      <div className="w-full h-20 bg-gradient-to-br from-white to-gray-900 rounded mb-2"></div>
                      <p className="text-sm font-medium text-center">Auto</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Couleur d&apos;accent</Label>
                  <div className="flex gap-3">
                    <div className="h-12 w-12 rounded-lg bg-brand-turquoise border-2 border-brand-purple cursor-pointer"></div>
                    <div className="h-12 w-12 rounded-lg bg-blue-500 border-2 border-transparent hover:border-brand-purple cursor-pointer"></div>
                    <div className="h-12 w-12 rounded-lg bg-green-500 border-2 border-transparent hover:border-brand-purple cursor-pointer"></div>
                    <div className="h-12 w-12 rounded-lg bg-purple-500 border-2 border-transparent hover:border-brand-purple cursor-pointer"></div>
                    <div className="h-12 w-12 rounded-lg bg-pink-500 border-2 border-transparent hover:border-brand-purple cursor-pointer"></div>
                  </div>
                </div>

                <Button
                  onClick={handleSave}
                  disabled={loading}
                  className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2"
                >
                  <Save className="h-4 w-4" />
                  {loading ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="integrations">
            <Card className="p-6 md:p-8 shadow-xl border-0">
              <h2 className="text-xl font-bold text-brand-purple mb-6">
                Intégrations
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold">
                      G
                    </div>
                    <div>
                      <p className="font-medium">Google Calendar</p>
                      <p className="text-sm text-brand-gray">Synchronisez vos événements et rendez-vous</p>
                    </div>
                  </div>
                  {checkingGoogle ? (
                    <Loader2 className="h-5 w-5 animate-spin text-brand-gray" />
                  ) : googleConnected ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <Check className="h-5 w-5" />
                      <span className="text-sm font-medium">Connecté</span>
                    </div>
                  ) : (
                    <a
                      href={`/api/google/auth?userId=${user?.uid || ''}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-brand-turquoise rounded-lg text-sm font-medium text-brand-purple hover:bg-brand-turquoise/5 transition-colors"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      Connecter
                    </a>
                  )}
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
