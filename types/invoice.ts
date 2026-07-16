import { Timestamp } from 'firebase/firestore';

export type InvoiceStatus = 
  | 'draft' 
  | 'sent' 
  | 'payment_pending' 
  | 'paid' 
  | 'overdue' 
  | 'cancelled';

export type PaymentMethod = 'bank_transfer' | 'stripe';

export type PaymentSource = 'client_declared' | 'stripe_auto' | 'admin_manual';

export type PaymentStatus = 'pending' | 'validated' | 'rejected';

export interface BankDetails {
  iban: string;
  bic: string;
  account_holder: string;
}

export interface Invoice {
  id: string;
  client_id: string;
  event_id?: string;
  planner_id: string;

  number: string;
  label: string;
  amount_ttc: number;

  status: InvoiceStatus;

  due_date: string;
  issued_at?: Timestamp;
  paid_at?: Timestamp;

  file_url?: string;
  bank_details?: BankDetails;

  stripe_session_id?: string;
  stripe_payment_intent_id?: string;

  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Payment {
  id: string;
  invoice_id: string;
  client_id: string;
  planner_id: string;

  amount: number;
  method: PaymentMethod;
  source: PaymentSource;

  status: PaymentStatus;

  transfer_reference?: string;
  transfer_date?: string;
  proof_url?: string;

  stripe_session_id?: string;
  stripe_payment_intent_id?: string;

  declared_at: Timestamp;
  validated_at?: Timestamp;
  validated_by?: string;
  rejected_reason?: string;
  note?: string;

  created_at: Timestamp;
}
