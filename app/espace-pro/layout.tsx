'use client';

import { VendorDataProvider } from '@/contexts/VendorDataContext';

export default function EspaceProLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <VendorDataProvider>
      {children}
    </VendorDataProvider>
  );
}
