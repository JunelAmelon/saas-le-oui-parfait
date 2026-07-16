/**
 * Fonctions pour envoyer des notifications email
 */

export async function sendInvoiceCreatedEmail(invoiceData: {
  client_email: string;
  client_name: string;
  invoice_number: string;
  amount: number;
  due_date: string;
  invoice_url?: string;
}) {
  try {
    const response = await fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: invoiceData.client_email,
        subject: `Nouvelle facture ${invoiceData.invoice_number}`,
        template: 'invoice_created',
        data: invoiceData,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send email');
    }

    return true;
  } catch (error) {
    console.error('Error sending invoice email:', error);
    return false;
  }
}

export async function sendPaymentPendingEmail(paymentData: {
  admin_email: string;
  client_name: string;
  invoice_number: string;
  amount: number;
  transfer_date: string;
  proof_url: string;
}) {
  try {
    const response = await fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: paymentData.admin_email,
        subject: `Nouveau paiement à valider - ${paymentData.invoice_number}`,
        template: 'payment_pending',
        data: paymentData,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send email');
    }

    return true;
  } catch (error) {
    console.error('Error sending payment notification email:', error);
    return false;
  }
}

export async function sendPaymentValidatedEmail(paymentData: {
  client_email: string;
  client_name: string;
  invoice_number: string;
  amount: number;
}) {
  try {
    const response = await fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: paymentData.client_email,
        subject: `Paiement validé - ${paymentData.invoice_number}`,
        template: 'payment_validated',
        data: paymentData,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send email');
    }

    return true;
  } catch (error) {
    console.error('Error sending payment validated email:', error);
    return false;
  }
}

export async function sendPaymentRejectedEmail(paymentData: {
  client_email: string;
  client_name: string;
  invoice_number: string;
  amount: number;
  reason: string;
}) {
  try {
    const response = await fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: paymentData.client_email,
        subject: `Paiement refusé - ${paymentData.invoice_number}`,
        template: 'payment_rejected',
        data: paymentData,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send email');
    }

    return true;
  } catch (error) {
    console.error('Error sending payment rejected email:', error);
    return false;
  }
}
