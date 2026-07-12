'use client';

import { useEffect, useState } from 'react';
import { ClientDashboardLayout } from '@/components/layout/ClientDashboardLayout';
import { ClientDevis } from '../tabs/ClientDevis';
import { useClientData } from '@/contexts/ClientDataContext';
import { calculateDaysRemaining } from '@/lib/client-helpers';
import { Loader2, FileText } from 'lucide-react';

export default function ClientDevisPage() {
  const { client, event, loading: dataLoading } = useClientData();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const daysRemaining = event ? calculateDaysRemaining(event.event_date) : 0;
  const coupleNames = event?.couple_names || client?.name || 'Client';

  if (!mounted || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#E7E4E9]">
        <div className="text-center">
          <Loader2 className="animate-spin h-8 w-8 text-brand-turquoise mx-auto" />
          <p className="mt-4 text-brand-gray">Chargement de vos devis...</p>
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
          Consultez et validez vos devis en ligne.
        </p>
      </div>

      {client?.id ? (
        <ClientDevis clientId={client.id} clientEmail={client.email} variant="table" />
      ) : (
        <p className="text-sm text-[#5A5A5A] text-center py-10">
          Aucune fiche client trouvée.
        </p>
      )}
    </ClientDashboardLayout>
  );
}
