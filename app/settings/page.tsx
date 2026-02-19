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
  Bell,
  Lock,
  Palette,
  Mail,
  Save,
  Shield,
} from 'lucide-react';

export default function SettingsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
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

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 mb-6">
            <TabsTrigger value="general" className="gap-2">
              <SettingsIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Général</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Lock className="h-4 w-4" />
              <span className="hidden sm:inline">Sécurité</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Apparence</span>
            </TabsTrigger>
            <TabsTrigger value="integrations" className="gap-2">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Intégrations</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card className="p-6 md:p-8 shadow-xl border-0">
              <h2 className="text-xl font-bold text-brand-purple mb-6">
                Paramètres généraux
              </h2>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="language">Langue</Label>
                  <select
                    id="language"
                    value={preferences.language}
                    onChange={(e) =>
                      setPreferences({ ...preferences, language: e.target.value })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                    <option value="es">Español</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Fuseau horaire</Label>
                  <select
                    id="timezone"
                    value={preferences.timezone}
                    onChange={(e) =>
                      setPreferences({ ...preferences, timezone: e.target.value })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="Europe/Paris">Europe/Paris (GMT+1)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                    <option value="America/New_York">America/New York (GMT-5)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateFormat">Format de date</Label>
                  <select
                    id="dateFormat"
                    value={preferences.dateFormat}
                    onChange={(e) =>
                      setPreferences({ ...preferences, dateFormat: e.target.value })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="DD/MM/YYYY">JJ/MM/AAAA</option>
                    <option value="MM/DD/YYYY">MM/JJ/AAAA</option>
                    <option value="YYYY-MM-DD">AAAA-MM-JJ</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Devise</Label>
                  <select
                    id="currency"
                    value={preferences.currency}
                    onChange={(e) =>
                      setPreferences({ ...preferences, currency: e.target.value })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
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

          <TabsContent value="notifications">
            <Card className="p-6 md:p-8 shadow-xl border-0">
              <h2 className="text-xl font-bold text-brand-purple mb-6">
                Notifications
              </h2>
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-brand-purple mb-4">
                    Notifications par email
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Nouveau prospect</p>
                        <p className="text-xs text-brand-gray">
                          Recevoir un email quand un nouveau prospect s&apos;inscrit
                        </p>
                      </div>
                      <Switch
                        checked={notifications.emailNewProspect}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, emailNewProspect: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Nouveaux messages</p>
                        <p className="text-xs text-brand-gray">
                          Recevoir un email pour chaque nouveau message
                        </p>
                      </div>
                      <Switch
                        checked={notifications.emailNewMessage}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, emailNewMessage: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Paiements</p>
                        <p className="text-xs text-brand-gray">
                          Être notifié des paiements reçus
                        </p>
                      </div>
                      <Switch
                        checked={notifications.emailPayment}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, emailPayment: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Rappels</p>
                        <p className="text-xs text-brand-gray">
                          Recevoir des rappels pour les tâches importantes
                        </p>
                      </div>
                      <Switch
                        checked={notifications.emailReminder}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, emailReminder: checked })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-200">
                  <h3 className="font-medium text-brand-purple mb-4">
                    Notifications push
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Nouveau prospect</p>
                        <p className="text-xs text-brand-gray">
                          Notification push pour les nouveaux prospects
                        </p>
                      </div>
                      <Switch
                        checked={notifications.pushNewProspect}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, pushNewProspect: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Messages</p>
                        <p className="text-xs text-brand-gray">
                          Notification push pour les nouveaux messages
                        </p>
                      </div>
                      <Switch
                        checked={notifications.pushNewMessage}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, pushNewMessage: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Paiements</p>
                        <p className="text-xs text-brand-gray">
                          Notification push pour les paiements
                        </p>
                      </div>
                      <Switch
                        checked={notifications.pushPayment}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, pushPayment: checked })
                        }
                      />
                    </div>
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
                      <p className="text-sm text-brand-gray">Synchronisez vos événements</p>
                    </div>
                  </div>
                  <Button variant="outline" className="border-2 border-brand-turquoise">
                    Connecter
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-purple-500 rounded-lg flex items-center justify-center text-white font-bold">
                      S
                    </div>
                    <div>
                      <p className="font-medium">Stripe</p>
                      <p className="text-sm text-brand-gray">Gestion des paiements</p>
                    </div>
                  </div>
                  <Button variant="outline" className="border-2 border-brand-turquoise">
                    Connecter
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-red-500 rounded-lg flex items-center justify-center text-white font-bold">
                      M
                    </div>
                    <div>
                      <p className="font-medium">Mailchimp</p>
                      <p className="text-sm text-brand-gray">Campagnes email</p>
                    </div>
                  </div>
                  <Button variant="outline" className="border-2 border-brand-turquoise">
                    Connecter
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
