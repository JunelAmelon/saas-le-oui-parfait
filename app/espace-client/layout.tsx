'use client';

import { ClientDataProvider } from '@/contexts/ClientDataContext';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClientDataProvider>
      {children}
    </ClientDataProvider>
  );
}
