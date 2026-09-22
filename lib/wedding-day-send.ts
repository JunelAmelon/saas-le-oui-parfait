import { addDocument, deleteDocument, getDocuments, updateDocument } from './db';
import { uploadPdf } from './storage';
import { sendEmailToUid } from './email';
import { WeddingDayTimelineItem } from './client-helpers';

// Booking rattache au mariage : non annule et bon event_id quand present.
const isOnEvent = (b: any, eventId?: string) =>
  b.status !== 'cancelled' && (!eventId || !b.event_id || b.event_id === eventId);

export interface AssignedVendor {
  vendorId?: string;
  uid?: string; // uid du compte pro (notifications / emails)
  name: string;
}

// Liste UNIFIEE des prestataires assignes au mariage.
// Source unique : client_vendors (liens de l'onglet Prestataires de la fiche
// client, filtres planner_id + client_id), enrichis par vendors (nom, compte
// pro) et vendor_bookings (uniquement en fallback pour l'uid du compte pro).
// Utilisee par : select "Qui", modal d'envoi, envoi du PDF, synchro planning.
export async function getAssignedVendors(opts: {
  clientId: string;
  plannerId?: string;
  eventId?: string;
}): Promise<AssignedVendor[]> {
  const { clientId, plannerId, eventId } = opts;

  const [links, vendors, bookings] = await Promise.all([
    getDocuments('client_vendors', [
      { field: 'client_id', operator: '==', value: clientId },
    ]).catch(() => [] as any[]),
    plannerId
      ? getDocuments('vendors', [
          { field: 'planner_id', operator: '==', value: plannerId },
        ]).catch(() => [] as any[])
      : Promise.resolve([] as any[]),
    getDocuments('vendor_bookings', [
      { field: 'client_id', operator: '==', value: clientId },
    ]).catch(() => [] as any[]),
  ]);

  const vendorsById = new Map<string, any>((vendors || []).map((v: any) => [v.id, v]));
  const onEventBookings = (bookings || []).filter((b: any) => isOnEvent(b, eventId));

  const result = new Map<string, AssignedVendor>();

  // Seuls les liens d'assignation comptent (meme liste que l'onglet Prestataires)
  for (const l of (links || []).filter((l: any) => !plannerId || l.planner_id === plannerId)) {
    const v = l.vendor_id ? vendorsById.get(l.vendor_id) : undefined;
    const bk = onEventBookings.find(
      (b: any) =>
        (b.vendor_id && b.vendor_id === l.vendor_id) ||
        (b.vendor_uid && v?.pro_account_uid && b.vendor_uid === v.pro_account_uid)
    );
    const uid = v?.pro_account_uid || bk?.vendor_uid || undefined;
    const name = l.vendor_name || v?.name || bk?.vendor_name || 'Prestataire';
    const vendorId = l.vendor_id || v?.id;
    if (!vendorId && !uid) continue;
    result.set(vendorId || `uid:${uid}`, { vendorId, uid, name });
  }

  return Array.from(result.values());
}

// Noms des prestataires assignes (pour la liste du champ "Qui ?").
export async function getAssignedVendorNames(opts: {
  clientId: string;
  plannerId?: string;
  eventId?: string;
}): Promise<string[]> {
  const vendors = await getAssignedVendors(opts);
  return Array.from(
    new Set(vendors.map((v) => v.name).filter((n) => n && n !== 'Prestataire'))
  );
}

export interface WeddingDayRecipient {
  vendorId?: string;
  name: string;
  hasAccount: boolean;
}

// Destinataires de l'envoi : les prestataires assignes qui ont un compte pro.
export async function getWeddingDayRecipients(opts: {
  clientId: string;
  plannerId?: string;
  eventId?: string;
}): Promise<WeddingDayRecipient[]> {
  const vendors = await getAssignedVendors(opts);
  return vendors
    .filter((v) => v.uid)
    .map((v) => ({ vendorId: v.vendorId, name: v.name, hasAccount: true }));
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

  // Uniquement les prestataires assignes a ce mariage, avec un compte pro.
  const recipients = (await getAssignedVendors({ clientId, plannerId, eventId })).filter(
    (v) => v.uid
  );

  const vendorPlannings = (await getDocuments('vendor_plannings', [
    { field: 'client_id', operator: '==', value: clientId },
  ])) as any[];

  for (const v of recipients) {
    const existing = (vendorPlannings || []).find(
      (p) => v.vendorId && p.vendor_id === v.vendorId
    );
    const data: any = {
      client_id: clientId,
      planner_id: plannerId,
      doc_url: pdfUrl,
      doc_name: docName,
      updated_at: new Date().toISOString(),
    };
    if (existing?.id) {
      await updateDocument('vendor_plannings', existing.id, data);
    } else if (v.vendorId) {
      await addDocument('vendor_plannings', {
        ...data,
        vendor_id: v.vendorId,
        vendor_uid: v.uid || null,
        vendor_name: v.name || '',
        created_at: new Date().toISOString(),
      });
    }
  }

  // Notifications in-app + email aux prestataires (best effort, non bloquant)
  const names = coupleNames || 'vos mariés';
  for (const v of recipients) {
    if (!v.uid) continue;

    try {
      await addDocument('notifications', {
        recipient_id: v.uid,
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
        recipientUid: v.uid,
        subject: `Ordre du jour J - ${names} - Le Oui Parfait`,
        text: `Bonjour,\n\nLe planning complet du mariage de ${names} (ordre du jour J) vient de vous être envoyé.\n\nConnectez-vous à votre espace pro, onglet Planning de la fiche mariage, pour le consulter et le télécharger.\n\nLe Oui Parfait`,
      });
    } catch (e) {
      console.warn('Unable to send ordre du jour email:', e);
    }
  }
}

// Synchronise l'ordre du jour vers le planning de chaque prestataire :
// chaque moment dont le champ "Qui" correspond a un prestataire assigne
// cree/met a jour un creneau dans vendor_planning_days (date du mariage).
// Les creneaux issus de l'ordre du jour sont marques from_odj : ils sont
// remplaces a chaque sauvegarde ; les creneaux saisis a la main sont preserves.
export async function syncWeddingDayToVendorPlanning(opts: {
  clientId: string;
  plannerId: string;
  eventId?: string;
  eventDate?: string;
  items: WeddingDayTimelineItem[];
}): Promise<void> {
  const { clientId, plannerId, eventId, eventDate, items } = opts;
  if (!eventDate) return;

  const vendors = await getAssignedVendors({ clientId, plannerId, eventId });
  const byName = new Map(
    vendors
      .filter((v) => v.name && v.name !== 'Prestataire')
      .map((v) => [v.name.trim().toLowerCase(), v])
  );

  // Slots issus de l'ordre du jour, groupes par prestataire
  const odjSlotsByVendor = new Map<string, any[]>();
  for (const it of items || []) {
    const v = it.who ? byName.get(it.who.trim().toLowerCase()) : undefined;
    if (!v || !v.vendorId) continue;
    const description = [it.location, it.address, it.note || it.description]
      .filter(Boolean)
      .join(' — ');
    const slot = {
      time: it.time || '',
      title: it.title || '',
      description,
      from_odj: true,
    };
    odjSlotsByVendor.set(v.vendorId, [...(odjSlotsByVendor.get(v.vendorId) || []), slot]);
  }

  let days: any[] = [];
  try {
    days = (await getDocuments('vendor_planning_days', [
      { field: 'client_id', operator: '==', value: clientId },
    ])) as any[];
  } catch {
    days = [];
  }

  // Vendeurs touches : ceux qui ont des slots odj OU un jour existant avec des
  // slots odj (pour nettoyer ceux retires de l'ordre du jour).
  const touched = new Set<string>(Array.from(odjSlotsByVendor.keys()));
  for (const d of days || []) {
    if (d.vendor_id && (d.slots || []).some((s: any) => s.from_odj)) touched.add(d.vendor_id);
  }

  for (const vendorId of Array.from(touched)) {
    const v = vendors.find((x) => x.vendorId === vendorId);
    const odjSlots = odjSlotsByVendor.get(vendorId) || [];

    // Retirer les anciens slots odj sur les autres dates de ce vendeur
    for (const d of days || []) {
      if (d.vendor_id !== vendorId || d.date === eventDate) continue;
      const keep = (d.slots || []).filter((s: any) => !s.from_odj);
      if (keep.length !== (d.slots || []).length) {
        if (keep.length) {
          await updateDocument('vendor_planning_days', d.id, {
            slots: keep,
            updated_at: new Date().toISOString(),
          });
        } else {
          await deleteDocument('vendor_planning_days', d.id);
        }
      }
    }

    const day = (days || []).find((d) => d.vendor_id === vendorId && d.date === eventDate);
    const manualSlots = (day?.slots || []).filter((s: any) => !s.from_odj);
    const merged = [...manualSlots, ...odjSlots];

    if (day?.id) {
      if (merged.length) {
        await updateDocument('vendor_planning_days', day.id, {
          vendor_uid: v?.uid || day.vendor_uid || null,
          vendor_name: v?.name || day.vendor_name || '',
          slots: merged,
          updated_at: new Date().toISOString(),
        });
      } else {
        await deleteDocument('vendor_planning_days', day.id);
      }
    } else if (merged.length && v) {
      await addDocument('vendor_planning_days', {
        vendor_id: vendorId,
        vendor_uid: v.uid || null,
        planner_id: plannerId,
        client_id: clientId,
        vendor_name: v.name,
        date: eventDate,
        slots: merged,
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });
    }
  }
}
