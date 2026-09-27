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
    subject: 'Petit rappel — votre tenue du jour J — Le Oui Parfait',
    intervalDays: 30,
    daysBeforeWedding: 240, // ~8 mois avant le mariage
    maxSends: 3,
  },
  {
    type: 'alliances',
    label: 'Alliances',
    subject: 'Petit rappel — les alliances — Le Oui Parfait',
    intervalDays: 90,
    daysBeforeWedding: 180, // ~6 mois avant le mariage
    maxSends: null,
  },
  {
    type: 'cadeaux_invites',
    label: 'Finalisation des cadeaux des invités',
    subject: 'Petit rappel — cadeaux des invités — Le Oui Parfait',
    intervalDays: 90,
    daysBeforeWedding: 120, // ~4 mois avant le mariage
    maxSends: null,
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
  if (weddingDateInput) {
    let wDate: Date | null = null;
    if (weddingDateInput instanceof Date) {
      wDate = Number.isNaN(weddingDateInput.getTime()) ? null : weddingDateInput;
    } else if (typeof weddingDateInput === 'string' && weddingDateInput.trim()) {
      const parsed = new Date(weddingDateInput.includes('T') ? weddingDateInput : `${weddingDateInput}T00:00:00`);
      wDate = Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    if (wDate && wDate > now) {
      const theoreticalDate = addDays(wDate, -def.daysBeforeWedding);
      // Si la date théorique est dans le futur, on commence à cette date
      if (theoreticalDate > now) {
        return theoreticalDate;
      }
      // Sinon (mariage dans moins de X mois), on commence dès maintenant
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

export function buildReminderEmail(
  type: string,
  coupleNames: string,
  baseUrl: string,
  customLabel?: string,
): { subject: string; text: string } {
  const url = `${baseUrl.replace(/\/$/, '')}/espace-client`;
  if (type === 'alliances') {
    return {
      subject: 'Petit rappel — les alliances — Le Oui Parfait',
      text:
        `Bonjour ${coupleNames},\n\n` +
        `Petit rappel au sujet des alliances : pensez à faire les démarches nécessaires à temps.\n\n` +
        `Dès que cette étape est bouclée, marquez-la dans votre espace client — les rappels s'arrêteront automatiquement :\n${url}\n\n` +
        `N'hésitez pas à nous prévenir dès que c'est fait.\n\n` +
        `Cordialement,\nL'équipe Le Oui Parfait`,
    };
  }
  if (type === 'cadeaux_invites') {
    return {
      subject: 'Petit rappel — cadeaux des invités — Le Oui Parfait',
      text:
        `Bonjour ${coupleNames},\n\n` +
        `Petit rappel au sujet de la finalisation des cadeaux des invités : pensez à faire les démarches nécessaires à temps.\n\n` +
        `Dès que cette étape est bouclée, marquez-la dans votre espace client — les rappels s'arrêteront automatiquement :\n${url}\n\n` +
        `N'hésitez pas à nous prévenir dès que c'est fait.\n\n` +
        `Cordialement,\nL'équipe Le Oui Parfait`,
    };
  }
  if (type === 'tenue') {
    return {
      subject: 'Petit rappel — votre tenue du jour J — Le Oui Parfait',
      text:
        `Bonjour ${coupleNames},\n\n` +
        `Petit rappel au sujet de la robe de mariée et du costume : pensez à faire les démarches nécessaires à temps.\n\n` +
        `Dès que cette étape est bouclée, marquez-la dans votre espace client — les rappels s'arrêteront automatiquement :\n${url}\n\n` +
        `N'hésitez pas à nous prévenir dès que c'est fait.\n\n` +
        `Cordialement,\nL'équipe Le Oui Parfait`,
    };
  }
  const label = customLabel || 'Votre étape';
  return {
    subject: `Petit rappel — ${label} — Le Oui Parfait`,
    text:
      `Bonjour ${coupleNames},\n\n` +
      `Petit rappel au sujet de l'étape « ${label} » : pensez à faire les démarches nécessaires à temps.\n\n` +
      `Dès que cette étape est bouclée, marquez-la dans votre espace client — les rappels s'arrêteront automatiquement :\n${url}\n\n` +
      `N'hésitez pas à nous prévenir dès que c'est fait.\n\n` +
      `Cordialement,\nL'équipe Le Oui Parfait`,
  };
}
