'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/PageHeader';
import { ClientDiscoveryTab } from '@/components/client/ClientDiscoveryTab';
import { ArrowLeft } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';

export default function ClientDiscoveryPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Fiche découverte"
          description="Données de la fiche découverte liée au client"
        >
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="w-full sm:w-auto gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
        </PageHeader>

        <Card className="p-6 shadow-xl border-0">
          <ClientDiscoveryTab clientId={clientId} />
        </Card>
      </div>
    </DashboardLayout>
  );
}
