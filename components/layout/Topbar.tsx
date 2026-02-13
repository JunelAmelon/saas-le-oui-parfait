'use client';

import { useState } from 'react';
import { Bell, Settings, Plus, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TimerWidget } from '@/components/timer/TimerWidget';
import { QuickAddModal } from '@/components/modals/QuickAddModal';
import { MessagesModal } from '@/components/modals/MessagesModal';
import { NotificationsModal } from '@/components/modals/NotificationsModal';
import { useNotifications } from '@/hooks/use-notifications';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export function Topbar() {
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { signOut, user } = useAuth();
  const { items: notifications, unreadCount, markAllAsRead, markAsRead } = useNotifications(user?.uid);
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
      <header className="fixed left-0 md:left-64 right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-[#E5E5E5] bg-white px-4 md:px-6">
        <div className="flex items-center gap-2 md:gap-4">
          <Button
            onClick={() => setShowQuickAdd(true)}
            className="bg-[#C4A26A] hover:bg-[#B59260] text-white gap-2"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Ajout rapide</span>
          </Button>
          <TimerWidget />
        </div>

        <div className="flex items-center gap-1 md:gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => setShowNotifications(true)}
          >
            <Bell className="h-5 w-5 text-brand-gray" />
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[11px] leading-[18px] text-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            ) : null}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex"
            onClick={() => router.push('/settings')}
          >
            <Settings className="h-5 w-5 text-brand-gray" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="ml-1 md:ml-2 flex items-center gap-2 md:gap-3 rounded-lg p-1 hover:bg-gray-100">
                <Avatar className="h-8 w-8 md:h-9 md:w-9">
                  <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Kathy" alt="Kathy" />
                  <AvatarFallback className="bg-brand-turquoise text-white font-medium text-sm">
                    KA
                  </AvatarFallback>
                </Avatar>
                <div className="text-left hidden lg:block">
                  <p className="text-sm font-medium text-brand-purple">
                    Kathy
                  </p>
                  <p className="text-xs text-brand-gray">Wedding Planner</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/agence')}>
                <User className="mr-2 h-4 w-4" />
                Profil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/settings')}>
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
      <NotificationsModal
        open={showNotifications}
        onOpenChange={setShowNotifications}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkAllAsRead={markAllAsRead}
        onMarkAsRead={markAsRead}
      />
    </>
  );
}
