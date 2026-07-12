'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ClientDashboardLayout } from '@/components/layout/ClientDashboardLayout';
import { useClientData } from '@/contexts/ClientDataContext';
import { calculateDaysRemaining } from '@/lib/client-helpers';
import { Loader2, FileText } from 'lucide-react';

export default function ClientDevisPage() {
  const { client, event, loading: dataLoading } = useClientData();
  const router = useRouter();

  useEffect(() => {
    // Redirection temporaire : la page Devis est masquée
    router.replace('/espace-client/documents');
  }, [router]);

  const daysRemaining = event ? calculateDaysRemaining(event.event_date) : 0;
  const coupleNames = event?.couple_names || client?.name || 'Client';

  if (dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#E7E4E9]">
        <div className="text-center">
          <Loader2 className="animate-spin h-8 w-8 text-brand-turquoise mx-auto" />
          <p className="mt-4 text-brand-gray">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <ClientDashboardLayout clientName={coupleNames} daysRemaining={daysRemaining}>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-normal text-[#4B4456] flex items-center gap-3">
          <FileText className="h-7 w-7 text-brand-turquoise" />
          Mes devis
        </h1>
        <p className="text-sm text-[#5A5A5A] mt-1">
          Cette section est temporairement indisponible. Vous allez être redirigé vers vos documents.
        </p>
      </div>
    </ClientDashboardLayout>
  );
}
