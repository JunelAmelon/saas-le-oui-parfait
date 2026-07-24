'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, FileText } from 'lucide-react';
import { getDocuments } from '@/lib/db';
import { DiscoveryFormData } from '@/lib/discovery';
import { DiscoveryDocumentView } from '@/components/discovery/DiscoveryDocumentView';
import { toast } from 'sonner';

interface ClientDiscoveryTabProps {
  clientId: string;
}

export function ClientDiscoveryTab({ clientId }: ClientDiscoveryTabProps) {
  const router = useRouter();
  const [form, setForm] = useState<DiscoveryFormData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchForm() {
      try {
        const items = await getDocuments('discovery_forms', [
          { field: 'client_id', operator: '==', value: clientId },
        ]);
        const found = (items as any[])[0];
        if (found) setForm(found as DiscoveryFormData);
      } catch (e) {
        console.error('Error fetching discovery form:', e);
        toast.error('Erreur lors du chargement de la fiche découverte');
      } finally {
        setLoading(false);
      }
    }

    fetchForm();
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-10 w-10 animate-spin text-brand-turquoise" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <FileText className="h-12 w-12 text-brand-gray mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-brand-purple mb-2">Aucune fiche découverte</h3>
        <p className="text-sm text-brand-gray mb-6">Ce client n'a pas encore de fiche découverte liée.</p>
        <Button
          className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2"
          onClick={() => router.push(`/agence/decouvertes/nouveau?clientId=${clientId}`)}
        >
          <Plus className="h-4 w-4" />
          Créer une fiche découverte
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => router.push(`/agence/decouvertes/${form.id}`)}
        >
          Modifier la fiche
        </Button>
      </div>
      <DiscoveryDocumentView data={form} />
    </div>
  );
}
