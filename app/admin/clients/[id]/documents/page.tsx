'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ClientDocumentsPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  useEffect(() => {
    if (!clientId) return;
    router.replace(`/documents?clientId=${encodeURIComponent(clientId)}`);
  }, [clientId, router]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Card className="p-10 shadow-xl border-0">
          <div className="flex items-center justify-center gap-3 text-brand-gray">
            <Loader2 className="h-5 w-5 animate-spin" />
            Redirection vers la gestion des documents...
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
