import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { sendEmailServer } from '@/lib/notifications.server';

export const runtime = 'nodejs';

function getAuthOk(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) return false;
  return auth.slice('Bearer '.length) === secret;
}

function daysBetween(a: Date, b: Date) {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function toJsDate(v: any): Date | null {
  if (!v) return null;
  if (typeof v === 'string') {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (v.toDate) return v.toDate();
  if (v.seconds) return new Date(v.seconds * 1000);
  return null;
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
}

function formatDate(d: Date) {
  return d.toLocaleDateString('fr-FR');
}

async function getClientInfo(clientId: string): Promise<{ email: string | null; name: string; plannerId: string | null }> {
  try {
    const snap = await adminDb.collection('clients').doc(clientId).get();
    if (!snap.exists) return { email: null, name: 'Client', plannerId: null };
    const data = snap.data() as any;
    const email = data.email || data.client_email || null;
    const plannerId = data.planner_id || null;
    const coupleNames = data.couple_names
      || `${data.name || ''}${data.name && data.partner ? ' & ' : ''}${data.partner || ''}`.trim()
      || data.name
      || 'Client';
    return { email, name: coupleNames, plannerId };
  } catch {
    return { email: null, name: 'Client', plannerId: null };
  }
}

async function getPlannerEmail(plannerId: string): Promise<string | null> {
  try {
    const snap = await adminDb.collection('profiles').doc(plannerId).get();
    if (snap.exists) return (snap.data() as any)?.email || null;
    return null;
  } catch {
    return null;
  }
}

interface ReminderResult {
  type: 'invoice' | 'vendor_payment' | 'client_acompte';
  id: string;
  reference: string;
  amount: number;
  dueDate: Date | null;
  daysLate: number;
  reminderTier: string;
  clientEmail: string | null;
  clientName: string;
  clientId: string;
  vendorName: string | null;
  plannerId: string | null;
  status: 'sent' | 'skipped_no_email' | 'skipped_already_sent' | 'error';
}

const REMINDER_TIERS = [
  { days: -14, label: 'J-14' },
  { days: -3, label: 'J-3' },
  { days: 0, label: 'J+0' },
  { days: 3, label: 'J+3' },
  { days: 7, label: 'J+7' },
  { days: 14, label: 'J+14' },
];

function buildClientSubject(daysLate: number, reference: string, isVendor: boolean, vendorName?: string): string {
  if (daysLate === -14) {
    return `Échéance dans 14 jours : ${reference} — Le Oui Parfait`;
  }
  if (daysLate === -3) {
    return `Échéance dans 3 jours : ${reference} — Le Oui Parfait`;
  }
  if (daysLate === 0) {
    return `Échéance aujourd'hui : ${reference} — Le Oui Parfait`;
  }
  if (isVendor) {
    return `Rappel acompte : ${vendorName || 'Prestataire'} — Le Oui Parfait`;
  }
  return `Rappel de paiement : ${reference} — Le Oui Parfait`;
}

function buildClientText(
  daysLate: number,
  name: string,
  amount: number,
  reference: string,
  dueDate: Date,
  isVendor: boolean,
  vendorName?: string,
): string {
  const absDays = Math.abs(daysLate);
  const formattedAmount = formatAmount(amount);
  const formattedDate = formatDate(dueDate);
  const itemLabel = isVendor
    ? `l'acompte ${reference} pour ${vendorName || 'votre prestataire'}`
    : `la facture ${reference}`;

  if (daysLate === -14) {
    return (
      `Bonjour ${name},\n\n`
      + `Nous vous informons que votre paiement de ${formattedAmount} pour ${itemLabel} arrive à échéance le ${formattedDate} (soit dans 14 jours).\n\n`
      + `Merci de prévoir le règlement dans les meilleurs délais via votre espace client.\n\n`
      + `Cordialement,\nL'équipe Le Oui Parfait`
    );
  }
  if (daysLate === -3) {
    return (
      `Bonjour ${name},\n\n`
      + `Votre paiement de ${formattedAmount} pour ${itemLabel} arrive à échéance le ${formattedDate} (soit dans 3 jours).\n\n`
      + `Merci de procéder au règlement dans les meilleurs délais.\n\n`
      + `Cordialement,\nL'équipe Le Oui Parfait`
    );
  }
  if (daysLate === 0) {
    return (
      `Bonjour ${name},\n\n`
      + `Votre paiement de ${formattedAmount} pour ${itemLabel} arrive à échéance aujourd'hui (${formattedDate}).\n\n`
      + `Merci de procéder au règlement dès que possible.\n\n`
      + `Cordialement,\nL'équipe Le Oui Parfait`
    );
  }
  // Retard (J+3, J+7, J+14)
  return (
    `Bonjour ${name},\n\n`
    + `Votre paiement de ${formattedAmount} pour ${itemLabel} était attendu pour le ${formattedDate} (soit ${absDays} jour${absDays > 1 ? 's' : ''} de retard).\n\n`
    + `Merci de régulariser votre situation dans les meilleurs délais.\n\n`
    + `Cordialement,\nL'équipe Le Oui Parfait`
  );
}

export async function GET(req: Request) {
  try {
    if (!getAuthOk(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const now = new Date();
    const results: ReminderResult[] = [];

    // ──────────────────────────────────────────────
    // 1. Factures impayées (invoices)
    // ──────────────────────────────────────────────
    const invoiceSnap = await adminDb
      .collection('invoices')
      .where('status', 'in', ['sent', 'payment_pending', 'overdue'])
      .get();

    const invoiceDocs: Array<{ id: string; data: any }> = [];
    invoiceSnap.forEach((d) => invoiceDocs.push({ id: d.id, data: d.data() as any }));

    for (const { id, data } of invoiceDocs) {
      const dueDate = toJsDate(data.due_date);
      if (!dueDate) continue;

      const daysLate = daysBetween(now, dueDate);

      const tier = REMINDER_TIERS.find((t) => daysLate >= t.days && daysLate < t.days + 1);
      if (!tier) continue;

      const lastTier = data.last_reminder_tier;
      if (lastTier === tier.label) {
        results.push({
          type: 'invoice', id, reference: data.reference || data.number || 'Facture',
          amount: Number(data.amount_ttc || 0), dueDate, daysLate, reminderTier: tier.label,
          clientEmail: null, clientName: '', clientId: data.client_id || '', vendorName: null, plannerId: null,
          status: 'skipped_already_sent',
        });
        continue;
      }

      const clientId = data.client_id;
      if (!clientId) continue;

      const { email, name, plannerId } = await getClientInfo(clientId);
      const reference = data.reference || data.number || 'Facture';
      const amount = Number(data.amount_ttc || 0);

      if (!email) {
        results.push({
          type: 'invoice', id, reference, amount, dueDate, daysLate, reminderTier: tier.label,
          clientEmail: null, clientName: name, clientId, vendorName: null, plannerId,
          status: 'skipped_no_email',
        });
        continue;
      }

      const subject = buildClientSubject(daysLate, reference, false);
      const text = buildClientText(daysLate, name, amount, reference, dueDate, false);

      try {
        await sendEmailServer({ to: email, subject, text });

        await adminDb.collection('invoices').doc(id).update({
          last_reminder_sent: now,
          last_reminder_tier: tier.label,
        });

        results.push({
          type: 'invoice', id, reference, amount, dueDate, daysLate, reminderTier: tier.label,
          clientEmail: email, clientName: name, clientId, vendorName: null, plannerId,
          status: 'sent',
        });
      } catch (e) {
        results.push({
          type: 'invoice', id, reference, amount, dueDate, daysLate, reminderTier: tier.label,
          clientEmail: email, clientName: name, clientId, vendorName: null, plannerId,
          status: 'error',
        });
      }
    }

    // ──────────────────────────────────────────────
    // 2. Acomptes prestataires impayés (vendor_payments)
    // ──────────────────────────────────────────────
    const vendorPaymentSnap = await adminDb
      .collection('vendor_payments')
      .get();

    const vendorPaymentDocs: Array<{ id: string; data: any }> = [];
    vendorPaymentSnap.forEach((d) => {
      const data = d.data() as any;
      if (data.status === 'paid' || data.status === 'cancelled') return;
      vendorPaymentDocs.push({ id: d.id, data });
    });

    for (const { id, data } of vendorPaymentDocs) {
      const dueDate = toJsDate(data.due_date);
      if (!dueDate) continue;

      const daysLate = daysBetween(now, dueDate);

      const tier = REMINDER_TIERS.find((t) => daysLate >= t.days && daysLate < t.days + 1);
      if (!tier) continue;

      const lastTier = data.last_reminder_tier;
      if (lastTier === tier.label) {
        results.push({
          type: 'vendor_payment', id, reference: data.label || 'Acompte',
          amount: Number(data.amount || 0), dueDate, daysLate, reminderTier: tier.label,
          clientEmail: null, clientName: '', clientId: data.client_id || '', vendorName: data.vendor_name || null, plannerId: null,
          status: 'skipped_already_sent',
        });
        continue;
      }

      const clientId = data.client_id;
      if (!clientId) continue;

      const { name, plannerId } = await getClientInfo(clientId);
      const reference = data.label || 'Acompte prestataire';
      const amount = Number(data.amount || 0);
      const vendorName = data.vendor_name || 'votre prestataire';

      // Pas d'envoi d'email au client pour les acomptes prestataires
      // On met juste à jour le tier pour le suivi et on alimente le récap planner
      await adminDb.collection('vendor_payments').doc(id).update({
        last_reminder_sent: now,
        last_reminder_tier: tier.label,
      });

      results.push({
        type: 'vendor_payment', id, reference, amount, dueDate, daysLate, reminderTier: tier.label,
        clientEmail: null, clientName: name, clientId, vendorName, plannerId,
        status: 'sent',
      });
    }

    // ──────────────────────────────────────────────
    // 3. Acomptes client impayés (client_acomptes)
    // ──────────────────────────────────────────────
    const clientAcompteSnap = await adminDb
      .collection('client_acomptes')
      .get();

    const clientAcompteDocs: Array<{ id: string; data: any }> = [];
    clientAcompteSnap.forEach((d) => {
      const data = d.data() as any;
      if (data.status === 'paid' || data.status === 'cancelled') return;
      clientAcompteDocs.push({ id: d.id, data });
    });

    for (const { id, data } of clientAcompteDocs) {
      const dueDate = toJsDate(data.due_date);
      if (!dueDate) continue;

      const daysLate = daysBetween(now, dueDate);

      const tier = REMINDER_TIERS.find((t) => daysLate >= t.days && daysLate < t.days + 1);
      if (!tier) continue;

      const lastTier = data.last_reminder_tier;
      if (lastTier === tier.label) {
        results.push({
          type: 'client_acompte', id, reference: data.label || 'Acompte',
          amount: Number(data.amount || 0), dueDate, daysLate, reminderTier: tier.label,
          clientEmail: null, clientName: '', clientId: data.client_id || '', vendorName: null, plannerId: null,
          status: 'skipped_already_sent',
        });
        continue;
      }

      const clientId = data.client_id;
      if (!clientId) continue;

      const { email, name, plannerId } = await getClientInfo(clientId);
      const reference = data.label || 'Acompte';
      const amount = Number(data.amount || 0);

      if (!email) {
        results.push({
          type: 'client_acompte', id, reference, amount, dueDate, daysLate, reminderTier: tier.label,
          clientEmail: null, clientName: name, clientId, vendorName: null, plannerId,
          status: 'skipped_no_email',
        });
        continue;
      }

      const subject = buildClientSubject(daysLate, reference, false);
      const text = buildClientText(daysLate, name, amount, reference, dueDate, false);

      try {
        await sendEmailServer({ to: email, subject, text });

        await adminDb.collection('client_acomptes').doc(id).update({
          last_reminder_sent: now,
          last_reminder_tier: tier.label,
        });

        results.push({
          type: 'client_acompte', id, reference, amount, dueDate, daysLate, reminderTier: tier.label,
          clientEmail: email, clientName: name, clientId, vendorName: null, plannerId,
          status: 'sent',
        });
      } catch (e) {
        results.push({
          type: 'client_acompte', id, reference, amount, dueDate, daysLate, reminderTier: tier.label,
          clientEmail: email, clientName: name, clientId, vendorName: null, plannerId,
          status: 'error',
        });
      }
    }

    // ──────────────────────────────────────────────
    // 4. Recap planner - factures (groupe par couple)
    // ──────────────────────────────────────────────
    const sentReminders = results.filter((r) => r.status === 'sent');
    const invoiceReminders = sentReminders.filter((r) => r.type === 'invoice');
    const vendorReminders = sentReminders.filter((r) => r.type === 'vendor_payment');
    const clientAcompteReminders = sentReminders.filter((r) => r.type === 'client_acompte');

    const sendPlannerRecap = async (reminders: ReminderResult[], subject: string, intro: string) => {
      if (reminders.length === 0) return;

      // Recuperer le plannerId depuis les reminders
      const plannerId = reminders.find((r) => r.plannerId)?.plannerId;
      if (!plannerId) return;
      const plannerEmail = await getPlannerEmail(plannerId);
      if (!plannerEmail) return;

      // Grouper par couple (clientId)
      const byCouple = new Map<string, { name: string; items: ReminderResult[] }>();
      for (const r of reminders) {
        const key = r.clientId || r.clientName;
        if (!byCouple.has(key)) {
          byCouple.set(key, { name: r.clientName || 'Couple', items: [] });
        }
        byCouple.get(key)!.items.push(r);
      }

      const coupleBlocks: string[] = [];
      byCouple.forEach(({ name, items }) => {
        const lines = items.map((r: ReminderResult) => {
          const absDays = Math.abs(r.daysLate);
          const amountStr = formatAmount(r.amount);
          const dateStr = r.dueDate ? formatDate(r.dueDate) : '-';

          if (r.daysLate < 0) {
            const daysLabel = absDays === 1 ? '1 jour' : `${absDays} jours`;
            if (r.type === 'vendor_payment') {
              return `  - Il reste ${daysLabel} pour que le couple paye l'acompte ${r.reference} de ${amountStr} pour ${r.vendorName || 'le prestataire'} (échéance le ${dateStr})`;
            }
            if (r.type === 'client_acompte') {
              return `  - Il reste ${daysLabel} pour que le couple paye l'acompte ${r.reference} de ${amountStr} (échéance le ${dateStr})`;
            }
            return `  - Il reste ${daysLabel} pour que le couple paye la facture ${r.reference} de ${amountStr} (échéance le ${dateStr})`;
          }
          if (r.daysLate === 0) {
            if (r.type === 'vendor_payment') {
              return `  - L'acompte ${r.reference} de ${amountStr} pour ${r.vendorName || 'le prestataire'} arrive à échéance aujourd'hui (${dateStr})`;
            }
            if (r.type === 'client_acompte') {
              return `  - L'acompte ${r.reference} de ${amountStr} arrive à échéance aujourd'hui (${dateStr})`;
            }
            return `  - La facture ${r.reference} de ${amountStr} arrive à échéance aujourd'hui (${dateStr})`;
          }
          // Retard
          const daysLabel = absDays === 1 ? '1 jour' : `${absDays} jours`;
          if (r.type === 'vendor_payment') {
            return `  - L'acompte ${r.reference} de ${amountStr} pour ${r.vendorName || 'le prestataire'} a ${daysLabel} de retard (échéance le ${dateStr})`;
          }
          if (r.type === 'client_acompte') {
            return `  - L'acompte ${r.reference} de ${amountStr} a ${daysLabel} de retard (échéance le ${dateStr})`;
          }
          return `  - La facture ${r.reference} de ${amountStr} a ${daysLabel} de retard (échéance le ${dateStr})`;
        });

        coupleBlocks.push(`COUPLE ${name} :\n${lines.join('\n')}`);
      });

      const recapText =
        `Bonjour,\n\n`
        + intro + `\n\n`
        + coupleBlocks.join('\n\n')
        + `\n\nLes rappels automatiques ont déjà été envoyés aux couples concernés.\n\n`
        + `Cordialement,\nL'équipe Le Oui Parfait`;

      await sendEmailServer({ to: plannerEmail, subject, text: recapText });
    }

    // Recap factures + acomptes client (un seul mail)
    await sendPlannerRecap(
      [...invoiceReminders, ...clientAcompteReminders],
      `Récapitulatif des rappels de paiement — Le Oui Parfait`,
      `Voici le récapitulatif des paiements à venir et en retard de vos couples :`,
    );

    return NextResponse.json({
      ok: true,
      date: now.toISOString(),
      checked_invoices: invoiceDocs.length,
      checked_vendor_payments: vendorPaymentDocs.length,
      checked_client_acomptes: clientAcompteDocs.length,
      sent: sentReminders.length,
      skipped: results.filter((r) => r.status.startsWith('skipped')).length,
      errors: results.filter((r) => r.status === 'error').length,
      details: results,
    });
  } catch (e: any) {
    console.error('payment-reminders cron error:', e);
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
