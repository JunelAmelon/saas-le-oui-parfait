'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, Settings, LogOut } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NotificationsModal } from '@/components/modals/NotificationsModal';
import { useNotifications } from '@/hooks/use-notifications';
import { useAuth } from '@/contexts/AuthContext';
import { useVendorData } from '@/contexts/VendorDataContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface VendorTopbarProps {
  vendorName?: string;
}

export function VendorTopbar({ vendorName = 'Prestataire' }: VendorTopbarProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const { signOut, user } = useAuth();
  const { vendor } = useVendorData();
  const { items: notifications, unreadCount, markAllAsRead, markAsRead, deleteOne, deleteAll } = useNotifications(user?.uid);
  const pushInitRef = useRef(false);
  const router = useRouter();
  const { toast } = useToast();

  const computedVendorName = (() => {
    return (
      String(vendor?.name || '').trim() ||
      String(vendorName || '').trim() ||
      String(user?.full_name || '').trim() ||
      String(user?.email || '').trim() ||
      'Prestataire'
    );
  })();

  const initials = (() => {
    const source = computedVendorName || user?.email || 'PR';
    return (
      String(source)
        .split(/\s+|\s*&\s*/)
        .filter(Boolean)
        .map((x) => x[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'PR'
    );
  })();

  useEffect(() => {
    if (!user?.uid) return;
    if (pushInitRef.current) return;
    pushInitRef.current = true;
    void (async () => {
      try {
        const { registerPushToken } = await import('@/lib/push');
        await registerPushToken(user.uid);
      } catch (e) {
        console.warn('Unable to register push token:', e);
      }
    })();
  }, [user?.uid]);

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
      <header className="flex items-center justify-end gap-3.5 sm:gap-4 pt-6 pb-0 px-6 sm:px-8 lg:px-8 mb-7">
        <div className="flex items-center gap-3.5 sm:gap-4">
          <button
            onClick={() => setShowNotifications(true)}
            className="relative w-[38px] h-[38px] rounded-full bg-[#FAF9F7] flex items-center justify-center text-[#4B4456] hover:bg-[rgba(75,68,86,0.07)] transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[11px] leading-[18px] text-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            ) : null}
          </button>

          <div className="w-px h-7 bg-[rgba(75,68,86,0.12)]" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 shrink-0" aria-label="Menu utilisateur">
                <Avatar className="w-[34px] h-[34px] ring-2 ring-white shadow-sm">
                  {vendor?.logo ? <AvatarImage src={vendor.logo} alt={computedVendorName} className="object-cover" /> : null}
                  <AvatarFallback className="bg-[#4B4456] text-white text-[12px] font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:block text-[13.5px] font-semibold text-[#4B4456] whitespace-nowrap">
                  {computedVendorName}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5 text-sm font-medium text-[#4B4456]">{computedVendorName}</div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/espace-pro/parametres')}>
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

      <NotificationsModal
        open={showNotifications}
        onOpenChange={setShowNotifications}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkAllAsRead={markAllAsRead}
        onMarkAsRead={markAsRead}
        onDeleteOne={deleteOne}
        onDeleteAll={deleteAll}
      />
    </>
  );
}
