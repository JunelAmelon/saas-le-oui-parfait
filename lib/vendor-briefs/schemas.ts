/**
 * Registry des schémas de briefs prestataires.
 *
 * Chaque catégorie de pro peut déclarer un schéma décrivant les
 * informations métier collectées par le planner lors de l'assignation.
 * Ajouter une catégorie = ajouter un objet au registry, sans toucher
 * aux composants (Open/Closed).
 */

export type BriefFieldType = 'people' | 'textarea';

export interface BriefOption {
  value: string;
  label: string;
}

export interface BriefField {
  key: string;
  label: string;
  type: BriefFieldType;
  required?: boolean;
  help?: string;
}

export interface PeopleConfig {
  max: number;
  maxPhotos: number;
  roles: BriefOption[];
  services: BriefOption[];
  touchUpLabel: string;
  servicesRequired: boolean;
  /** true → champ libre "Précisez qui" quand role === 'autre' */
  allowCustomRole?: boolean;
  customRoleLabel?: string;
}

export interface VendorBriefSchema {
  key: string;
  categories: string[];
  title: string;
  /** Libellé métier utilisé dans les emails ("coiffure & maquillage") */
  serviceLabel: string;
  /** Clé d'icône affichée sur la carte briefing (voir BriefView) */
  icon?: 'scissors' | 'clipboard';
  fields: BriefField[];
  people: PeopleConfig | null;
}

export interface BriefPersonPhoto {
  url: string;
  caption?: string;
}

export interface BriefPerson {
  name: string;
  role: string;
  /** Libellé libre quand role === 'autre' et allowCustomRole */
  custom_role?: string;
  services: string[];
  touch_up: boolean;
  notes?: string;
  photos: BriefPersonPhoto[];
}

export interface BriefData {
  people?: BriefPerson[];
  notes?: string;
  [key: string]: unknown;
}

export const BRIEF_SCHEMA_VERSION = 1;

const HAIR_MAKEUP_SCHEMA: VendorBriefSchema = {
  key: 'hair_makeup',
  categories: ['hair_makeup', 'hairMakeup', 'makeup_beauty'],
  title: 'Fiche de préparation coiffure & maquillage',
  serviceLabel: 'coiffure & maquillage',
  icon: 'scissors',
  fields: [
    {
      key: 'people',
      label: 'Personnes à préparer',
      type: 'people',
      required: true,
      help: 'Pour chaque personne : prestations demandées, retouches, photos et notes.',
    },
    { key: 'notes', label: 'Notes complémentaires', type: 'textarea' },
  ],
  people: {
    max: 20,
    maxPhotos: 6,
    roles: [
      { value: 'mariee', label: 'Mariée' },
      { value: 'marie', label: 'Marié' },
      { value: 'temoin', label: 'Témoin' },
      { value: 'maman', label: 'Maman' },
      { value: 'papa', label: 'Papa' },
      { value: 'soeur', label: 'Sœur' },
      { value: 'frere', label: 'Frère' },
      { value: 'grand_mere', label: 'Grand-mère' },
      { value: 'enfant', label: 'Enfant' },
      { value: 'amie', label: 'Amie' },
      { value: 'ami', label: 'Ami' },
      { value: 'autre', label: 'Autre' },
    ],
    allowCustomRole: true,
    customRoleLabel: 'Précisez qui',
    services: [
      { value: 'maquillage', label: 'Maquillage' },
      { value: 'coiffure', label: 'Coiffure' },
    ],
    touchUpLabel: 'Retouches en journée',
    servicesRequired: true,
  },
};

const BRIEF_SCHEMAS: VendorBriefSchema[] = [HAIR_MAKEUP_SCHEMA];

/**
 * Retourne le schéma de brief pour une catégorie de prestataire,
 * ou null si la catégorie n'a pas encore de schéma (le bouton
 * "Infos pro" ne s'affiche alors pas).
 */
export function getBriefSchema(category?: string | null): VendorBriefSchema | null {
  if (!category) return null;
  const lower = category.toLowerCase();
  return BRIEF_SCHEMAS.find((s) => s.categories.some((c) => c.toLowerCase() === lower)) || null;
}

export function getPersonRoleLabel(
  schema: VendorBriefSchema,
  role?: string,
  customRole?: string
): string {
  if (role === 'autre' && customRole?.trim()) return customRole.trim();
  return schema.people?.roles.find((r) => r.value === role)?.label || role || '—';
}

export function getPersonServiceLabel(schema: VendorBriefSchema, service?: string): string {
  return schema.people?.services.find((s) => s.value === service)?.label || service || '';
}
