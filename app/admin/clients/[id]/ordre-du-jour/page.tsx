'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

import { useAuth } from '@/contexts/AuthContext';
import { addDocument, getDocument, getDocuments, updateDocument } from '@/lib/db';
import { sendEmailToUid } from '@/lib/email';
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
  const [shareConfirmOpen, setShareConfirmOpen] = useState(false);
  const [sharingClient, setSharingClient] = useState(false);

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

  const sendToVendors = async () => {
    if (!clientId || !user?.uid || !eventId) {
      toast.error('Impossible de partager le planning');
      return;
    }
    try {
      toast.info('Partage du planning en cours...');
      await sendWeddingDayPdfToVendors({
        clientId,
        plannerId: user.uid,
        eventId,
        coupleNames: event?.couple_names || '',
      });
      toast.success('Planning partagé aux prestataires');
    } catch (e: any) {
      console.error('Error sharing planning to vendors:', e);
      toast.error(e?.message || 'Erreur lors du partage aux prestataires');
    }
  };

  const planningShared = Boolean(event?.planning_shared_client);

  // Affiche/masque le planning cote client. A l'activation : notification
  // in-app + email au couple. Chaque action est precedee d'une confirmation.
  const toggleClientShare = async () => {
    if (!eventId || !user?.uid) return;
    const next = !planningShared;
    setSharingClient(true);
    try {
      await updateDocument('events', eventId, {
        planning_shared_client: next,
        planning_shared_client_at: next ? new Date().toISOString() : null,
      });
      setEvent((prev: any) => ({ ...prev, planning_shared_client: next }));
      setShareConfirmOpen(false);

      if (next) {
        const names = event?.couple_names || 'votre mariage';
        try {
          const clientDoc = (await getDocument('clients', clientId)) as any;
          const uid = clientDoc?.client_user_id;
          const email = clientDoc?.email || clientDoc?.client_email || '';
          if (uid) {
            await addDocument('notifications', {
              recipient_id: uid,
              type: 'planning',
              title: 'Planning du jour J disponible',
              message: `Le planning du jour J de ${names} est disponible dans votre espace client, onglet Planning.`,
              link: '/espace-client/planning',
              read: false,
              created_at: new Date(),
              client_id: clientId,
              planner_id: user.uid,
            });
            await sendEmailToUid({
              recipientUid: uid,
              subject: 'Planning du jour J disponible - Le Oui Parfait',
              text: `Bonjour,\n\nLe planning du jour J de ${names} est disponible dans votre espace client, onglet Planning.\n\nLe Oui Parfait`,
            });
          } else {
            console.warn('Aucun compte client lie (client_user_id manquant)', { email });
          }
        } catch (e) {
          console.warn('Unable to notify client about planning:', e);
        }
        toast.success('Planning visible pour le couple — notification envoyée');
      } else {
        toast.success('Planning masqué pour le couple');
      }
    } catch (e) {
      console.error('Error toggling client planning share:', e);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setSharingClient(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader title="Planning du jour J" description="Déroulé horaire complet du mariage">
          {eventId && (
            <Button
              variant={planningShared ? 'outline' : 'default'}
              onClick={() => setShareConfirmOpen(true)}
              className={`w-full sm:w-auto gap-2 ${
                planningShared
                  ? 'border-[#B9847F] text-[#B9847F] hover:bg-[#B9847F]/10'
                  : 'bg-[#C9A96E] hover:bg-[#B8975E] text-white border-0'
              }`}
            >
              {planningShared ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {planningShared ? 'Masquer au couple' : 'Afficher au couple'}
            </Button>
          )}
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
                  toast.success('Planning du jour enregistré');
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

        {/* Confirmation afficher / masquer au couple */}
        <Dialog open={shareConfirmOpen} onOpenChange={setShareConfirmOpen}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-baskerville text-xl text-brand-purple">
                {planningShared ? 'Masquer le planning au couple' : 'Afficher le planning au couple'}
              </DialogTitle>
              <DialogDescription className="text-sm text-brand-gray">
                {planningShared
                  ? 'Le planning du jour J ne sera plus visible dans l’espace client. Confirmer ?'
                  : 'Le planning du jour J deviendra visible dans l’espace client et le couple recevra une notification et un email. Confirmer ?'}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShareConfirmOpen(false)} disabled={sharingClient}>
                Annuler
              </Button>
              <Button
                onClick={() => void toggleClientShare()}
                disabled={sharingClient}
                className={
                  planningShared
                    ? 'bg-[#B9847F] hover:bg-[#a6736f] text-white'
                    : 'bg-brand-turquoise hover:bg-brand-turquoise-hover text-white'
                }
              >
                {sharingClient ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {planningShared ? 'Masquer' : 'Afficher'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
