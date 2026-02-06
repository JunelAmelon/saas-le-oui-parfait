'use client';

import { useState } from 'react';
import { Bell, Settings, LogOut, User, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { QuickAddModal } from '@/components/modals/QuickAddModal';
import { MessagesModal } from '@/components/modals/MessagesModal';
import { NotificationsModal } from '@/components/modals/NotificationsModal';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface ClientTopbarProps {
  clientName?: string;
  daysRemaining?: number;
}

export function ClientTopbar({ clientName = 'Julie & Frédérick', daysRemaining = 165 }: ClientTopbarProps) {
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { signOut, user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        title: 'Déconnexion réussie',
        description: 'À bientôt!',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de se déconnecter',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <header className="fixed left-0 md:left-64 right-0 top-0 z-30 flex h-16 items-center justify-end border-b border-[#E5E5E5] bg-white px-4 md:px-6">
        <div className="flex items-center gap-1 md:gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => setShowNotifications(true)}
          >
            <Bell className="h-5 w-5 text-brand-gray" />
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500"></span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex"
            onClick={() => router.push('/espace-client/parametres')}
          >
            <Settings className="h-5 w-5 text-brand-gray" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="ml-1 md:ml-2 flex items-center gap-2 md:gap-3 rounded-lg p-1 hover:bg-gray-100">
                <Avatar className="h-8 w-8 md:h-9 md:w-9">
                  <AvatarFallback className="bg-brand-turquoise text-white font-medium text-sm">
                    {user?.email?.substring(0, 2).toUpperCase() || 'JF'}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left hidden lg:block">
                  <p className="text-sm font-medium text-brand-purple">
                    {clientName}
                  </p>
                  <p className="text-xs text-brand-gray">Client</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/espace-client/parametres')}>
                <Settings className="mr-2 h-4 w-4" />
                Paramètres
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <QuickAddModal open={showQuickAdd} onOpenChange={setShowQuickAdd} />
      <MessagesModal open={showMessages} onOpenChange={setShowMessages} />
      <NotificationsModal open={showNotifications} onOpenChange={setShowNotifications} />
    </>
  );
}
