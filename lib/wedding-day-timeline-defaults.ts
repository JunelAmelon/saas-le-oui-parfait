import { WeddingDayTimelineItem } from './client-helpers';

export const categoryLabels: Record<NonNullable<WeddingDayTimelineItem['category']>, string> = {
  preparation: 'Préparatifs',
  mairie: 'Mairie',
  eglise: 'Église',
  ceremonie_laique: 'Cérémonie laïque',
  vindhonneur: "Vin d'honneur",
  repas: 'Dîner / Repas & Soirée',
  brunch: 'Brunch (lendemain)',
  bal: 'Soirée / Bal', // legacy : anciennes donnees, integre dans "repas"
  autre: 'Autre',
};

// Onglets du catalogue / select de categorie. "bal" est volontairement absent :
// ses moments sont desormais classes dans "repas" (legacy conserve pour
// l'affichage des anciens plannings).
export const categoryOrder: NonNullable<WeddingDayTimelineItem['category']>[] = [
  'preparation',
  'mairie',
  'eglise',
  'ceremonie_laique',
  'vindhonneur',
  'repas',
  'brunch',
  'autre',
];

// Les heures ne sont PAS proposees : chaque moment est ajoute sans horaire,
// c'est le wedding planner qui renseigne debut/fin sur chaque ligne.
const T = (
  title: string,
  category: WeddingDayTimelineItem['category'],
  extra: Partial<WeddingDayTimelineItem> = {}
): WeddingDayTimelineItem => ({
  time: '',
  endTime: '',
  duration: '',
  title,
  category,
  visibleTo: 'all',
  highlight: false,
  ...extra,
});

export const DEFAULT_TEMPLATES: WeddingDayTimelineItem[] = [
  // ============================ Préparatifs ============================
  T("Arrivée de la wedding planner", 'preparation', {
    who: 'Wedding planner',
    location: 'Lieu des préparatifs',
    note: "Heure d'arrivée à confirmer avec l'équipe.",
  }),
  T('Petit-déjeuner des mariés', 'preparation', {
    who: 'Domaine',
    location: 'Suite nuptiale',
    note: 'Prévoir le plateau la veille au soir.',
  }),
  T('Coiffure et maquillage', 'preparation', {
    who: 'Coiffeuse / maquilleuse',
    location: 'Salon du premier étage',
    note: "La mariée en dernier, les témoins d'abord.",
  }),
  T('Livraison des fleurs', 'preparation', {
    who: 'Fleuriste',
    location: 'Entrée de service',
    visibleTo: 'vendors',
  }),
  T('Livraison du bouquet et des boutonnières', 'preparation', {
    who: 'Fleuriste',
    location: 'Suite nuptiale',
    visibleTo: 'vendors',
  }),
  T('Arrivée photographe', 'preparation', {
    who: 'Photographe',
    location: 'Hôtel / domicile',
    note: 'Photos getting ready des deux côtés.',
  }),
  T('Arrivée vidéaste', 'preparation', {
    who: 'Vidéaste',
    location: 'Hôtel / domicile',
    note: 'Captation vidéo des préparatifs.',
  }),
  T("Montage de l'arche", 'preparation', {
    who: 'Fleuriste / décorateur',
    location: 'Jardin sud',
    visibleTo: 'vendors',
  }),
  T('Décoration du lieu de préparation de la mariée', 'preparation', {
    who: 'Décorateur',
    location: 'Suite nuptiale',
    visibleTo: 'vendors',
  }),
  T('Habillage des mariés', 'preparation', {
    who: 'Témoins',
    location: 'Suites',
  }),

  // ============================ Mairie ============================
  T('Arrivée de la wedding planner', 'mairie', {
    who: 'Wedding planner',
    location: 'Mairie',
  }),
  T("Organisation du cortège d'entrée", 'mairie', {
    who: 'Wedding planner',
    location: 'Mairie',
    note: "Ordre : garçons d'honneur, demoiselles d'honneur, mariés.",
  }),
  T('Cérémonie civile', 'mairie', {
    who: "Officier d'état civil",
    location: 'Mairie',
    note: "Rappel : pièces d'identité originales des témoins à transmettre à la mairie pour la signature des registres.",
    highlight: true,
  }),
  T('Musiques de la cérémonie civile', 'mairie', {
    who: 'DJ / wedding planner',
    location: 'Mairie',
    note: "Musique d'entrée et de sortie à choisir à l'avance.",
    visibleTo: 'vendors',
  }),
  T("Récupération de l'acte de mariage civil", 'mairie', {
    who: 'Wedding planner',
    location: 'Mairie',
    note: "Document remis par la mairie — à apporter à l'église pour signature.",
    visibleTo: 'vendors',
  }),
  T('Photos devant la mairie', 'mairie', {
    who: 'Photographe',
    location: 'Devant la mairie',
  }),

  // ============================ Église ============================
  T('Arrivée de la wedding planner', 'eglise', {
    who: 'Wedding planner',
    location: 'Église',
  }),
  T("Organisation du cortège d'entrée", 'eglise', {
    who: 'Wedding planner',
    location: 'Église',
  }),
  T('Séance photo couple & invités', 'eglise', {
    who: 'Photographe',
    location: 'Allée des palmiers',
  }),
  T('Cérémonie religieuse', 'eglise', {
    who: 'Officiant',
    location: 'Église',
    note: "Entrée de la mariée au signal de la musique. Programme de l'église remis aux mariés, à transmettre au wedding planner.",
    highlight: true,
  }),
  T('Musiques de la cérémonie religieuse', 'eglise', {
    who: 'Organiste / DJ',
    location: 'Église',
    note: "Musiques d'entrée, de signature des registres et de sortie.",
    visibleTo: 'vendors',
  }),
  T("Organisation du cortège de sortie", 'eglise', {
    who: 'Wedding planner',
    location: 'Église',
  }),
  T("Signature de l'acte de mariage civil", 'eglise', {
    who: 'Officiant',
    location: 'Église',
    note: 'Document récupéré à la mairie, signé pendant la cérémonie.',
    visibleTo: 'vendors',
  }),
  T("Décoration de l'église (si prévue)", 'eglise', {
    who: 'Décorateur / fleuriste',
    location: 'Église',
    visibleTo: 'vendors',
  }),
  T('Photos de groupe', 'eglise', {
    who: 'Photographe',
    location: "Escalier d'honneur",
  }),

  // ====================== Cérémonie laïque ======================
  T('Arrivée de la wedding planner', 'ceremonie_laique', {
    who: 'Wedding planner',
    location: 'Lieu de la cérémonie laïque',
  }),
  T('Décoration & mise en place de la scène', 'ceremonie_laique', {
    who: 'Décorateur / wedding planner',
    location: 'Lieu de la cérémonie laïque',
    visibleTo: 'vendors',
  }),
  T('Confirmation officiant & intervenants', 'ceremonie_laique', {
    who: 'Wedding planner',
    location: 'Lieu de la cérémonie laïque',
    note: "Officiant professionnel ou proche de la famille — confirmer le nombre d'intervenants.",
    visibleTo: 'vendors',
  }),
  T('Cérémonie laïque', 'ceremonie_laique', {
    who: 'Officiant',
    location: 'Lieu de la cérémonie laïque',
    note: "Programme de la cérémonie transmis au DJ à l'avance.",
    highlight: true,
  }),
  T('Musiques de la cérémonie laïque', 'ceremonie_laique', {
    who: 'DJ',
    location: 'Lieu de la cérémonie laïque',
    note: 'Musiques choisies par les mariés — programme envoyé au DJ.',
    visibleTo: 'vendors',
  }),

  // ========================== Vin d'honneur ==========================
  T('Accueil des invités', 'vindhonneur', {
    who: 'Placiers / wedding planner',
    location: "Cour d'honneur",
  }),
  T('Contrôle des mises en place du traiteur', 'vindhonneur', {
    who: 'Wedding planner',
    location: 'Terrasse / salle',
    note: "Vérifier le dressage, le nappage et le matériel avant l'arrivée des invités.",
    visibleTo: 'vendors',
  }),
  T("Vin d'honneur", 'vindhonneur', {
    who: 'Traiteur',
    location: 'Terrasse ouest',
  }),
  T('Séance photo couple & invités', 'vindhonneur', {
    who: 'Photographe',
    location: 'Terrasse ouest',
    note: 'Créneau dédié photos de couple et photos avec les invités.',
  }),
  T('Animation bouquet de la mariée', 'vindhonneur', {
    who: 'DJ',
    location: 'Terrasse ouest',
  }),
  T('Animations (flamenco, DJ…)', 'vindhonneur', {
    who: 'Artistes / DJ',
    location: 'Terrasse ouest',
  }),
  T('Changement de tenues', 'vindhonneur', {
    who: 'Mariés',
    location: 'Suites',
  }),
  T('Livraisons (gâteau, matériel…)', 'vindhonneur', {
    who: 'Prestataires',
    location: 'Entrée de service',
    visibleTo: 'vendors',
  }),

  // ==================== Dîner / Repas & Soirée ====================
  T('Entrée des invités en salle', 'repas', {
    who: 'Placiers',
    location: "Salle d'honneur",
  }),
  T('Entrée des mariés', 'repas', {
    who: 'DJ',
    location: "Salle d'honneur",
    highlight: true,
  }),
  T('Discours et remerciements', 'repas', {
    who: 'Témoins',
    location: "Salle d'honneur",
  }),
  T('Dîner — service à table ou buffet', 'repas', {
    who: 'Traiteur',
    location: "Salle d'honneur",
    note: 'Service en trois vagues.',
  }),
  T('Animations du dîner', 'repas', {
    who: 'DJ / artistes',
    location: "Salle d'honneur",
  }),
  T('Gâteau et dessert', 'repas', {
    who: 'Pâtissier',
    location: "Salle d'honneur",
  }),
  T('Départ de la wedding planner (au gâteau)', 'repas', {
    who: 'Wedding planner',
    location: "Salle d'honneur",
    note: 'Passage de relais au DJ et au traiteur.',
    visibleTo: 'vendors',
  }),
  T('Départ — photographe', 'repas', {
    who: 'Photographe',
    location: "Salle d'honneur",
    note: 'Fin de prestation du photographe.',
    visibleTo: 'vendors',
  }),
  T('Départ — vidéaste', 'repas', {
    who: 'Vidéaste',
    location: "Salle d'honneur",
    note: 'Fin de prestation du vidéaste.',
    visibleTo: 'vendors',
  }),
  T('Départ — DJ & équipe technique', 'repas', {
    who: 'DJ',
    location: "Salle d'honneur",
    note: 'Fin de prestation du DJ et rangement du matériel.',
    visibleTo: 'vendors',
  }),
  T('Première danse', 'repas', {
    who: 'DJ',
    location: 'Piste',
    highlight: true,
  }),
  T('Ouverture du bal', 'repas', {
    who: 'DJ',
    location: 'Piste',
  }),
  T("Feu d'artifice", 'repas', {
    who: 'Prestataire pyro',
    location: 'Pelouse nord',
    note: 'Autorisation préfectorale à vérifier.',
  }),
  T('Bar de nuit', 'repas', {
    who: 'Traiteur',
    location: 'Terrasse ouest',
  }),
  T('Départ des invités', 'repas', {
    who: 'Navettes',
    location: "Cour d'honneur",
    visibleTo: 'vendors',
  }),
  T('Débarrassage & ménage', 'repas', {
    who: 'Traiteur',
    location: "Salle d'honneur",
    note: 'Débarrassage, nappage et vaisselle repris par le traiteur.',
    visibleTo: 'vendors',
  }),

  // ====================== Brunch (lendemain) ======================
  T('Arrivée de la wedding planner', 'brunch', {
    who: 'Wedding planner',
    location: 'Domaine',
    note: 'Heure de démarrage de la wedding planner.',
  }),
  T('Mise en place matériel & mobilier', 'brunch', {
    who: 'Traiteur',
    location: 'Domaine',
    visibleTo: 'vendors',
  }),
  T('Brunch', 'brunch', {
    who: 'Traiteur',
    location: 'Domaine',
  }),
  T('Check-out des chambres', 'brunch', {
    who: 'Domaine',
    location: 'Chambres',
    note: 'Sortie des chambres au plus tard à midi.',
  }),
  T('Débarrassage & ménage', 'brunch', {
    who: 'Traiteur',
    location: 'Domaine',
    visibleTo: 'vendors',
  }),
  T('Heure limite — quitter le lieu', 'brunch', {
    who: 'Domaine',
    location: 'Domaine',
    note: "Fin d'utilisation du domaine.",
  }),
];
