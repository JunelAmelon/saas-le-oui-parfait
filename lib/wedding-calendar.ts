import { CalendarEventInput } from './google-calendar';

/**
 * Construit l'objet CalendarEventInput pour un mariage (événement journée entière).
 */
export function buildWeddingCalendarEvent(params: {
  coupleNames: string;
  eventDate: string;
  location?: string;
  clientEmail?: string;
  phone?: string;
  guestCount?: number;
  notes?: string;
}): CalendarEventInput {
  const { coupleNames, eventDate, location, clientEmail, phone, guestCount, notes } = params;

  const summary = `Mariage ${coupleNames}`;

  const descParts: string[] = [];
  if (phone) descParts.push(`Téléphone: ${phone}`);
  if (guestCount) descParts.push(`Invités: ${guestCount}`);
  if (notes) descParts.push(`Notes: ${notes}`);
  descParts.push('— Le Oui Parfait');
  const description = descParts.join('\n');

  const normalizedDate = normalizeDate(eventDate);

  // Pour un événement all-day Google Calendar, la date de fin doit être
  // le jour SUIVANT (J+1) car Google utilise des dates exclusives pour fin.
  const endDate = addOneDay(normalizedDate);

  return {
    summary,
    description,
    startDate: normalizedDate,
    endDate,
    location: location || undefined,
    attendees: clientEmail ? [clientEmail] : [],
    guestsCanSeeOtherGuests: false,
  };
}

function normalizeDate(raw: string): string {
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    let yyyy = m[3];
    if (yyyy.length === 2) yyyy = '20' + yyyy;
    return `${yyyy}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  console.warn('Could not normalize date:', raw);
  return raw;
}

function addOneDay(dateStr: string): string {
  if (!dateStr) return dateStr;
  const d = new Date(dateStr + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return dateStr;
  d.setDate(d.getDate() + 1);
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
