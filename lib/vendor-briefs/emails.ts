/**
 * Notifications "fiche de préparation" envoyées au prestataire.
 * buildBriefEmail = fonction pure (sujet + corps, voix du planner).
 * sendBriefNotifications = orchestration email + notif in-app + push,
 * chaque canal en best-effort (un échec ne bloque jamais la sauvegarde).
 */

import { addDocument } from '@/lib/db';
import {
  getPersonRoleLabel,
  getPersonServiceLabel,
  type BriefData,
  type BriefPerson,
  type VendorBriefSchema,
} from './schemas';

export type BriefEmailKind = 'created' | 'updated';

export interface BriefEmailContext {
  coupleNames: string;
  weddingDate?: string | null; // ISO yyyy-mm-dd
  plannerName?: string | null;
  vendorFirstName?: string | null;
}

const formatWeddingDate = (iso?: string | null): string => {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

function personLine(schema: VendorBriefSchema, person: BriefPerson): string {
  const role = getPersonRoleLabel(schema, person.role);
  const services = (person.services || [])
    .map((s) => getPersonServiceLabel(schema, s))
    .filter(Boolean)
    .join(' + ');
  const touch = person.touch_up ? ', retouches en journée' : '';
  const rolePart = role && role !== '—' ? ` (${role})` : '';
  const servicesPart = services ? ` : ${services}` : '';
  return `• ${person.name}${rolePart}${servicesPart}${touch}`;
}

/**
 * Construit sujet + corps de l'email "fiche de préparation",
 * rédigé à la première personne (voix de la wedding planner).
 */
export function buildBriefEmail(
  schema: VendorBriefSchema,
  data: BriefData,
  ctx: BriefEmailContext,
  kind: BriefEmailKind
): { subject: string; text: string } {
  const service = schema.serviceLabel || 'prestation';
  const subject =
    kind === 'created'
      ? `Mariage de ${ctx.coupleNames} : je vous ai transmis la fiche de préparation`
      : `Mariage de ${ctx.coupleNames} : j'ai mis à jour la fiche de préparation`;

  const people = Array.isArray(data?.people) ? data.people : [];
  const dateFr = formatWeddingDate(ctx.weddingDate);
  const greeting = `Bonjour${ctx.vendorFirstName ? ` ${ctx.vendorFirstName}` : ''},`;

  // Signature unique : "Prénom Planner\nLe Oui Parfait", ou juste
  // "Le Oui Parfait" si le planner_name vaut déjà le nom de l'agence.
  const planner = ctx.plannerName?.trim() || '';
  const signature =
    planner && planner.toLowerCase() !== 'le oui parfait'
      ? `${planner}\nLe Oui Parfait`
      : 'Le Oui Parfait';

  const lines = [
    greeting,
    '',
    kind === 'created'
      ? `Je vous ai transmis la fiche de préparation ${service} pour le mariage de ${ctx.coupleNames}${dateFr ? `, prévu le ${dateFr}` : ''}.`
      : `J'ai mis à jour la fiche de préparation ${service} du mariage de ${ctx.coupleNames}. Voici la liste à jour :`,
    '',
  ];

  if (people.length > 0) {
    const plural = people.length > 1 ? 's' : '';
    const lead =
      kind === 'created'
        ? `Vous devrez préparer ${people.length} personne${plural} :`
        : `${people.length} personne${plural} à préparer :`;
    lines.push(lead, '', ...people.map((p) => personLine(schema, p)), '');
  }

  lines.push(
    'Vous trouverez le détail complet (photos et notes de chaque',
    "personne) dans votre espace pro, fiche mariage, onglet Infos.",
    '',
    'Si vous avez une question, écrivez-moi via la messagerie de',
    'votre espace pro.',
    '',
    'À très vite,',
    ...signature.split('\n')
  );

  return { subject, text: lines.join('\n') };
}

export interface SendBriefNotificationsOptions {
  vendorUid: string;
  bookingId: string | null;
  kind: BriefEmailKind;
  schema: VendorBriefSchema;
  data: BriefData;
  ctx: BriefEmailContext;
}

/**
 * Envoie notif in-app + email + push. Best-effort : un canal en
 * échec n'empêche pas les autres ni la sauvegarde du brief.
 */
export async function sendBriefNotifications(opts: SendBriefNotificationsOptions): Promise<void> {
  const { vendorUid, bookingId, kind, schema, data, ctx } = opts;
  const peopleCount = Array.isArray(data?.people) ? data.people.length : 0;
  const title = kind === 'created' ? 'Nouvelle fiche de préparation' : 'Fiche de préparation mise à jour';
  const message = `${ctx.coupleNames} : ${peopleCount} personne${peopleCount > 1 ? 's' : ''} à préparer`;
  const link = bookingId ? `/espace-pro/mariages/${bookingId}` : '/espace-pro/mariages';

  try {
    await addDocument('notifications', {
      recipient_id: vendorUid,
      type: 'brief',
      title,
      message,
      link,
      read: false,
      created_at: new Date(),
    });
  } catch (e) {
    console.warn('Brief in-app notification failed:', e);
  }

  try {
    const { sendEmailToUid } = await import('@/lib/email');
    const { subject, text } = buildBriefEmail(schema, data, ctx, kind);
    await sendEmailToUid({ recipientUid: vendorUid, subject, text });
  } catch (e) {
    console.warn('Brief email failed:', e);
  }

  try {
    const { sendPushToRecipient } = await import('@/lib/push');
    await sendPushToRecipient({ recipientId: vendorUid, title, body: message, link });
  } catch (e) {
    console.warn('Brief push notification failed:', e);
  }
}
