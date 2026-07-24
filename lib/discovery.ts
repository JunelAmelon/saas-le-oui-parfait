import { addDocument, updateDocument } from './db';

export const CALL_TYPES = ['Téléphone', 'RDV bureau', 'Visio', 'Salon', 'Autre'];

export const LEAD_SOURCES = [
  'Instagram',
  'Facebook',
  'TikTok',
  'Google',
  'Recommandation',
  'Salon',
  'Autre',
];

export const STYLE_OPTIONS = [
  'Chic',
  'Flamenco',
  'Élégante',
  'Bohème',
  'Romantique',
  'Champêtre',
  'Moderne',
  'Prestige',
  'Traditionnelle',
  'Autre',
];

export const PROGRESS_ITEMS = [
  { key: 'venue', label: 'Lieu de réception' },
  { key: 'caterer', label: 'Traiteur' },
  { key: 'photographer', label: 'Photographe' },
  { key: 'videographer', label: 'Vidéaste' },
  { key: 'djAnimation', label: 'DJ / Animation musicale' },
  { key: 'florist', label: 'Fleuriste' },
  { key: 'weddingCake', label: 'Wedding Cake' },
  { key: 'hairMakeup', label: 'Coiffeuse / Maquilleuse' },
  { key: 'transport', label: 'Transport / Location véhicule' },
  { key: 'accommodation', label: 'Hébergement invités' },
  { key: 'rings', label: 'Les alliances' },
  { key: 'dress', label: 'La robe' },
  { key: 'suit', label: 'Le costume' },
  { key: 'decoration', label: 'La décoration' },
  { key: 'other', label: 'Autre' },
];

export const PROVIDER_CATEGORIES = [
  'Lieu de réception',
  'Traiteur',
  'Photographe',
  'Vidéaste',
  'DJ / Animation musicale',
  'Fleuriste',
  'Wedding Cake',
  'Coiffeuse / Maquilleuse',
  'Transport / Location véhicule',
  'Hébergement invités',
];

export const ANIMATION_OPTIONS = [
  'Photobooth',
  'Jeu des rubans',
  "Livre d'or audio",
  'Feux d\'artifice',
  'Magicien',
  'Groupe de musique',
  'Danse surprise',
  'Coin chicha',
  'Bar à rhum',
  'Stand crêpe / pancake',
  'Candy bar',
  'Cup cake',
];

export const CONCERN_OPTIONS = [
  'Trouver les bons prestataires',
  'Respecter le budget',
  'Gagner du temps',
  'Réduire le stress',
  'Être accompagnés',
  'Coordonner le jour J',
  'Créer un mariage unique',
];

export const OFFER_OPTIONS = [
  'Offre Signature 3 490 € HT',
  'Offre Élégance 1 890 € HT',
  'Offre Harmonie 1 190 € HT',
];

export interface DiscoveryFormData {
  id?: string;
  planner_id?: string;
  client_id?: string | null;
  status: 'draft' | 'completed' | 'converted';
  type: 'prospect' | 'client';

  name: string;
  partner: string;
  email: string;
  phone: string;

  callDate: string;
  leadSource: string;

  weddingDate: string;
  dateConfirmed: boolean;

  sections: {
    presentation: {
      interviewer: string;
      callType: string;
      notes: string;
    };
    project: {
      date: string;
      dateConfirmed: boolean;
      civilDate: string;
      religiousDate: string;
      guestAdults: number | '';
      guestChildren: number | '';
      childrenAges: string;
      eventType: string;
      needAnimator: boolean;
      notes: string;
    };
    style: {
      theme: string;
      colors: string;
      ambiance: string;
      selectedStyles: string[];
      inspirations: string;
      importantElements: string;
    };
    progress: Record<string, boolean | string>;
    providers: {
      searched: string[];
      found: string[];
      wantsHelp: boolean;
      notes: string;
    };
    animations: {
      hasAnimations: boolean;
      ideas: string;
      selected: string[];
      other: string;
    };
    guestsNeeds: {
      reducedMobility: boolean;
      dietary: string;
      fromAbroad: string;
    };
    expectations: {
      selected: string[];
      other: string;
    };
    offers: {
      presented: string[];
      selected: string;
      price: number | '';
      notes: string;
    };
    budget: {
      estimatedGlobal: number | '';
      includesWeddingPlanner: boolean;
      studyFee: number | '';
      notes: string;
    };
    conclusion: {
      notes: string;
      followUpDate: string;
      nextSteps: string;
      meetingScheduled: boolean;
    };
  };
}

export function getValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, key) => (acc != null ? acc[key] : undefined), obj);
}

export function setValue<T>(obj: T, path: string, value: any): T {
  const clone = JSON.parse(JSON.stringify(obj));
  const keys = path.split('.');
  let curr: any = clone;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (curr[k] == null) curr[k] = {};
    curr = curr[k];
  }
  curr[keys[keys.length - 1]] = value;
  return clone;
}

export function toggleArrayValue<T>(obj: T, path: string, value: string): T {
  const arr = (getValue(obj, path) as string[] | undefined) || [];
  const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
  return setValue(obj, path, next);
}

export function defaultDiscoveryForm(plannerId?: string): DiscoveryFormData {
  const today = new Date().toISOString().split('T')[0];
  const progress: Record<string, boolean | string> = { otherDetails: '' };
  for (const item of PROGRESS_ITEMS) {
    progress[item.key] = false;
  }

  return {
    status: 'draft',
    type: 'prospect',
    planner_id: plannerId,
    client_id: null,

    name: '',
    partner: '',
    email: '',
    phone: '',

    callDate: today,
    leadSource: '',

    weddingDate: '',
    dateConfirmed: false,

    sections: {
      presentation: {
        interviewer: 'Kathy',
        callType: 'Téléphone',
        notes: '',
      },
      project: {
        date: '',
        dateConfirmed: false,
        civilDate: '',
        religiousDate: '',
        guestAdults: '',
        guestChildren: '',
        childrenAges: '',
        eventType: 'Mariage',
        needAnimator: false,
        notes: '',
      },
      style: {
        theme: '',
        colors: '',
        ambiance: '',
        selectedStyles: [],
        inspirations: '',
        importantElements: '',
      },
      progress,
      providers: {
        searched: [],
        found: [],
        wantsHelp: false,
        notes: '',
      },
      animations: {
        hasAnimations: false,
        ideas: '',
        selected: [],
        other: '',
      },
      guestsNeeds: {
        reducedMobility: false,
        dietary: '',
        fromAbroad: '',
      },
      expectations: {
        selected: [],
        other: '',
      },
      offers: {
        presented: [],
        selected: '',
        price: '',
        notes: '',
      },
      budget: {
        estimatedGlobal: '',
        includesWeddingPlanner: false,
        studyFee: '',
        notes: '',
      },
      conclusion: {
        notes: '',
        followUpDate: '',
        nextSteps: '',
        meetingScheduled: false,
      },
    },
  };
}

export function normalizeDiscoveryForSave(form: DiscoveryFormData): any {
  const data = JSON.parse(JSON.stringify(form));

  function toNum(v: any) {
    if (v === '' || v == null) return 0;
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
  }

  data.sections.project.guestAdults = toNum(data.sections.project.guestAdults);
  data.sections.project.guestChildren = toNum(data.sections.project.guestChildren);
  data.sections.offers.price = toNum(data.sections.offers.price);
  data.sections.budget.estimatedGlobal = toNum(data.sections.budget.estimatedGlobal);
  data.sections.budget.studyFee = toNum(data.sections.budget.studyFee);

  return data;
}

export function buildClientDataFromDiscovery(
  form: DiscoveryFormData,
  plannerId: string
): any {
  const adults = Number(form.sections.project.guestAdults) || 0;
  const children = Number(form.sections.project.guestChildren) || 0;
  const totalGuests = adults + children;
  const budget = Number(form.sections.budget.estimatedGlobal) || 0;

  const colors = form.sections.style.colors
    .split(/[,\/;]/)
    .map((c) => c.trim())
    .filter(Boolean);

  return {
    name: form.name,
    partner: form.partner,
    email: form.email,
    phone: form.phone,
    event_date: form.weddingDate || form.sections.project.date || '',
    event_location: '',
    budget,
    guests: totalGuests,
    photo: '',
    theme: {
      style: form.sections.style.selectedStyles[0] || form.sections.style.theme || '',
      description: [
        form.sections.style.theme,
        form.sections.style.ambiance,
        form.sections.style.inspirations,
      ]
        .filter(Boolean)
        .join(' / '),
      colors,
    },
    notes: form.sections.conclusion.notes || '',
    status: 'En cours',
    planner_id: plannerId,
    client_user_id: '',
    created_at: new Date().toISOString(),
  };
}

export function buildEventDataFromDiscovery(
  form: DiscoveryFormData,
  plannerId: string,
  clientId: string
): any {
  const adults = Number(form.sections.project.guestAdults) || 0;
  const children = Number(form.sections.project.guestChildren) || 0;
  const totalGuests = adults + children;
  const budget = Number(form.sections.budget.estimatedGlobal) || 0;

  const colors = form.sections.style.colors
    .split(/[,\/;]/)
    .map((c) => c.trim())
    .filter(Boolean);

  return {
    client_id: clientId,
    planner_id: plannerId,
    couple_names: `${form.name} & ${form.partner}`.trim(),
    event_date: form.weddingDate || form.sections.project.date || '',
    location: '',
    guest_count: totalGuests,
    budget,
    status: 'confirmed',
    client_email: form.email,
    theme: {
      style: form.sections.style.selectedStyles[0] || form.sections.style.theme || '',
      description: [
        form.sections.style.theme,
        form.sections.style.ambiance,
        form.sections.style.inspirations,
      ]
        .filter(Boolean)
        .join(' / '),
      colors,
    },
    notes: form.sections.conclusion.notes || '',
    created_at: new Date().toISOString(),
  };
}

export async function convertDiscoveryToClient(
  form: DiscoveryFormData,
  plannerId: string
): Promise<string | null> {
  if (!form.id) return null;

  const clientData = buildClientDataFromDiscovery(form, plannerId);
  const clientDoc = await addDocument('clients', clientData);

  const eventData = buildEventDataFromDiscovery(form, plannerId, clientDoc.id);
  await addDocument('events', eventData);

  await updateDocument('discovery_forms', form.id, {
    client_id: clientDoc.id,
    type: 'client',
    status: 'converted',
    updated_at: new Date().toISOString(),
  });

  return clientDoc.id;
}
