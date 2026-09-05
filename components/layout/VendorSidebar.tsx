'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  Settings,
  LogOut,
  Menu,
  X,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useVendorData } from '@/contexts/VendorDataContext';
import { useUnreadMessages } from '@/hooks/use-unread-messages';

interface MenuItem {
  label: string;
  icon: React.ElementType;
  href: string;
}

const vendorMenuItems: MenuItem[] = [
  { label: 'Tableau de bord', icon: LayoutDashboard, href: '/espace-pro' },
  { label: 'Mariages', icon: Calendar, href: '/espace-pro/mariages' },
  { label: 'Messages', icon: MessageSquare, href: '/espace-pro/messages' },
];

export function VendorSidebar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { signOut } = useAuth();
  const { vendor } = useVendorData();
  const unreadMessages = useUnreadMessages({ role: 'vendor', id: vendor?.id });

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const isActive = (href: string) => {
    if (href === '/espace-pro') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const SidebarContent = () => (
    <>
      <div className="flex items-center gap-2.5 mb-10 px-2">
        <Link href="/espace-pro" className="flex items-center">
          <Image
            src="/logo-horizontal.png"
            alt="Le Oui Parfait"
            width={160}
            height={44}
            className="object-contain max-w-[150px] h-auto"
            priority
          />
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden ml-auto"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        <div className="text-[10.5px] tracking-[0.15em] uppercase text-[#9C97A3] px-2 mb-2.5">
          Espace pro
        </div>
        <ul className="space-y-0.5 mb-8">
          {vendorMenuItems.map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
                className={cn(
                  'flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  isActive(item.href)
                    ? 'bg-[rgba(136,183,181,0.16)] text-[#4B4456]'
                    : 'text-[#5A5A5A] hover:bg-[rgba(75,68,86,0.07)]'
                )}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.label === 'Messages' && unreadMessages > 0 ? (
                  <span className="ml-2 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[11px] leading-[18px] text-center">
                    {unreadMessages > 99 ? '99+' : unreadMessages}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="text-[10.5px] tracking-[0.15em] uppercase text-[#9C97A3] px-2 mb-2.5">
          Paramètres
        </div>
        <ul className="space-y-0.5">
          <li>
            <Link
              href="/espace-pro/parametres"
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                isActive('/espace-pro/parametres')
                  ? 'bg-[rgba(136,183,181,0.16)] text-[#4B4456]'
                  : 'text-[#5A5A5A] hover:bg-[rgba(75,68,86,0.07)]'
              )}
            >
              <Settings className="h-[18px] w-[18px] shrink-0" />
              <span>Paramètres</span>
            </Link>
          </li>
          <li>
            <button
              onClick={() => void signOut()}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#B9847F] hover:bg-[rgba(185,132,127,0.1)] transition-colors"
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" />
              <span>Déconnexion</span>
            </button>
          </li>
        </ul>
      </div>
    </>
  );

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden bg-white/80 backdrop-blur rounded-full shadow-sm"
        onClick={() => setIsMobileMenuOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <aside className="hidden md:flex w-[230px] h-screen shrink-0 flex-col border-r border-[rgba(75,68,86,0.08)] py-8 px-5">
        <SidebarContent />
      </aside>

      {isMobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="fixed left-0 top-0 z-50 h-screen w-[260px] bg-white flex flex-col md:hidden py-8 px-5 overflow-y-auto">
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  );
}
