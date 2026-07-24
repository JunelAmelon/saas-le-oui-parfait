'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DiscoveryForm } from '@/components/discovery/DiscoveryForm';
import { useAuth } from '@/contexts/AuthContext';
import { getDocument, updateDocument } from '@/lib/db';
import {
  DiscoveryFormData,
  convertDiscoveryToClient,
  normalizeDiscoveryForSave,
} from '@/lib/discovery';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function DiscoveryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { user, loading: authLoading } = useAuth();
  const [form, setForm] = useState<DiscoveryFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.uid) {
      router.push('/login');
      return;
    }
    if (!id) return;

    async function fetchForm() {
      try {
        const data = await getDocument('discovery_forms', id);
        if (!data) {
          toast.error('Fiche non trouvée');
          router.push('/agence/decouvertes');
          return;
        }
        const { id: _docId, ...rest } = data as any;
        setForm({ ...rest, id } as DiscoveryFormData);
      } catch (e) {
        console.error('Error fetching discovery form:', e);
        toast.error('Erreur lors du chargement');
      } finally {
        setLoading(false);
      }
    }

    fetchForm();
  }, [user, authLoading, id, router]);

  const handleAutoSave = async (data: DiscoveryFormData) => {
    if (!id || !user?.uid) return;
    setIsAutoSaving(true);
    try {
      const { id: _dataId, ...payload } = normalizeDiscoveryForSave(data) as any;
      await updateDocument('discovery_forms', id, {
        ...payload,
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.error('Auto-save error:', e);
    } finally {
      setIsAutoSaving(false);
    }
  };

  const handleComplete = async (data: DiscoveryFormData) => {
    if (!id || !user?.uid) return;
    setIsCompleting(true);
    try {
      const { id: _dataId, ...payload } = normalizeDiscoveryForSave(data) as any;
      await updateDocument('discovery_forms', id, {
        ...payload,
        status: 'completed',
        updated_at: new Date().toISOString(),
      });
      toast.success('Fiche terminée');
    } catch (e) {
      console.error('Error completing discovery form:', e);
      toast.error('Erreur lors de la finalisation');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleConvert = async (data: DiscoveryFormData) => {
    if (!user?.uid) return;
    setIsConverting(true);
    try {
      const clientId = await convertDiscoveryToClient(data, user.uid);
      if (clientId) {
        toast.success('Prospect converti en client');
        router.push(`/agence/clients?clientId=${clientId}`);
      } else {
        toast.error('Erreur lors de la conversion');
      }
    } catch (e) {
      console.error('Error converting prospect:', e);
      toast.error('Erreur lors de la conversion');
    } finally {
      setIsConverting(false);
    }
  };

  if (authLoading || loading || !form) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-12 w-12 animate-spin text-brand-turquoise" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-12">
        <DiscoveryForm
          mode="edit"
          initialData={form}
          onAutoSave={handleAutoSave}
          onComplete={handleComplete}
          onConvert={handleConvert}
          onCancel={() => router.push('/agence/decouvertes')}
          isAutoSaving={isAutoSaving}
          isCompleting={isCompleting}
          isConverting={isConverting}
        />
      </div>
    </DashboardLayout>
  );
}
