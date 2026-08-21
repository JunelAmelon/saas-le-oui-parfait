import { getDocuments, getDocument } from './db';

export interface VendorProfile {
  id: string;
  planner_id: string;
  name: string;
  category?: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  city?: string;
  website?: string;
  logo?: string | null;
  pro_account_uid?: string;
  pro_account_status?: 'none' | 'invited' | 'active';
}

export interface VendorBooking {
  id: string;
  vendor_id: string;
  vendor_uid?: string;
  planner_id: string;
  client_id: string;
  event_id?: string;
  client_names: string;
  client_photo?: string | null;
  wedding_date: string;
  planner_name?: string;
  status: 'option' | 'confirmed' | 'cancelled';
  created_at?: any;
}

export interface ProDocument {
  id: string;
  client_id: string;
  planner_id: string;
  vendor_id?: string;
  vendor_uid?: string;
  type: 'devis' | 'facture';
  pro_name?: string;
  vendor_name?: string;
  vendor_logo_url?: string;
  reference?: string;
  amount: number;
  date: string;
  status: 'recu' | 'en_attente' | 'paye';
  uploaded_by?: 'planner' | 'vendor';
  vendor_status?: 'submitted' | 'validated' | 'rejected';
  rejection_reason?: string;
  devis_file_url?: string;
  facture_file_url?: string;
  file_url?: string;
  notes?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface VendorPayment {
  id: string;
  booking_id: string;
  vendor_id: string;
  vendor_uid?: string;
  client_id: string;
  planner_id: string;
  label: string;
  amount: number;
  type: 'acompte' | 'intermediaire' | 'solde';
  due_date: string;
  status: 'scheduled' | 'paid' | 'late';
  paid_date?: string;
  method?: string;
  proof_url?: string;
  declared_by?: string;
  created_at?: any;
  updated_at?: any;
}

/**
 * Récupère la fiche vendor par son UID Firebase Auth
 */
export async function getVendorByAuthId(authUserId: string): Promise<VendorProfile | null> {
  try {
    const vendors = await getDocuments('vendors', [
      { field: 'pro_account_uid', operator: '==', value: authUserId },
    ]);
    return vendors.length > 0 ? (vendors[0] as VendorProfile) : null;
  } catch (error) {
    console.error('Error fetching vendor by auth ID:', error);
    return null;
  }
}

/**
 * Récupère la fiche vendor par son ID
 */
export async function getVendorById(vendorId: string): Promise<VendorProfile | null> {
  try {
    return (await getDocument('vendors', vendorId)) as VendorProfile | null;
  } catch (error) {
    console.error('Error fetching vendor by ID:', error);
    return null;
  }
}

/**
 * Récupère les bookings (mariages) d'un vendor.
 * Essaye d'abord par vendor_uid (plus fiable côté règles Firestore),
 * puis par vendor_id en fallback.
 */
export async function getVendorBookings(vendorId: string, vendorUid?: string): Promise<VendorBooking[]> {
  try {
    let bookings: any[] = [];

    // Primary: query by vendor_uid (matches Firestore rules)
    if (vendorUid) {
      try {
        bookings = await getDocuments('vendor_bookings', [
          { field: 'vendor_uid', operator: '==', value: vendorUid },
        ]);
      } catch {
        // fallback below
      }
    }

    // Fallback: query by vendor_id
    if (bookings.length === 0) {
      bookings = await getDocuments('vendor_bookings', [
        { field: 'vendor_id', operator: '==', value: vendorId },
      ]);
    }

    // Deduplicate by id
    const seen = new Set<string>();
    const unique = bookings.filter((b) => {
      if (seen.has(b.id)) return false;
      seen.add(b.id);
      return true;
    });

    return unique
      .filter((b) => b.status !== 'cancelled')
      .sort((a, b) => String(a.wedding_date || '').localeCompare(String(b.wedding_date || ''))) as VendorBooking[];
  } catch (error) {
    console.error('Error fetching vendor bookings:', error);
    return [];
  }
}

/**
 * Récupère un booking par son ID
 */
export async function getVendorBookingById(bookingId: string): Promise<VendorBooking | null> {
  try {
    return (await getDocument('vendor_bookings', bookingId)) as VendorBooking | null;
  } catch (error) {
    console.error('Error fetching vendor booking by ID:', error);
    return null;
  }
}

/**
 * Récupère les documents pro d'un booking (via client_id + vendor_id)
 */
export async function getBookingProDocuments(clientId: string, vendorId: string): Promise<ProDocument[]> {
  try {
    const docs = await getDocuments('pro_documents', [
      { field: 'client_id', operator: '==', value: clientId },
      { field: 'vendor_id', operator: '==', value: vendorId },
    ]);
    return (docs as any[]).sort((a, b) =>
      String(b?.date || '').localeCompare(String(a?.date || ''))
    ) as ProDocument[];
  } catch (error) {
    console.error('Error fetching booking pro documents:', error);
    return [];
  }
}

/**
 * Récupère les acomptes d'un booking
 */
export async function getBookingPayments(bookingId: string): Promise<VendorPayment[]> {
  try {
    const payments = await getDocuments('vendor_payments', [
      { field: 'booking_id', operator: '==', value: bookingId },
    ]);
    return (payments as any[]).sort((a, b) =>
      String(a?.due_date || '').localeCompare(String(b?.due_date || ''))
    ) as VendorPayment[];
  } catch (error) {
    console.error('Error fetching booking payments:', error);
    return [];
  }
}

/**
 * Récupère les acomptes d'un vendor (tous bookings confondus).
 * Essaye d'abord par vendor_uid, puis par vendor_id en fallback.
 */
export async function getVendorPayments(vendorId?: string, vendorUid?: string): Promise<VendorPayment[]> {
  try {
    let payments: any[] = [];

    // Primary: query by vendor_uid
    if (vendorUid) {
      try {
        payments = await getDocuments('vendor_payments', [
          { field: 'vendor_uid', operator: '==', value: vendorUid },
        ]);
      } catch {
        // fallback below
      }
    }

    // Fallback: query by vendor_id
    if (payments.length === 0 && vendorId) {
      try {
        payments = await getDocuments('vendor_payments', [
          { field: 'vendor_id', operator: '==', value: vendorId },
        ]);
      } catch {
        // ignore
      }
    }

    return (payments as any[]).sort((a, b) =>
      String(a?.due_date || '').localeCompare(String(b?.due_date || ''))
    ) as VendorPayment[];
  } catch (error) {
    console.error('Error fetching vendor payments:', error);
    return [];
  }
}

/**
 * Calcule les jours restants jusqu'à une date
 */
export function calculateDaysUntil(targetDate: string): number {
  if (!targetDate) return 0;
  const date = new Date(targetDate);
  if (Number.isNaN(date.getTime())) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const diffTime = date.getTime() - today.getTime();
  const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return days;
}

/**
 * Formate une date ISO en format français lisible
 */
export function formatFrenchDate(isoDate: string): string {
  if (!isoDate) return '—';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
