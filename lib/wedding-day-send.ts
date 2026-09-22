import { addDocument, getDocuments, updateDocument } from './db';
import { uploadPdf } from './storage';
import { sendEmailToUid } from './email';

// Un booking = un prestataire bien assigne au mariage : non annule, avec un
// compte pro (vendor_uid), et rattache a l'event quand il porte un event_id.
const isAssignedToEvent = (b: any, eventId?: string) =>
  b.status !== 'cancelled' &&
  Boolean(b.vendor_uid) &&
  (!eventId || !b.event_id || b.event_id === eventId);

export interface WeddingDayRecipient {
  vendorId?: string;
  name: string;
  hasAccount: boolean;
}

// Liste des prestataires assignes a ce mariage (pour la confirmation avant envoi).
// Le nom est resolu via : vendor_name du booking -> vendors/{vendor_id}.name
// -> vendor dont pro_account_uid == vendor_uid du booking.
export async function getWeddingDayRecipients(opts: {
  clientId: string;
  plannerId?: string;
  eventId?: string;
}): Promise<WeddingDayRecipient[]> {
  const all = (await getDocuments('vendor_bookings', [
    { field: 'client_id', operator: '==', value: opts.clientId },
  ])) as any[];
  const assigned = (all || []).filter((b) => isAssignedToEvent(b, opts.eventId));

  // Index des vendors du planner pour resoudre les noms en un seul fetch.
  let vendors: any[] = [];
  if (opts.plannerId) {
    try {
      vendors = (await getDocuments('vendors', [
        { field: 'planner_id', operator: '==', value: opts.plannerId },
      ])) as any[];
    } catch {
      vendors = [];
    }
  }
  const byId = new Map((vendors || []).map((v) => [v.id, v]));
  const byUid = new Map(
    (vendors || []).filter((v) => v.pro_account_uid).map((v) => [v.pro_account_uid, v])
  );

  return assigned.map((b) => {
    const v = (b.vendor_id && byId.get(b.vendor_id)) || (b.vendor_uid && byUid.get(b.vendor_uid));
    const name = b.vendor_name || v?.name || 'Prestataire';
    return {
      vendorId: b.vendor_id || v?.id,
      name,
      hasAccount: Boolean(b.vendor_uid || v?.pro_account_uid),
    };
  });
}

// Envoie le PDF de l'ordre du jour J aux prestataires assignes au mariage :
// upload sur le storage puis creation/mise a jour des vendor_plannings
// (la derniere version remplace l'ancienne), + notification in-app et email.
export async function sendWeddingDayPdfToVendors(opts: {
  clientId: string;
  plannerId: string;
  eventId?: string;
  coupleNames?: string;
  pdfBlob: Blob;
}): Promise<void> {
  const { clientId, plannerId, eventId, coupleNames, pdfBlob } = opts;
  const docName = `Ordre du jour - ${coupleNames || 'mariage'}.pdf`;
  const pdfUrl = await uploadPdf(pdfBlob, `planning-jour-j-${clientId}`);

  // Uniquement les prestataires assignes a ce mariage (non annules).
  const allBookings = (await getDocuments('vendor_bookings', [
    { field: 'client_id', operator: '==', value: clientId },
  ])) as any[];
  const bookings = (allBookings || []).filter((b) => isAssignedToEvent(b, eventId));

  const vendorPlannings = (await getDocuments('vendor_plannings', [
    { field: 'client_id', operator: '==', value: clientId },
  ])) as any[];

  for (const bk of bookings) {
    const existing = (vendorPlannings || []).find((p) => p.vendor_id === bk.vendor_id);
    const data: any = {
      client_id: clientId,
      planner_id: plannerId,
      doc_url: pdfUrl,
      doc_name: docName,
      updated_at: new Date().toISOString(),
    };
    if (existing?.id) {
      await updateDocument('vendor_plannings', existing.id, data);
    } else if (bk.vendor_id) {
      await addDocument('vendor_plannings', {
        ...data,
        vendor_id: bk.vendor_id,
        vendor_uid: bk.vendor_uid || null,
        vendor_name: bk.vendor_name || '',
        created_at: new Date().toISOString(),
      });
    }
  }

  // Notifications in-app + email aux prestataires (best effort, non bloquant)
  const names = coupleNames || 'vos mariés';
  for (const bk of bookings) {
    const uid = bk.vendor_uid;
    if (!uid) continue;

    try {
      await addDocument('notifications', {
        recipient_id: uid,
        type: 'planning',
        title: 'Ordre du jour J envoyé',
        message: `L'ordre du jour complet du mariage de ${names} vous a été envoyé. Consultez-le dans l'onglet Planning de la fiche mariage.`,
        link: '/espace-pro/mariages',
        read: false,
        created_at: new Date(),
      });
    } catch (e) {
      console.warn('Unable to notify vendor for ordre du jour:', e);
    }

    try {
      await sendEmailToUid({
        recipientUid: uid,
        subject: `Ordre du jour J - ${names} - Le Oui Parfait`,
        text: `Bonjour,\n\nLe planning complet du mariage de ${names} (ordre du jour J) vient de vous être envoyé.\n\nConnectez-vous à votre espace pro, onglet Planning de la fiche mariage, pour le consulter et le télécharger.\n\nLe Oui Parfait`,
      });
    } catch (e) {
      console.warn('Unable to send ordre du jour email:', e);
    }
  }
}
