'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, Circle } from 'lucide-react';
import { getDocuments, updateDocument } from '@/lib/db';

type Step = {
  id: string;
  kind?: 'milestone';
  event_id: string;
  title: string;
  description?: string;
  deadline?: string;
  admin_confirmed?: boolean;
  client_confirmed?: boolean;
};

interface ClientStepsProps {
  eventId: string;
}

export function ClientSteps({ eventId }: ClientStepsProps) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSteps() {
      if (!eventId) {
        setSteps([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const items = await getDocuments('tasks', [{ field: 'event_id', operator: '==', value: eventId }]);
        const onlySteps = (items as any[]).filter((t) => t?.kind === 'milestone') as Step[];
        setSteps(onlySteps);
      } catch (e) {
        console.error('Error fetching steps (dashboard):', e);
        setSteps([]);
      } finally {
        setLoading(false);
      }
    }

    fetchSteps();
  }, [eventId]);

  const sortedSteps = useMemo(() => {
    return steps.slice().sort((a, b) => (a.deadline || '').localeCompare(b.deadline || ''));
  }, [steps]);

  if (!loading && sortedSteps.length === 0) {
    return null;
  }

  const toggleClientConfirm = async (step: Step) => {
    if (!step?.id) return;
    const next = !step.client_confirmed;

    setSteps((prev) => prev.map((s) => (s.id === step.id ? { ...s, client_confirmed: next } : s)));

    try {
      await updateDocument('tasks', step.id, { client_confirmed: next });
    } catch (e) {
      console.error('Error updating client_confirmed (dashboard):', e);
      setSteps((prev) => prev.map((s) => (s.id === step.id ? { ...s, client_confirmed: !next } : s)));
    }
  };

  return (
    <Card className="p-6 shadow-xl border-0">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold text-brand-purple">Étapes clés</h3>
          <p className="text-sm text-brand-gray">Suivez l&apos;avancement de vos étapes</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-brand-turquoise" />
        </div>
      ) : (
        <div className="space-y-3">
          {sortedSteps.slice(0, 5).map((s) => {
            const done = Boolean(s.admin_confirmed) && Boolean(s.client_confirmed);
            return (
              <div key={s.id} className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5">
                      {done ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-brand-purple truncate">{s.title}</p>
                      {s.deadline ? <p className="text-sm text-brand-gray">Échéance : {s.deadline}</p> : null}
                      {s.description ? <p className="text-sm text-brand-gray mt-1">{s.description}</p> : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={done ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                      {done ? 'Validée' : 'En cours'}
                    </Badge>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge className={s.admin_confirmed ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}>
                    Admin : {s.admin_confirmed ? 'confirmé' : 'en attente'}
                  </Badge>
                  <Badge className={s.client_confirmed ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}>
                    Vous : {s.client_confirmed ? 'confirmé' : 'en attente'}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-auto"
                    onClick={() => void toggleClientConfirm(s)}
                  >
                    {s.client_confirmed ? 'Annuler ma confirmation' : 'Je confirme'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
