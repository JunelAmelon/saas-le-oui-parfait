'use client';

import { ClientSidebar } from './ClientSidebar';
import { ClientTopbar } from './ClientTopbar';
import { AssistantWidget } from '@/components/assistant/AssistantWidget';
import { useAuth } from '@/contexts/AuthContext';
import { useClientData } from '@/contexts/ClientDataContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

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
  const { user, loading: authLoading } = useAuth();
  const { client, loading: clientLoading } = useClientData();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !clientLoading && (!user || !client)) {
      router.push('/login');
    }
  }, [authLoading, clientLoading, user, client, router]);

  if (authLoading || clientLoading || !user || !client) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="h-8 w-8 rounded-full border-4 border-[#88b7b5] border-t-transparent animate-spin" />
      </div>
    );
  }

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
