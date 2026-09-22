'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { useAuth } from '@/contexts/AuthContext';
import { getDocuments, updateDocument } from '@/lib/db';
import { toast } from 'sonner';
import { WeddingDayTimeline } from '@/components/WeddingDayTimeline';
import { WeddingDayTimelineItem } from '@/lib/client-helpers';
import { getAssignedVendorNames, getWeddingDayRecipients, sendWeddingDayPdfToVendors, syncWeddingDayToVendorPlanning } from '@/lib/wedding-day-send';

export default function ClientOrdreDuJourPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<any>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [weddingTimeline, setWeddingTimeline] = useState<WeddingDayTimelineItem[]>([]);
  const [vendorOptions, setVendorOptions] = useState<string[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      if (!clientId) return;
      try {
        setLoading(true);
        const events = await getDocuments('events', [
          { field: 'client_id', operator: '==', value: clientId },
        ]);
        const ev =
          ((events as any[]) || []).find((x) => Boolean(x?.event_date)) ||
          (events?.[0] as any) ||
          null;
        setEvent(ev);
        setEventId(ev?.id || null);
        setWeddingTimeline(ev?.wedding_day_timeline || []);

        if (user?.uid) {
          getAssignedVendorNames({
            clientId,
            plannerId: user.uid,
            eventId: ev?.id || undefined,
          })
            .then(setVendorOptions)
            .catch(() => setVendorOptions([]));
        }
      } catch (e) {
        console.error('Error fetching ordre du jour:', e);
        toast.error("Erreur lors du chargement de l'ordre du jour");
      } finally {
        setLoading(false);
      }
    };
    void fetchAll();
  }, [clientId, user?.uid]);

  const sendToVendors = async (pdfBlob: Blob) => {
    if (!clientId || !user?.uid || !eventId) {
      toast.error("Impossible d'envoyer le planning");
      return;
    }
    try {
      toast.info('Génération et envoi du planning...');
      await sendWeddingDayPdfToVendors({
        clientId,
        plannerId: user.uid,
        eventId,
        coupleNames: event?.couple_names || '',
        pdfBlob,
      });
      toast.success('Planning envoyé aux prestataires');
    } catch (e: any) {
      console.error('Error sending planning to vendors:', e);
      toast.error(e?.message || "Erreur lors de l'envoi aux prestataires");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader title="Ordre du jour J" description="Planning horaire complet du mariage">
          <Button variant="outline" onClick={() => router.back()} className="w-full sm:w-auto gap-2">
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
        </PageHeader>

        {loading ? (
          <Card className="p-10 shadow-xl border-0">
            <div className="flex items-center justify-center gap-3 text-brand-gray">
              <Loader2 className="h-5 w-5 animate-spin" />
              Chargement...
            </div>
          </Card>
        ) : eventId ? (
          <Card className="p-6 shadow-xl border-0">
            <WeddingDayTimeline
              items={weddingTimeline}
              coupleNames={event?.couple_names || ''}
              eventDate={event?.event_date || ''}
              location={event?.location || ''}
              editable
              allowPdf
              allowSend
              vendorOptions={vendorOptions}
              onSend={sendToVendors}
              onFetchRecipients={async () =>
                getWeddingDayRecipients({
                  clientId,
                  plannerId: user?.uid,
                  eventId: eventId || undefined,
                })
              }
              onChange={async (items) => {
                try {
                  setWeddingTimeline(items);
                  await updateDocument('events', eventId, { wedding_day_timeline: items });
                  // Synchro : les moments assignes a un prestataire (champ "Qui")
                  // creent des creneaux dans son planning (vendor_planning_days).
                  if (user?.uid) {
                    try {
                      await syncWeddingDayToVendorPlanning({
                        clientId,
                        plannerId: user.uid,
                        eventId,
                        eventDate: event?.event_date || '',
                        items,
                      });
                    } catch (e) {
                      console.error('Error syncing vendor planning:', e);
                    }
                  }
                  toast.success('Ordre du jour enregistré');
                } catch (e) {
                  console.error('Error saving wedding timeline:', e);
                  toast.error('Erreur lors de la sauvegarde');
                }
              }}
            />
          </Card>
        ) : (
          <Card className="p-10 shadow-xl border-0">
            <div className="text-center text-brand-gray">
              Aucun événement trouvé pour ce client.
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
