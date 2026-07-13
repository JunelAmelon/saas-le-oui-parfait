'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Flower2,
  MessageSquare,
  CreditCard,
  Heart,
  Image as ImageIcon,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Map,
  Car,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

interface MenuItem {
  label: string;
  icon: React.ElementType;
  href: string;
  isComingSoon?: boolean;
}

const clientMenuItems: MenuItem[] = [
  { label: 'Tableau de bord', icon: LayoutDashboard, href: '/espace-client' },
  { label: 'Mon mariage', icon: Heart, href: '/espace-client/mariage' },
  { label: 'Documents', icon: FileText, href: '/espace-client/documents' },
  { label: 'Paiements', icon: CreditCard, href: '/espace-client/paiements' },
  { label: 'Planning', icon: Calendar, href: '/espace-client/planning' },
  { label: 'Messages', icon: MessageSquare, href: '/espace-client/messages' },
  { label: 'Galerie photos', icon: ImageIcon, href: '/espace-client/galerie' },
  { label: 'Mes prestataires', icon: Users, href: '/espace-client/prestataires' },
  { label: 'Fleurs', icon: Flower2, href: '/espace-client/fleurs', isComingSoon: true },
  { label: 'Plan de table 3D', icon: Map, href: '/espace-client/plan-table', isComingSoon: true },
  { label: 'Service chauffeur', icon: Car, href: '/espace-client/chauffeur', isComingSoon: true },
];

export function ClientSidebar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { signOut } = useAuth();

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
    if (href === '/espace-client') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const mainItems = clientMenuItems.filter((i) => !i.isComingSoon);
  const comingItems = clientMenuItems.filter((i) => i.isComingSoon);

  const SidebarContent = () => (
    <>
      <div className="flex items-center gap-2.5 mb-10 px-2">
        <Link href="/espace-client" className="flex items-center">
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
          Espace client
        </div>
        <ul className="space-y-0.5 mb-8">
          {mainItems.map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  isActive(item.href)
                    ? 'bg-[rgba(136,183,181,0.16)] text-[#4B4456]'
                    : 'text-[#5A5A5A] hover:bg-[rgba(75,68,86,0.07)]'
                )}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>

        {comingItems.length > 0 && (
          <>
            <div className="text-[10.5px] tracking-[0.15em] uppercase text-[#9C97A3] px-2 mb-2.5">
              À venir
            </div>
            <ul className="space-y-0.5 mb-8">
              {comingItems.map((item) => (
                <li key={item.label}>
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#5A5A5A] opacity-60 cursor-not-allowed">
                    <item.icon className="h-[18px] w-[18px] shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    <span className="text-[9px] uppercase tracking-wide bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                      Bientôt
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div>
        <div className="text-[10.5px] tracking-[0.15em] uppercase text-[#9C97A3] px-2 mb-2.5">
          Paramètres
        </div>
        <ul className="space-y-0.5">
          <li>
            <Link
              href="/espace-client/parametres"
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                isActive('/espace-client/parametres')
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

      <aside className="hidden md:flex w-[230px] shrink-0 flex-col border-r border-[rgba(75,68,86,0.08)] py-8 px-5">
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
