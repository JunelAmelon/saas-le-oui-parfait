import { WEDDING_TASK_TEMPLATES } from './wedding-task-templates';

function toDate(v: string | Date): Date | null {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

export interface WeddingTaskSeed {
  planner_id: string;
  client_id: string;
  event_id: string;
  kind: 'milestone';
  title: string;
  description: string;
  category: 'bride' | 'groom' | 'both';
  auto_generated: true;
  template_key: string;
  deadline: string;
  deadline_date: string;
  priority: 'normal' | 'urgent';
  reminder_offsets: number[];
  email_template_key: string;
  client_confirmed: false;
  admin_confirmed: false;
  created_at: string;
}

export function getWeddingTaskPayloads(
  clientId: string,
  plannerId: string,
  eventId: string,
  weddingDate: string | Date,
  signedAt: string | Date = new Date()
): WeddingTaskSeed[] {
  const wDate = toDate(weddingDate);
  const sDate = toDate(signedAt);
  if (!wDate || !sDate) return [];

  const now = new Date();
  const isLateSigning = daysBetween(wDate, sDate) < 240; // < 8 mois

  return WEDDING_TASK_TEMPLATES.map((tpl) => {
    const baseDeadline = addDays(wDate, tpl.offsetDays);

    // Si on est déjà passé après la date théorique de cette étape,
    // on pousse la deadline à J+7 (ou maintenant si très loin dans le passé)
    const isPast = daysBetween(now, baseDeadline) > 0;
    const isUrgent = isLateSigning && (tpl.category === 'bride' || tpl.key === 'robe_commande');

    let deadline = baseDeadline;
    if (isPast) {
      deadline = addDays(now, 7);
    }
    if (isUrgent && tpl.key === 'robe_commande') {
      deadline = addDays(now, 7);
    }

    const deadlineStr = deadline.toISOString().split('T')[0];

    return {
      planner_id: plannerId,
      client_id: clientId,
      event_id: eventId,
      kind: 'milestone' as const,
      title: tpl.title,
      description: tpl.description,
      category: tpl.category,
      auto_generated: true as const,
      template_key: tpl.key,
      deadline: deadlineStr,
      deadline_date: deadlineStr,
      priority: isUrgent ? 'urgent' : tpl.priority,
      reminder_offsets: tpl.reminderOffsets,
      email_template_key: tpl.emailTemplateKey,
      client_confirmed: false as const,
      admin_confirmed: false as const,
      created_at: now.toISOString(),
    };
  });
}
