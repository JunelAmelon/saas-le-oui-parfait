import { Invoice, InvoiceStatus, Payment } from '@/types/invoice';
import { addDocument, updateDocument, getDocuments, getDocument } from './db';
import { Timestamp } from 'firebase/firestore';

export async function generateInvoiceNumber(plannerId: string): Promise<string> {
  const year = new Date().getFullYear();
  const invoices = await getDocuments('invoices', [
    { field: 'planner_id', operator: '==', value: plannerId },
  ]);
  
  const yearInvoices = invoices.filter((inv: any) => 
    inv.number?.startsWith(`F-${year}`)
  );
  
  const nextNumber = yearInvoices.length + 1;
  return `F-${year}-${String(nextNumber).padStart(3, '0')}`;
}

export async function createInvoice(data: Partial<Invoice>): Promise<string> {
  const invoiceData = {
    ...data,
    status: (data.status as InvoiceStatus) || 'payment_pending',
    created_at: Timestamp.now(),
    updated_at: Timestamp.now(),
  };
  
  return await addDocument('invoices', invoiceData);
}

export async function updateInvoiceStatus(
  invoiceId: string, 
  status: InvoiceStatus,
  additionalData?: Partial<Invoice>
): Promise<void> {
  const updateData: any = {
    status,
    updated_at: Timestamp.now(),
    ...additionalData,
  };
  
  if (status === 'paid' && !additionalData?.paid_at) {
    updateData.paid_at = Timestamp.now();
  }
  
  await updateDocument('invoices', invoiceId, updateData);
}

export async function getInvoicesByClient(clientId: string): Promise<Invoice[]> {
  return await getDocuments('invoices', [
    { field: 'client_id', operator: '==', value: clientId },
  ]) as Invoice[];
}

export async function getInvoicesByPlanner(plannerId: string): Promise<Invoice[]> {
  return await getDocuments('invoices', [
    { field: 'planner_id', operator: '==', value: plannerId },
  ]) as Invoice[];
}

export async function getPendingInvoices(clientId: string): Promise<Invoice[]> {
  const invoices = await getInvoicesByClient(clientId);
  return invoices.filter(inv => 
    ['sent', 'payment_pending', 'overdue'].includes(inv.status)
  );
}

export async function getPaidInvoices(clientId: string): Promise<Invoice[]> {
  const invoices = await getInvoicesByClient(clientId);
  return invoices.filter(inv => inv.status === 'paid');
}

export async function createPayment(data: Partial<Payment>): Promise<string> {
  const paymentData = {
    ...data,
    declared_at: Timestamp.now(),
    created_at: Timestamp.now(),
  };
  
  return await addDocument('payments', paymentData);
}

export async function validatePayment(
  paymentId: string,
  validatedBy: string
): Promise<void> {
  const payment = await getDocument('payments', paymentId) as Payment;
  
  if (!payment) {
    throw new Error('Payment not found');
  }
  
  await updateDocument('payments', paymentId, {
    status: 'validated',
    validated_at: Timestamp.now(),
    validated_by: validatedBy,
  });
  
  await updateInvoiceStatus(payment.invoice_id, 'paid', {
    paid_at: Timestamp.now(),
  });
}

export async function rejectPayment(
  paymentId: string,
  reason: string
): Promise<void> {
  const payment = await getDocument('payments', paymentId) as Payment;
  
  if (!payment) {
    throw new Error('Payment not found');
  }
  
  await updateDocument('payments', paymentId, {
    status: 'rejected',
    rejected_reason: reason,
  });
  
  await updateInvoiceStatus(payment.invoice_id, 'sent');
}

export async function getPendingPayments(plannerId: string): Promise<Payment[]> {
  return await getDocuments('payments', [
    { field: 'planner_id', operator: '==', value: plannerId },
    { field: 'status', operator: '==', value: 'pending' },
  ]) as Payment[];
}

export async function getPaymentsByInvoice(invoiceId: string): Promise<Payment[]> {
  return await getDocuments('payments', [
    { field: 'invoice_id', operator: '==', value: invoiceId },
  ]) as Payment[];
}

export function isInvoiceOverdue(invoice: Invoice): boolean {
  if (invoice.status === 'paid' || !invoice.due_date) {
    return false;
  }
  
  const dueDate = new Date(invoice.due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return dueDate < today;
}

export async function updateOverdueInvoices(plannerId: string): Promise<void> {
  const invoices = await getInvoicesByPlanner(plannerId);
  
  for (const invoice of invoices) {
    if (invoice.status === 'sent' && isInvoiceOverdue(invoice)) {
      await updateInvoiceStatus(invoice.id, 'overdue');
    }
  }
}
