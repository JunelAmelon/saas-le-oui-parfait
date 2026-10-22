'use client';

import { VendorSidebar } from './VendorSidebar';
import { VendorTopbar } from './VendorTopbar';

interface VendorDashboardLayoutProps {
  children: React.ReactNode;
  vendorName?: string;
}

export function VendorDashboardLayout({
  children,
  vendorName = 'Prestataire',
}: VendorDashboardLayoutProps) {
  return (
    <div className="min-h-screen supports-[height:100dvh]:min-h-[100dvh] bg-white text-[#4A4A4A] font-sans flex overflow-hidden">
      <VendorSidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen supports-[height:100dvh]:h-[100dvh]">
        <VendorTopbar vendorName={vendorName} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 min-w-0">{children}</main>
      </div>
    </div>
  );
}
