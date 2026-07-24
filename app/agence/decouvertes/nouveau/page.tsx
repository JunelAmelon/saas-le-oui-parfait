'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { DiscoveryForm } from '@/components/discovery/DiscoveryForm';
import { useAuth } from '@/contexts/AuthContext';
import { getDocument, updateDocument, setDocument } from '@/lib/db';
import { db } from '@/lib/firebase';
import { collection, doc } from 'firebase/firestore';
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

  const draftIdRef = useRef<string | null>(null);
  const draftCreatedRef = useRef(false);
  const isSavingRef = useRef(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.uid) {
      router.push('/login');
      return;
    }

    async function init() {
      if (initializedRef.current) return;
      initializedRef.current = true;

      // Generate a local id without writing to Firestore: no empty ghost drafts are created on page load.
      const newDraftId = doc(collection(db, 'discovery_forms')).id;
      draftIdRef.current = newDraftId;
      setDraftId(newDraftId);

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
      setInitialData({ ...form, id: newDraftId });
    }

    init();
  }, [authLoading, user?.uid, clientId]);

  const handleAutoSave = async (data: DiscoveryFormData) => {
    if (!draftIdRef.current || !user?.uid) return;
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setIsAutoSaving(true);
    try {
      const { id: _, ...payload } = normalizeDiscoveryForSave(data) as any;
      if (!draftCreatedRef.current) {
        await setDocument('discovery_forms', draftIdRef.current, {
          ...payload,
          planner_id: user.uid,
          status: 'draft',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        draftCreatedRef.current = true;
      } else {
        await updateDocument('discovery_forms', draftIdRef.current, {
          ...payload,
          planner_id: user.uid,
          updated_at: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.error('Auto-save error:', e);
    } finally {
      setIsAutoSaving(false);
      isSavingRef.current = false;
    }
  };

  const handleComplete = async (data: DiscoveryFormData) => {
    if (!draftIdRef.current || !user?.uid) return;
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setIsCompleting(true);
    try {
      const { id: _, ...payload } = normalizeDiscoveryForSave(data) as any;
      if (!draftCreatedRef.current) {
        await setDocument('discovery_forms', draftIdRef.current, {
          ...payload,
          planner_id: user.uid,
          status: 'completed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        draftCreatedRef.current = true;
      } else {
        await updateDocument('discovery_forms', draftIdRef.current, {
          ...payload,
          planner_id: user.uid,
          status: 'completed',
          updated_at: new Date().toISOString(),
        });
      }
      toast.success('Fiche découverte terminée');
      router.push(`/agence/decouvertes/${draftIdRef.current}`);
    } catch (e) {
      console.error('Error completing discovery form:', e);
      toast.error('Erreur lors de la finalisation');
    } finally {
      setIsCompleting(false);
      isSavingRef.current = false;
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
            disabled={isCompleting}
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
