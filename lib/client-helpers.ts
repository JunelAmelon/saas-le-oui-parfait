import { getDocuments, getDocument } from './db';

export interface ClientData {
  id: string;
  planner_id: string;
  client_user_id: string;
  name: string;
  partner: string;
  email: string;
  phone?: string;
  event_date?: string;
  event_location?: string;
  created_at?: any;
}

function pickWeddingEvent(events: any[]): EventData | null {
  if (!events || events.length === 0) return null;

  const scored = events
    .map((e) => {
      let score = 0;
      if (e?.event_date) score += 5;
      if (e?.couple_names) score += 2;
      if (typeof e?.guest_count === 'number') score += 1;
      if (typeof e?.budget === 'number') score += 1;
      if (e?.theme) score += 1;
      return { e, score };
    })
    .sort((a, b) => b.score - a.score);

  return (scored[0]?.e as EventData) || (events[0] as EventData);
}

export interface EventData {
  id: string;
  client_id: string;
  planner_id: string;
  couple_names: string;
  event_date: string;
  location: string;
  guest_count: number;
  budget: number;
  theme?: {
    style: string;
    colors: string[];
    description: string;
  };
  notes?: string;
  client_email?: string;
  created_at?: any;
}

export interface DocumentData {
  id: string;
  client_id: string;
  planner_id: string;
  event_id?: string;
  name: string;
  type: 'contrat' | 'devis' | 'facture' | 'photo' | 'autre';
  category?: string;
  file_url: string;
  file_type?: string;
  file_size?: number;
  size?: string;
  status: 'signed' | 'accepted' | 'paid' | 'pending' | string;
  date?: string;
  uploaded_at?: string;
  created_timestamp?: any;
}

export interface ChecklistItem {
  id: string;
  event_id: string;
  client_id: string;
  planner_id?: string;
  title: string;
  description?: string;
  deadline?: string;
  completed: boolean;
  completed_at?: any;
  category: string;
  priority: 'high' | 'medium' | 'low';
  created_at?: any;
}

export interface ConversationData {
  id: string;
  client_id: string;
  planner_id: string;
  vendor_id?: string;
  participants: string[];
  participant_names?: {
    [key: string]: string;
  };
  last_message: string;
  last_message_at: any;
  unread_count_client: number;
  unread_count_planner: number;
  created_at?: any;
}

export interface MessageData {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name?: string;
  sender_role: 'client' | 'planner' | 'vendor';
  content: string;
  attachments?: string[];
  read: boolean;
  read_at?: any;
  created_at: any;
}

export interface PaymentData {
  id: string;
  client_id: string;
  invoice_id?: string;
  description: string;
  vendor?: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue' | 'completed' | 'failed';
  method: string;
  date?: string;
  due_date?: string;
  paid_at?: any;
  invoice?: boolean;
  created_at?: any;
}

export interface VendorData {
  id: string;
  name: string;
  category: string;
  contact?: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  status?: string;
  rating?: number;
  event_ids?: string[];
  next_appointment?: {
    date: string;
    time?: string;
    description: string;
  };
  created_at?: any;
}

export interface GalleryData {
  id: string;
  event_id: string;
  client_id: string;
  planner_id: string;
  name: string;
  description?: string;
  cover?: string;
  count?: number;
  photos: Array<{
    id: string;
    url: string;
    thumbnail_url?: string;
    uploaded_by: 'client' | 'planner';
    uploaded_at: any;
    liked: boolean;
    album?: string;
    date?: string;
  }>;
  created_at?: any;
}

/**
 * Récupère le client par son UID Firebase Auth
 */
export async function getClientByAuthId(authUserId: string): Promise<ClientData | null> {
  try {
    const clients = await getDocuments('clients', [
      { field: 'client_user_id', operator: '==', value: authUserId }
    ]);
    return clients.length > 0 ? clients[0] as ClientData : null;
  } catch (error) {
    console.error('Error fetching client by auth ID:', error);
    return null;
  }
}

/**
 * Récupère l'événement d'un client
 */
export async function getClientEvent(clientId: string): Promise<EventData | null> {
  try {
    const events = await getDocuments('events', [
      { field: 'client_id', operator: '==', value: clientId }
    ]);
    return pickWeddingEvent(events as any[]);
  } catch (error) {
    console.error('Error fetching client event:', error);
    return null;
  }
}

/**
 * Récupère l'événement d'un client par email (fallback)
 */
export async function getClientEventByEmail(email: string): Promise<EventData | null> {
  try {
    const events = await getDocuments('events', [
      { field: 'client_email', operator: '==', value: email }
    ]);
    return pickWeddingEvent(events as any[]);
  } catch (error) {
    console.error('Error fetching client event by email:', error);
    return null;
  }
}

/**
 * Récupère les données complètes d'un client (client + event)
 */
export async function getClientFullData(authUserId: string) {
  try {
    const client = await getClientByAuthId(authUserId);
    if (!client) return null;
    
    const event = await getClientEvent(client.id);
    
    return {
      client,
      event
    };
  } catch (error) {
    console.error('Error fetching client full data:', error);
    return null;
  }
}

/**
 * Récupère les documents d'un client
 */
export async function getClientDocuments(clientId: string): Promise<DocumentData[]> {
  try {
    const documents = await getDocuments('documents', [
      { field: 'client_id', operator: '==', value: clientId }
    ]);
    return documents as DocumentData[];
  } catch (error) {
    console.error('Error fetching client documents:', error);
    return [];
  }
}

/**
 * Récupère la checklist d'un événement
 */
export async function getClientChecklist(eventId: string): Promise<ChecklistItem[]> {
  try {
    // Utilise la collection 'tasks' existante au lieu de 'checklist'
    const items = await getDocuments('tasks', [
      { field: 'event_id', operator: '==', value: eventId }
    ]);
    return (items as any[]).filter((t) => (t?.kind || 'checklist') !== 'milestone') as ChecklistItem[];
  } catch (error) {
    console.error('Error fetching checklist:', error);
    return [];
  }
}

/**
 * Récupère les conversations d'un client
 */
export async function getClientConversations(clientId: string): Promise<ConversationData[]> {
  try {
    const conversations = await getDocuments('conversations', [
      { field: 'client_id', operator: '==', value: clientId }
    ]);
    return conversations as ConversationData[];
  } catch (error) {
    console.error('Error fetching client conversations:', error);
    return [];
  }
}

/**
 * Récupère les messages d'une conversation
 */
export async function getConversationMessages(conversationId: string): Promise<MessageData[]> {
  try {
    const messages = await getDocuments('messages', [
      { field: 'conversation_id', operator: '==', value: conversationId }
    ]);
    return messages as MessageData[];
  } catch (error) {
    console.error('Error fetching conversation messages:', error);
    return [];
  }
}

/**
 * Récupère les paiements d'un client
 */
export async function getClientPayments(clientId: string): Promise<PaymentData[]> {
  try {
    // Utilise la collection 'invoices' existante au lieu de 'payments'
    const payments = await getDocuments('invoices', [
      { field: 'client_id', operator: '==', value: clientId }
    ]);
    return payments as PaymentData[];
  } catch (error) {
    console.error('Error fetching client payments:', error);
    return [];
  }
}

/**
 * Récupère les factures d'un client
 */
export async function getClientInvoices(clientId: string) {
  try {
    const invoices = await getDocuments('invoices', [
      { field: 'client_id', operator: '==', value: clientId }
    ]);
    return invoices;
  } catch (error) {
    console.error('Error fetching client invoices:', error);
    return [];
  }
}

/**
 * Récupère les prestataires d'un événement
 */
export async function getEventVendors(eventId: string): Promise<VendorData[]> {
  try {
    const vendors = await getDocuments('vendors', [
      { field: 'event_ids', operator: 'array-contains', value: eventId }
    ]);
    return vendors as VendorData[];
  } catch (error) {
    console.error('Error fetching event vendors:', error);
    return [];
  }
}

/**
 * Récupère les galeries d'un événement
 */
export async function getEventGalleries(eventId: string): Promise<GalleryData[]> {
  try {
    const galleries = await getDocuments('galleries', [
      { field: 'event_id', operator: '==', value: eventId }
    ]);
    return galleries as GalleryData[];
  } catch (error) {
    console.error('Error fetching event galleries:', error);
    return [];
  }
}

/**
 * Calcule le résumé du budget d'un client
 */
export async function getClientBudgetSummary(clientId: string) {
  try {
    const payments = await getClientPayments(clientId);
    const invoices = await getClientInvoices(clientId);
    
    const total = invoices.reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0);
    const paid = payments
      .filter((p: PaymentData) => p.status === 'paid' || p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);
    const pending = invoices
      .filter((inv: any) => inv.status === 'pending')
      .reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0);
    
    return {
      total,
      paid,
      pending,
      remaining: total - paid
    };
  } catch (error) {
    console.error('Error calculating budget summary:', error);
    return {
      total: 0,
      paid: 0,
      pending: 0,
      remaining: 0
    };
  }
}

/**
 * Calcule la progression de la checklist
 */
export function calculateChecklistProgress(checklist: ChecklistItem[]) {
  if (checklist.length === 0) return 0;
  const completed = checklist.filter(item => item.completed).length;
  return Math.round((completed / checklist.length) * 100);
}

/**
 * Calcule les jours restants jusqu'à l'événement
 */
export function calculateDaysRemaining(eventDate: string): number {
  const event = new Date(eventDate);
  const today = new Date();
  const diffTime = event.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return daysRemaining > 0 ? daysRemaining : 0;
}
