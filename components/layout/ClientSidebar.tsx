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
  Euro,
  Image as ImageIcon,
  Users,
  CheckCircle,
  Settings,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface MenuItem {
  label: string;
  icon: React.ElementType;
  href: string;
}

const clientMenuItems: MenuItem[] = [
  {
    label: 'Tableau de bord',
    icon: LayoutDashboard,
    href: '/espace-client',
  },
  {
    label: 'Mon mariage',
    icon: Flower2,
    href: '/espace-client/mariage',
  },
  {
    label: 'Planning',
    icon: Calendar,
    href: '/espace-client/planning',
  },
  {
    label: 'Mes documents',
    icon: FileText,
    href: '/espace-client/documents',
  },
  {
    label: 'Messages',
    icon: MessageSquare,
    href: '/espace-client/messages',
  },
  {
    label: 'Fleurs',
    icon: Flower2,
    href: '/espace-client/fleurs',
  },
  {
    label: 'Paiements',
    icon: Euro,
    href: '/espace-client/paiements',
  },
  {
    label: 'Galerie photos',
    icon: ImageIcon,
    href: '/espace-client/galerie',
  },
  {
    label: 'Mes prestataires',
    icon: Users,
    href: '/espace-client/prestataires',
  },
  {
    label: 'Check-list',
    icon: CheckCircle,
    href: '/espace-client/checklist',
  },
  {
    label: 'Paramètres',
    icon: Settings,
    href: '/espace-client/parametres',
  },
];

export function ClientSidebar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  const SidebarContent = () => (
    <>
      <div className="flex h-16 items-center justify-between border-b border-[#E5E5E5] px-4">
        <Link href="/espace-client" className="flex items-center">
          <Image
            src="/logo-horizontal.png"
            alt="Le Oui Parfait"
            width={140}
            height={40}
            className="object-contain"
          />
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <X className="h-6 w-6" />
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {clientMenuItems.map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive(item.href)
                    ? 'bg-brand-turquoise text-white'
                    : 'text-brand-gray hover:bg-gray-100'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-[#E5E5E5] p-4">
        <div className="rounded-lg bg-brand-turquoise/10 p-4">
          <p className="text-sm font-medium text-brand-purple mb-1">
            Besoin d'aide ?
          </p>
          <p className="text-xs text-brand-gray mb-3">
            Contactez votre wedding planner
          </p>
          <Button
            size="sm"
            className="w-full bg-brand-turquoise hover:bg-brand-turquoise-hover text-white"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Contacter
          </Button>
        </div>
      </div>
    </>
  );

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setIsMobileMenuOpen(true)}
      >
        <Menu className="h-6 w-6" />
      </Button>

      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-[#E5E5E5] bg-white hidden md:flex flex-col">
        <SidebarContent />
      </aside>

      {isMobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="fixed left-0 top-0 z-50 h-screen w-64 border-r border-[#E5E5E5] bg-white flex flex-col md:hidden transform transition-transform">
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  );
}
