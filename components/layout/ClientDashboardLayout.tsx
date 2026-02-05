'use client';

import { ClientSidebar } from './ClientSidebar';
import { ClientTopbar } from './ClientTopbar';

interface ClientDashboardLayoutProps {
  children: React.ReactNode;
  clientName?: string;
  daysRemaining?: number;
}

export function ClientDashboardLayout({ 
  children, 
  clientName = 'Julie & Frédérick',
  daysRemaining = 165
}: ClientDashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-brand-beige">
      <ClientSidebar />
      <ClientTopbar clientName={clientName} daysRemaining={daysRemaining} />
      <main className="ml-0 md:ml-64 pt-16">
        <div className="p-4 sm:p-6">{children}</div>
      </main>
    </div>
  );
}
