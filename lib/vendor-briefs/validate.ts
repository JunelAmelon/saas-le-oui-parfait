/**
 * Validation + sanitisation des données de brief avant écriture.
 * Seuls les champs déclarés dans le schéma sont conservés : aucune
 * clé arbitraire ne peut être injectée dans le document Firestore.
 */

import { BriefData, BriefPerson, VendorBriefSchema } from './schemas';

export interface BriefValidationResult {
  ok: boolean;
  errors: string[];
  data: BriefData;
}

const MAX_NOTES_LENGTH = 2000;
const MAX_PERSON_NOTES_LENGTH = 500;
const MAX_NAME_LENGTH = 120;
const MAX_CAPTION_LENGTH = 200;
const MAX_DATA_KEYS = 50;

const trim = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';

const isHttpUrl = (v: unknown): v is string =>
  typeof v === 'string' && /^https?:\/\//i.test(v);

function sanitizePerson(
  raw: unknown,
  schema: VendorBriefSchema,
  index: number
): { person: BriefPerson | null; error: string | null } {
  if (!raw || typeof raw !== 'object') {
    return { person: null, error: `Personne ${index + 1} invalide` };
  }
  const src = raw as Record<string, unknown>;
  const cfg = schema.people;
  const allowedServices = new Set((cfg?.services || []).map((s) => s.value));
  const allowedRoles = new Set((cfg?.roles || []).map((r) => r.value));

  const name = trim(src.name, MAX_NAME_LENGTH);
  if (!name) {
    return { person: null, error: `Personne ${index + 1} : le nom est obligatoire` };
  }

  const role = allowedRoles.has(String(src.role)) ? String(src.role) : 'autre';

  const services = Array.isArray(src.services)
    ? src.services.filter((s): s is string => typeof s === 'string' && allowedServices.has(s))
    : [];
  if (cfg?.servicesRequired && services.length === 0) {
    return { person: null, error: `${name} : sélectionnez au moins une prestation` };
  }

  const photos = (Array.isArray(src.photos) ? src.photos : [])
    .slice(0, cfg?.maxPhotos ?? 6)
    .filter((p): p is Record<string, unknown> => Boolean(p) && typeof p === 'object' && isHttpUrl((p as any).url))
    .map((p) => {
      const caption = trim(p.caption, MAX_CAPTION_LENGTH);
      // Pas de clé `undefined` : Firestore rejette les valeurs undefined.
      return caption ? { url: p.url as string, caption } : { url: p.url as string };
    });

  const person: BriefPerson = {
    name,
    role,
    services,
    touch_up: src.touch_up === true,
    photos,
  };
  const personNotes = trim(src.notes, MAX_PERSON_NOTES_LENGTH);
  if (personNotes) person.notes = personNotes;

  return { person, error: null };
}

/**
 * Valide et sanitise `data` contre le schéma.
 * Retourne toujours un objet `data` ne contenant que des champs whitelistés.
 */
export function validateBriefData(schema: VendorBriefSchema, data: unknown): BriefValidationResult {
  const errors: string[] = [];
  const src = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  if (Object.keys(src).length > MAX_DATA_KEYS) {
    errors.push('Données de brief trop volumineuses');
  }

  const out: BriefData = {};

  for (const field of schema.fields) {
    if (field.type === 'textarea') {
      const v = trim(src[field.key], MAX_NOTES_LENGTH);
      if (v) out[field.key] = v;
      continue;
    }

    if (field.type === 'people') {
      const rawPeople: unknown[] = Array.isArray(src[field.key]) ? (src[field.key] as unknown[]) : [];
      const cfg = schema.people;
      const people: BriefPerson[] = [];

      if (cfg && rawPeople.length > cfg.max) {
        errors.push(`Maximum ${cfg.max} personnes`);
      }

      rawPeople.slice(0, cfg?.max ?? 20).forEach((raw, i) => {
        const { person, error } = sanitizePerson(raw, schema, i);
        if (error) errors.push(error);
        if (person) people.push(person);
      });

      if (field.required && people.length === 0) {
        errors.push('Ajoutez au moins une personne');
      }

      out[field.key] = people;
    }
  }

  return { ok: errors.length === 0, errors, data: out };
}
