/**
 * Fonctions pour envoyer des notifications email
 * Utilise le même contrat que /api/email/send : { recipientEmail, subject, text }
 */
import { auth } from '@/lib/firebase';

async function sendNotificationEmail(params: {
  to: string;
  subject: string;
  text: string;
}): Promise<boolean> {
  try {
    const idToken = await auth.currentUser?.getIdToken().catch(() => null);
    if (!idToken) return false;

    const response = await fetch('/api/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        recipientEmail: params.to,
        subject: params.subject,
        text: params.text,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send email');
    }

    return true;
  } catch (error) {
    console.error('Error sending notification email:', error);
    return false;
  }
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
}

function formatDateFr(dateStr: string) {
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export async function sendInvoiceCreatedEmail(invoiceData: {
  client_email: string;
  client_name: string;
  invoice_number: string;
  amount: number;
  due_date: string;
  invoice_url?: string;
}) {
  return sendNotificationEmail({
    to: invoiceData.client_email,
    subject: `Nouvelle facture ${invoiceData.invoice_number} - Le Oui Parfait`,
    text: `Bonjour ${invoiceData.client_name || ''},\n\nUne nouvelle facture (${invoiceData.invoice_number}) d'un montant de ${formatAmount(invoiceData.amount)} est disponible.\n\nÉchéance : ${formatDateFr(invoiceData.due_date)}${invoiceData.invoice_url ? `\nLien : ${invoiceData.invoice_url}` : ''}\n\nConnectez-vous à votre espace client pour la consulter.\n\nLe Oui Parfait`,
  });
}

export async function sendPaymentPendingEmail(paymentData: {
  admin_email: string;
  client_name: string;
  invoice_number: string;
  amount: number;
  transfer_date: string;
  proof_url: string;
}) {
  return sendNotificationEmail({
    to: paymentData.admin_email,
    subject: `Nouveau paiement à valider - ${paymentData.invoice_number}`,
    text: `Bonjour,\n\n${paymentData.client_name || 'Un client'} a déclaré un virement pour la facture ${paymentData.invoice_number}.\n\nMontant : ${formatAmount(paymentData.amount)}\nDate du virement : ${formatDateFr(paymentData.transfer_date)}\nJustificatif : ${paymentData.proof_url}\n\nVeuillez vérifier et valider le paiement dans l'administration.\n\nLe Oui Parfait`,
  });
}

export async function sendPaymentValidatedEmail(paymentData: {
  client_email: string;
  client_name: string;
  invoice_number: string;
  amount: number;
}) {
  return sendNotificationEmail({
    to: paymentData.client_email,
    subject: `Paiement validé - ${paymentData.invoice_number} - Le Oui Parfait`,
    text: `Bonjour ${paymentData.client_name || ''},\n\nVotre paiement de ${formatAmount(paymentData.amount)} pour la facture ${paymentData.invoice_number} a bien été validé.\n\nMerci de votre confiance.\n\nLe Oui Parfait`,
  });
}

export async function sendPaymentRejectedEmail(paymentData: {
  client_email: string;
  client_name: string;
  invoice_number: string;
  amount: number;
  reason: string;
}) {
  return sendNotificationEmail({
    to: paymentData.client_email,
    subject: `Paiement refusé - ${paymentData.invoice_number} - Le Oui Parfait`,
    text: `Bonjour ${paymentData.client_name || ''},\n\nVotre paiement de ${formatAmount(paymentData.amount)} pour la facture ${paymentData.invoice_number} a été refusé.\n\nMotif : ${paymentData.reason}\n\nMerci de procéder à un nouveau paiement depuis votre espace client.\n\nLe Oui Parfait`,
  });
}
