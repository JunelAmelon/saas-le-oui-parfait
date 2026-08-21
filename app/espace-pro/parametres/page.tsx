'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useVendorData } from '@/contexts/VendorDataContext';
import { VendorDashboardLayout } from '@/components/layout/VendorDashboardLayout';
import { Loader2, Mail, Phone, Globe, MapPin, User } from 'lucide-react';

export default function VendorParametresPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { vendor, loading: vendorLoading } = useVendorData();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'vendor') {
        router.push('/');
      }
    }
  }, [user, authLoading, router]);

  if (authLoading || !user || user.role !== 'vendor' || vendorLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-beige">
        <Loader2 className="animate-spin h-8 w-8 text-brand-turquoise" />
      </div>
    );
  }

  const infoItems = [
    { icon: User, label: 'Nom', value: vendor?.name || '—' },
    { icon: Mail, label: 'Email', value: vendor?.email || user?.email || '—' },
    { icon: Phone, label: 'Téléphone', value: vendor?.phone || '—' },
    { icon: MapPin, label: 'Ville', value: vendor?.city || '—' },
    { icon: Globe, label: 'Site web', value: vendor?.website || '—' },
  ];

  return (
    <VendorDashboardLayout vendorName={vendor?.name}>
      <div className="space-y-6">
        <div>
          <h1 className="font-baskerville text-2xl sm:text-[26px] text-[#4B4456] mb-1">
            Paramètres
          </h1>
          <p className="text-sm text-[#9C97A3]">
            Vos informations de prestataire
          </p>
        </div>

        <div className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] p-6">
          <h2 className="text-[15px] font-semibold text-[#4B4456] mb-5">Informations</h2>
          <div className="space-y-4">
            {infoItems.map((item) => (
              <div key={item.label} className="flex items-center gap-4 py-2">
                <div className="w-9 h-9 rounded-full bg-[#FAF9F7] flex items-center justify-center shrink-0">
                  <item.icon className="w-4 h-4 text-[#88b7b5]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-[#9C97A3] uppercase tracking-wide">{item.label}</div>
                  <div className="text-[14px] font-semibold text-[#4B4456] truncate">{item.value}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 bg-[#F0F9F8] rounded-xl border border-[#88b7b5]/20">
            <p className="text-xs text-[#9C97A3]">
              Pour modifier vos informations, contactez votre wedding planner.
            </p>
          </div>
        </div>
      </div>
    </VendorDashboardLayout>
  );
}
