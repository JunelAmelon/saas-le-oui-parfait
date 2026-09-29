/**
 * Автоматические напоминания паре (collection client_reminders).
 *
 * Одна запись = одно правило напоминания. Cron /api/cron/client-reminders
 * раз в день выбирает активные правила с наступившим next_send_at, шлёт
 * email + in-app уведомление и переносит next_send_at на interval_days вперёд.
 * Пара может закрыть правило кнопкой в личном кабинете (completed_at),
 * админ — паузой (active) или отметкой выполнения на странице Étapes.
 */

export type ClientReminderType = 'tenue' | 'alliances' | 'cadeaux_invites' | 'custom' | string;

export interface ClientReminderDef {
  type: ClientReminderType;
  label: string;
  subject: string;
  intervalDays: number;
  /** Nombre de jours avant la date du mariage pour le premier rappel (rétroplanning) */
  daysBeforeWedding: number;
  /** null = sans limite, jusqu'à confirmation du couple ou fin du mariage */
  maxSends: number | null;
}

export const CLIENT_REMINDER_DEFS: ClientReminderDef[] = [
  {
    type: 'tenue',
    label: 'Robe de mariée & costume',
    subject: 'Un petit point sur vos tenues du jour J — Le Oui Parfait',
    intervalDays: 120,
    daysBeforeWedding: 240, // 1er envoi ~8 mois avant, relance ~4 mois avant
    maxSends: 2,
  },
  {
    type: 'alliances',
    label: 'Alliances',
    subject: 'On parle alliances ? — Le Oui Parfait',
    intervalDays: 90,
    daysBeforeWedding: 180, // 1er envoi ~6 mois avant, relance ~3 mois avant
    maxSends: 2,
  },
  {
    type: 'cadeaux_invites',
    label: 'Finalisation des cadeaux des invités',
    subject: 'Une petite attention pour vos invités — Le Oui Parfait',
    intervalDays: 90,
    daysBeforeWedding: 120, // 1er envoi ~4 mois avant, relance ~1 mois avant
    maxSends: 2,
  },
];

export function reminderDef(type: string): ClientReminderDef | undefined {
  return CLIENT_REMINDER_DEFS.find((d) => d.type === type);
}

export function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Calcule la date du premier envoi selon le rétroplanning de la date du mariage (Option B).
 * - Si le mariage est lointain (ex: 2027) : démarre à (Date du mariage - X jours).
 * - Si le mariage est proche (délai théorique déjà dépassé) : démarre rapidement (ex: dans 7 jours ou aujourd'hui).
 */
export function calculateFirstSendDate(
  def: ClientReminderDef,
  weddingDateInput?: string | Date | null,
  now = new Date(),
): Date {
  return calculateScheduledSendDate(def, weddingDateInput, 0, now);
}

/**
 * Calcule la date d'un envoi précis (0 = mail d'information, 1 = relance, etc.)
 * selon le rétroplanning. Exemple tenue : J-240 puis J-120.
 */
export function calculateScheduledSendDate(
  def: ClientReminderDef,
  weddingDateInput?: string | Date | null,
  sendIndex = 0,
  now = new Date(),
): Date {
  if (weddingDateInput) {
    let wDate: Date | null = null;
    if (weddingDateInput instanceof Date) {
      wDate = Number.isNaN(weddingDateInput.getTime()) ? null : weddingDateInput;
    } else if (typeof weddingDateInput === 'string' && weddingDateInput.trim()) {
      const parsed = new Date(weddingDateInput.includes('T') ? weddingDateInput : `${weddingDateInput}T00:00:00`);
      wDate = Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    if (wDate && wDate > now) {
      const sendOffset = Math.max(0, def.daysBeforeWedding - def.intervalDays * sendIndex);
      const theoreticalDate = addDays(wDate, -sendOffset);
      // Si la date théorique est dans le futur, on l'utilise.
      if (theoreticalDate > now) {
        return theoreticalDate;
      }
      // Sinon (mariage proche ou nouvelle règle déjà dépassée), on laisse un petit délai.
      return addDays(now, 7);
    }
  }

  // Fallback si pas de date de mariage
  return addDays(now, def.intervalDays);
}

/**
 * Documents client_reminders par défaut pour une fiche client calculés selon le rétroplanning (Option B).
 */
export function defaultReminderPayloads(
  clientId: string,
  plannerId: string,
  weddingDate?: string | Date | null,
  now = new Date(),
): Array<Record<string, any>> {
  const nowIso = now.toISOString();
  return CLIENT_REMINDER_DEFS.map((def) => {
    const firstSend = calculateFirstSendDate(def, weddingDate, now);
    return {
      client_id: clientId,
      planner_id: plannerId,
      type: def.type,
      label: def.label,
      schedule_mode: 'wedding_based',
      interval_days: def.intervalDays,
      max_sends: def.maxSends,
      sent_count: 0,
      next_send_at: firstSend.toISOString(),
      last_sent_at: null,
      active: true,
      completed_at: null,
      completed_by: null,
      created_at: nowIso,
    };
  });
}

export interface ReminderMessageContext {
  sendIndex?: number;
  plannerName?: string;
  daysRemaining?: number | null;
  customLabel?: string;
}

function plannerSignature(plannerName?: string) {
  return plannerName || 'Votre wedding planner';
}

function daysText(daysRemaining?: number | null) {
  if (daysRemaining === null || daysRemaining === undefined) {
    return 'Votre mariage approche doucement';
  }
  return `Il reste ${daysRemaining} jour${daysRemaining > 1 ? 's' : ''} avant votre mariage`;
}

export function buildReminderEmail(
  type: string,
  coupleNames: string,
  baseUrl: string,
  context: ReminderMessageContext = {},
): { subject: string; text: string } {
  const url = `${baseUrl.replace(/\/$/, '')}/espace-client`;
  const planner = plannerSignature(context.plannerName);
  const days = daysText(context.daysRemaining);
  const isRelance = (context.sendIndex || 0) > 0;

  if (type === 'tenue') {
    return isRelance
      ? {
          subject: 'Vos tenues du jour J, on en est où ? — Le Oui Parfait',
          text:
            `Bonjour ${coupleNames},\n\n` +
            `${days}, et je reviens vers vous pour vos tenues du jour J.\n\n` +
            `Avez-vous déjà trouvé la robe et le costume ? Si vous êtes encore en phase de recherche ou de retouches, c’est vraiment le bon moment pour sécuriser tout ça tranquillement.\n\n` +
            `Et si tout est déjà réglé, alors c’est une excellente nouvelle. Vous pouvez simplement marquer cette étape comme terminée ici :\n${url}\n\n` +
            `Une fois les tenues bouclées, c’est déjà un beau morceau de préparation en moins.\n\n` +
            `À très vite,\n${planner}`,
        }
      : {
          subject: 'Un petit point sur vos tenues du jour J — Le Oui Parfait',
          text:
            `Bonjour ${coupleNames},\n\n` +
            `${days}, et c’est le bon moment pour commencer à penser à vos tenues, sans vous mettre de pression.\n\n` +
            `Pour la robe comme pour le costume, les plus belles options partent souvent vite, surtout quand il faut prévoir les essayages et les retouches. L’idée n’est pas de tout finaliser tout de suite, mais simplement de lancer les recherches tranquillement.\n\n` +
            `Quelques adresses, quelques essayages, et le reste viendra naturellement.\n\n` +
            `Quand cette étape sera bien avancée, vous pourrez la marquer dans votre espace client :\n${url}\n\n` +
            `Je reste à vos côtés,\n${planner}`,
        };
  }

  if (type === 'alliances') {
    return isRelance
      ? {
          subject: 'Petite relance pour vos alliances — Le Oui Parfait',
          text:
            `Bonjour ${coupleNames},\n\n` +
            `Je reviens vers vous pour vos alliances. ${days}, et c’est le bon moment pour vérifier que tout est en ordre.\n\n` +
            `Si vous les avez déjà choisies, tant mieux. Sinon, il est encore temps de finaliser tranquillement le modèle, la taille, la gravure et la récupération.\n\n` +
            `Une fois cette étape bouclée, vous pourrez la marquer dans votre espace client :\n${url}\n\n` +
            `C’est un petit détail qui vous suivra tous les jours, alors autant le régler avec le sourire.\n\n` +
            `À très vite,\n${planner}`,
        }
      : {
          subject: 'On parle alliances ? — Le Oui Parfait',
          text:
            `Bonjour ${coupleNames},\n\n` +
            `${days}, et c’est une très bonne période pour commencer à réfléchir à vos alliances.\n\n` +
            `C’est le genre de détail qui semble rapide au départ, puis on découvre les modèles, les tailles, les gravures et les délais de fabrication. Autant le faire calmement, pour trouver vraiment ce qui vous ressemble.\n\n` +
            `Prenez simplement un moment pour essayer quelques modèles et comparer vos coups de cœur.\n\n` +
            `Quand ce sera réglé, vous pourrez marquer l’étape comme terminée dans votre espace client :\n${url}\n\n` +
            `À très vite,\n${planner}`,
        };
  }

  if (type === 'cadeaux_invites') {
    return isRelance
      ? {
          subject: 'Dernier petit point sur les cadeaux invités — Le Oui Parfait',
          text:
            `Bonjour ${coupleNames},\n\n` +
            `${days} — on y est presque.\n\n` +
            `Je reviens vers vous pour les cadeaux invités : est-ce que tout est prêt de votre côté ? Si la commande et les petites finitions sont réglées, vous pouvez marquer cette étape comme terminée ici :\n${url}\n\n` +
            `Et s’il reste un dernier détail à boucler, c’est le bon moment pour le faire tranquillement.\n\n` +
            `Encore quelques petites choses à valider, et ensuite… place à la fête.\n\n` +
            `À très vite,\n${planner}`,
        }
      : {
          subject: 'Une petite attention pour vos invités — Le Oui Parfait',
          text:
            `Bonjour ${coupleNames},\n\n` +
            `${days}, et c’est un bon moment pour commencer à penser aux cadeaux invités.\n\n` +
            `Pas besoin d’en faire trop. Une petite attention simple, choisie avec le cœur, sera déjà parfaite. L’important, c’est surtout d’avoir une idée claire avant que les derniers mois arrivent.\n\n` +
            `Quand vous saurez ce que vous voulez offrir, tout le reste deviendra beaucoup plus simple.\n\n` +
            `Vous pourrez ensuite marquer cette étape comme terminée dans votre espace client :\n${url}\n\n` +
            `À très vite,\n${planner}`,
        };
  }

  const label = context.customLabel || 'Votre étape';
  return {
    subject: isRelance
      ? `Petite relance — ${label} — Le Oui Parfait`
      : `Petit point — ${label} — Le Oui Parfait`,
    text:
      `Bonjour ${coupleNames},\n\n` +
      `${days}, et je reviens vers vous au sujet de « ${label} ».\n\n` +
      (isRelance
        ? `Si cette étape est déjà bouclée, c’est parfait. Sinon, c’est le bon moment pour la sécuriser tranquillement.\n\n`
        : `C’est le bon moment pour avancer dessus tranquillement, sans attendre la dernière minute.\n\n`) +
      `Quand ce sera réglé, vous pourrez marquer cette étape comme terminée dans votre espace client :\n${url}\n\n` +
      `À très vite,\n${planner}`,
  };
}

export function buildReminderNotification(
  type: string,
  label: string,
  context: ReminderMessageContext = {},
): { title: string; message: string } {
  const isRelance = (context.sendIndex || 0) > 0;
  const planner = plannerSignature(context.plannerName);
  const stage = isRelance ? 'Petite relance' : 'Petit point';

  if (type === 'tenue') {
    return {
      title: isRelance ? 'Vos tenues du jour J, on en est où ?' : 'Tenues du jour J : on commence en douceur',
      message: `${planner} vous a envoyé un petit message au sujet de vos tenues. Marquez l’étape comme terminée quand tout est réglé.`,
    };
  }
  if (type === 'alliances') {
    return {
      title: isRelance ? 'Alliances : petite relance' : 'Alliances : le bon moment pour les choisir',
      message: `${planner} vous a envoyé un petit message au sujet de vos alliances. Marquez l’étape comme terminée quand tout est réglé.`,
    };
  }
  if (type === 'cadeaux_invites') {
    return {
      title: isRelance ? 'Cadeaux invités : dernier petit point' : 'Cadeaux invités : une attention à prévoir',
      message: `${planner} vous a envoyé un petit message au sujet des cadeaux invités. Marquez l’étape comme terminée quand tout est réglé.`,
    };
  }

  return {
    title: `${stage} — ${label}`,
    message: `${planner} vous a envoyé un rappel au sujet de « ${label} ». Marquez l’étape comme terminée quand tout est réglé.`,
  };
}
