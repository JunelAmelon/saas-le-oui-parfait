'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Users,
  Calendar,
  UsersRound,
  FileText,
  Package,
  Flower2,
  ShoppingBag,
  BarChart3,
  ChevronDown,
  Menu,
  X,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface MenuItem {
  label: string;
  icon: React.ElementType;
  href?: string;
  subItems?: { label: string; href: string }[];
}

const menuItems: MenuItem[] = [
  {
    label: 'Tableau de bord',
    icon: LayoutDashboard,
    href: '/',
  },
  {
    label: 'Agence',
    icon: Building2,
    subItems: [
      { label: 'Informations', href: '/agence' },
      { label: 'Fiches Clients', href: '/agence/clients' },
      { label: 'Todo', href: '/agence/todo' },
      { label: 'Mes post-it', href: '/agence/postit' },
       
      // { label: 'Signatures', href: '/agence/signatures' },
      // { label: 'Ma fiche annuaire', href: '/agence/annuaire' },
      { label: 'Campagnes email', href: '/agence/campagnes' },
    ],
  },
  {
    label: 'Prospects',
    icon: Users,
    subItems: [
      { label: 'Liste', href: '/prospects' },
      { label: 'Archives', href: '/prospects/archives' },
    ],
  },
  {
    label: 'Événements',
    icon: Calendar,
    subItems: [
      { label: 'Liste', href: '/evenements' },
      { label: 'Archives', href: '/evenements/archives' },
    ],
  },
  {
    label: 'Mes prestataires',
    icon: UsersRound,
    href: '/prestataires',
  },
  {
    label: 'Messagerie',
    icon: MessageSquare,
    href: '/messages',
  },
  {
    label: 'Devis & Facturation',
    icon: FileText,
    subItems: [
      { label: 'Devis', href: '/devis' },
      { label: 'Factures', href: '/factures' },
      { label: 'Contrats', href: '/contrats' },
    ],
  },
  {
    label: 'Gestion de stock',
    icon: Package,
    subItems: [
      { label: 'Articles', href: '/stock/articles' },
      { label: 'Inventaire', href: '/stock/inventaire' },
      { label: 'Fournisseurs', href: '/stock/fournisseurs' },
      { label: 'Entrepôts', href: '/stock/entrepots' },
    ],
  },
  {
    label: 'Composition florale',
    icon: Flower2,
    href: '/fleurs',
  },
  // {
  //   label: 'E-shop',
  //   icon: ShoppingBag,
  //   href: '/eshop',
  // },
  {
    label: 'Statistiques',
    icon: BarChart3,
    href: '/statistiques',
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
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

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label]
    );
  };

  const isActive = (href?: string, subItems?: { label: string; href: string }[]) => {
    if (href) {
      return pathname === href;
    }
    if (subItems) {
      return subItems.some((item) => pathname === item.href);
    }
    return false;
  };

  const SidebarContent = () => (
    <>
      <div className="flex h-16 items-center justify-between border-b border-[#E5E5E5] px-4">
        <Link href="/" className="flex items-center">
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
          {menuItems.map((item) => (
            <li key={item.label}>
              {item.subItems ? (
                <div>
                  <button
                    onClick={() => toggleExpand(item.label)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive(undefined, item.subItems)
                        ? 'bg-brand-turquoise text-white'
                        : 'text-brand-gray hover:bg-gray-100'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="flex-1 text-left">{item.label}</span>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 transition-transform',
                        expandedItems.includes(item.label) ? 'rotate-180' : ''
                      )}
                    />
                  </button>
                  {expandedItems.includes(item.label) && (
                    <ul className="ml-8 mt-1 space-y-1">
                      {item.subItems.map((subItem) => (
                        <li key={subItem.href}>
                          <Link
                            href={subItem.href}
                            className={cn(
                              'block rounded-lg px-3 py-2 text-sm transition-colors',
                              pathname === subItem.href
                                ? 'bg-brand-turquoise/10 text-brand-turquoise font-medium'
                                : 'text-brand-gray hover:bg-gray-100'
                            )}
                          >
                            {subItem.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <Link
                  href={item.href!}
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
              )}
            </li>
          ))}
        </ul>
      </nav>
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
