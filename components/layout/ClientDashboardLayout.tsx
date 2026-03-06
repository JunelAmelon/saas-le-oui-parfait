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
  clientName = 'Julie & Frédérick',
  daysRemaining = 165
}: ClientDashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-[#F4F4F2]">
      <ClientSidebar />
      <ClientTopbar clientName={clientName} daysRemaining={daysRemaining} />
      <main className="ml-0 md:ml-64 pt-16">
        <div className="p-4 sm:p-6">
          <div className="mx-auto max-w-6xl rounded-[28px] bg-white/70 backdrop-blur border border-white/60 shadow-[0_18px_60px_rgba(0,0,0,0.08)] p-4 sm:p-6">
            {children}
          </div>
        </div>
      </main>
      <AssistantWidget />
    </div>
  );
}
