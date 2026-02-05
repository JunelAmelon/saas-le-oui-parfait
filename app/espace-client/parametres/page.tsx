'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClientDashboardLayout } from '@/components/layout/ClientDashboardLayout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Settings,
  User,
  Bell,
  Lock,
  Mail,
  Phone,
  Camera,
  Save,
  Shield,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useState } from 'react';

export default function ParametresPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
    reminders: true,
    updates: true,
    marketing: false,
  });

  return (
    <ClientDashboardLayout clientName="Julie & Frédérick" daysRemaining={165}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-purple flex items-center gap-2 sm:gap-3">
            <Settings className="h-6 w-6 sm:h-8 sm:w-8 text-brand-turquoise" />
            Paramètres
          </h1>
          <p className="text-sm sm:text-base text-brand-gray mt-1">
            Gérez votre compte et vos préférences
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 shadow-xl border-0">
              <h2 className="text-xl font-bold text-brand-purple mb-6 flex items-center gap-2">
                <User className="h-5 w-5 text-brand-turquoise" />
                Informations personnelles
              </h2>

              <div className="flex items-center gap-6 mb-6">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    <AvatarFallback className="bg-brand-turquoise text-white text-2xl">
                      JF
                    </AvatarFallback>
                  </Avatar>
                  <button className="absolute bottom-0 right-0 p-1.5 bg-brand-turquoise rounded-full text-white hover:bg-brand-turquoise-hover">
                    <Camera className="h-4 w-4" />
                  </button>
                </div>
                <div>
                  <p className="font-bold text-brand-purple">Julie & Frédérick</p>
                  <p className="text-sm text-brand-gray">Mariage le 23 août 2024</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="partner1">Partenaire 1</Label>
                  <Input id="partner1" defaultValue="Julie Martin" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="partner2">Partenaire 2</Label>
                  <Input id="partner2" defaultValue="Frédérick Dubois" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-brand-gray" />
                    <Input id="email" type="email" defaultValue="julie.frederick@email.com" className="pl-10" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="phone">Téléphone</Label>
                  <div className="relative mt-1">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-brand-gray" />
                    <Input id="phone" type="tel" defaultValue="06 12 34 56 78" className="pl-10" />
                  </div>
                </div>
              </div>

              <Button className="mt-6 bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2">
                <Save className="h-4 w-4" />
                Enregistrer
              </Button>
            </Card>

            <Card className="p-6 shadow-xl border-0">
              <h2 className="text-xl font-bold text-brand-purple mb-6 flex items-center gap-2">
                <Lock className="h-5 w-5 text-brand-turquoise" />
                Sécurité
              </h2>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="current-password">Mot de passe actuel</Label>
                  <div className="relative mt-1">
                    <Input
                      id="current-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-brand-gray" />
                      ) : (
                        <Eye className="h-4 w-4 text-brand-gray" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="new-password">Nouveau mot de passe</Label>
                  <Input id="new-password" type="password" placeholder="••••••••" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
                  <Input id="confirm-password" type="password" placeholder="••••••••" className="mt-1" />
                </div>
              </div>

              <Button variant="outline" className="mt-6 gap-2">
                <Shield className="h-4 w-4" />
                Changer le mot de passe
              </Button>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-6 shadow-xl border-0">
              <h2 className="text-xl font-bold text-brand-purple mb-6 flex items-center gap-2">
                <Bell className="h-5 w-5 text-brand-turquoise" />
                Notifications
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-brand-purple">Email</p>
                    <p className="text-xs text-brand-gray">Recevoir par email</p>
                  </div>
                  <Switch
                    checked={notifications.email}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, email: checked }))
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-brand-purple">Push</p>
                    <p className="text-xs text-brand-gray">Notifications push</p>
                  </div>
                  <Switch
                    checked={notifications.push}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, push: checked }))
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-brand-purple">SMS</p>
                    <p className="text-xs text-brand-gray">Recevoir par SMS</p>
                  </div>
                  <Switch
                    checked={notifications.sms}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, sms: checked }))
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-brand-purple">Rappels</p>
                    <p className="text-xs text-brand-gray">RDV et échéances</p>
                  </div>
                  <Switch
                    checked={notifications.reminders}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, reminders: checked }))
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-brand-purple">Mises à jour</p>
                    <p className="text-xs text-brand-gray">Nouveautés du projet</p>
                  </div>
                  <Switch
                    checked={notifications.updates}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, updates: checked }))
                    }
                  />
                </div>
              </div>
            </Card>

            <Card className="p-6 shadow-xl border-0 bg-red-50">
              <h3 className="font-bold text-red-700 mb-2">Zone de danger</h3>
              <p className="text-sm text-red-600 mb-4">
                Supprimer définitivement votre compte et toutes vos données.
              </p>
              <Button variant="destructive" size="sm">
                Supprimer mon compte
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </ClientDashboardLayout>
  );
}
