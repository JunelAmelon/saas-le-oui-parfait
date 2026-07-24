'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { DiscoveryForm } from '@/components/discovery/DiscoveryForm';
import { useAuth } from '@/contexts/AuthContext';
import { addDocument, getDocument, updateDocument } from '@/lib/db';
import {
  DiscoveryFormData,
  defaultDiscoveryForm,
  setValue,
  normalizeDiscoveryForSave,
} from '@/lib/discovery';
import { toast } from 'sonner';
import { Loader2, ArrowLeft } from 'lucide-react';

export default function NewDiscoveryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = searchParams.get('clientId');
  const { user, loading: authLoading } = useAuth();
  const [initialData, setInitialData] = useState<DiscoveryFormData | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.uid) {
      router.push('/login');
      return;
    }

    async function init() {
      let form = defaultDiscoveryForm(user!.uid);
      if (clientId) {
        const client = await getDocument('clients', clientId).catch(() => null);
        if (client) {
          const c = client as any;
          form = setValue(form, 'client_id', clientId);
          form = setValue(form, 'type', 'client');
          form = setValue(form, 'name', c.name || '');
          form = setValue(form, 'partner', c.partner || '');
          form = setValue(form, 'email', c.email || '');
          form = setValue(form, 'phone', c.phone || '');
          form = setValue(form, 'weddingDate', c.event_date || '');
        }
      }

      const payload = normalizeDiscoveryForSave(form);
      try {
        const doc = await addDocument('discovery_forms', {
          ...payload,
          planner_id: user!.uid,
          status: 'draft',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        setDraftId(doc.id);
        setInitialData({ ...form, id: doc.id });
      } catch (e) {
        console.error('Error creating initial draft:', e);
        toast.error('Impossible de créer le brouillon');
      }
    }

    init();
  }, [user, authLoading, clientId, router]);

  const handleAutoSave = async (data: DiscoveryFormData) => {
    if (!draftId || !user?.uid) return;
    setIsAutoSaving(true);
    try {
      const { id: _, ...payload } = normalizeDiscoveryForSave(data) as any;
      await updateDocument('discovery_forms', draftId, {
        ...payload,
        planner_id: user.uid,
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.error('Auto-save error:', e);
    } finally {
      setIsAutoSaving(false);
    }
  };

  const handleComplete = async (data: DiscoveryFormData) => {
    if (!draftId || !user?.uid) return;
    setIsCompleting(true);
    try {
      const { id: _, ...payload } = normalizeDiscoveryForSave(data) as any;
      await updateDocument('discovery_forms', draftId, {
        ...payload,
        planner_id: user.uid,
        status: 'completed',
        updated_at: new Date().toISOString(),
      });
      toast.success('Fiche découverte terminée');
      router.push(`/agence/decouvertes/${draftId}`);
    } catch (e) {
      console.error('Error completing discovery form:', e);
      toast.error('Erreur lors de la finalisation');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleBack = () => {
    router.push('/agence/decouvertes');
  };

  if (authLoading || !initialData || !draftId) {
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
        <div className="flex items-center justify-between gap-4 mb-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={isAutoSaving || isCompleting}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux fiches
          </Button>
          <div className="text-sm text-brand-gray hidden sm:block">
            Brouillon auto-enregistré toutes les 5 s
          </div>
        </div>

        <DiscoveryForm
          mode="create"
          initialData={initialData}
          onAutoSave={handleAutoSave}
          onComplete={handleComplete}
          onCancel={handleBack}
          isAutoSaving={isAutoSaving}
          isCompleting={isCompleting}
        />
      </div>
    </DashboardLayout>
  );
}
