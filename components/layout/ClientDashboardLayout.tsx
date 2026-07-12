'use client';

import { ClientSidebar } from './ClientSidebar';
import { ClientTopbar } from './ClientTopbar';
import { AssistantWidget } from '@/components/assistant/AssistantWidget';

interface ClientDashboardLayoutProps {
  children: React.ReactNode;
  clientName?: string;
  daysRemaining?: number;
}

export function ClientDashboardLayout({
  children,
  clientName = 'Marie & Thomas',
  daysRemaining = 214,
}: ClientDashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-white text-[#4A4A4A] font-sans flex overflow-hidden">
      <ClientSidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen">
        <ClientTopbar clientName={clientName} daysRemaining={daysRemaining} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 min-w-0">{children}</main>
      </div>
      <AssistantWidget />
    </div>
  );
}
