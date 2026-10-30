/**
 * Modèle de données du plan de table — document Firestore `table_plans`
 * (un document par client). Tout est typé : la scène 3D, la vue 2D et
 * la sauvegarde partagent ces interfaces (SRP : modèle séparé du rendu).
 */

/** Formes de table gérées par le registry de la scène. */
export type TableShape = 'ronde' | 'carree' | 'rectangle' | 'ovale';

/** Type de siège : standard ou siège spécial (chaise haute bébé, PMR, VIP). */
export type SeatKind = 'standard' | 'bebe' | 'pmr' | 'vip';

/** Un invité saisi par le couple (stocké dans le plan, collection dédiée plus tard). */
export interface PlanGuest {
  id: string;
  name: string;
  isChild?: boolean;
  /** Groupe libre : "Famille mariée", "Collègues"... (aide au placement). */
  group?: string;
  /** Note diététique visible par le traiteur : "sans gluten", "végétarien"... */
  diet?: string;
  /** Note libre. */
  notes?: string;
}

/** Un siège : position = index autour de la table, occupant = guest_id. */
export interface PlanSeat {
  index: number;
  guest_id: string | null;
  kind: SeatKind;
}

/** Une table placée dans la salle. */
export interface PlanTable {
  id: string;
  shape: TableShape;
  name: string;
  x: number;
  z: number;
  /** Rotation en degrés (utile surtout pour les rectangles). */
  rotation: number;
  seatCount: number;
  accent: string;
  seats: PlanSeat[];
}

/** Objets de salle non-tables : piste, scène, buffet... (registry OBJECT_DEFS). */
export type SceneObjectKind =
  | 'piste'
  | 'scene'
  | 'buffet'
  | 'bar'
  | 'urne'
  | 'photobooth'
  | 'photobooth360'
  | 'candy_bar'
  | 'estrade'
  | 'allee';

export interface SceneObject {
  id: string;
  kind: SceneObjectKind;
  label: string;
  x: number;
  z: number;
  rotation: number;
}

/** Dimensions de la salle (mètres) — configurables par le couple. */
export interface RoomConfig {
  width: number;
  length: number;
}

/** Styles de sol de la salle 3D / 2D. */
export type FloorStyle =
  | 'dalles'          // Dalles blanches brillantes (défaut historique)
  | 'parquet_chevron' // Parquet merisier chevron (style photo réaliste)
  | 'parquet_clair'   // Parquet chêne blond clair
  | 'marbre_veine'    // Marbre blanc veiné de Carrare
  | 'beton_cire'      // Béton ciré grège moderne
  | 'tapis_sable';    // Moquette / feutre événementiel sable

/** Styles de tables (nappe ou bois apparent). */
export type TableSurfaceStyle =
  | 'nappe'       // Nappe longue drapée (défaut historique)
  | 'bois_verni'  // Plateau bois merisier verni + pieds tournés blancs (style photo)
  | 'bois_chene'  // Plateau chêne naturel + pieds bois
  | 'bois_noyer'  // Plateau noyer foncé + pieds noirs
  | 'marbre_or';  // Plateau marbre blanc + piètement doré

/** Styles de chaises. */
export type ChairStyle =
  | 'napoleon'       // Napoléon blanche / dorée (défaut historique)
  | 'chiavari_bois'  // Chiavari bois doré à bagues bambou + coussin blanc (style photo)
  | 'chiavari_or'    // Chiavari Or Champagne métallisé + coussin ivoire
  | 'chiavari_noire' // Chiavari Noire chic + coussin blanc
  | 'medaillon'      // Chaise Louis XVI dossier médaillon
  | 'ghost';         // Chaise Ghost cristal transparente

/** Styles de centres de table / fleurs. */
export type CenterpieceStyle =
  | 'candelabre'     // Candélabre doré + bouquet lys & roses coloré (défaut historique)
  | 'boule_blanche'  // Haut vase trompette blanc + boule d'hortensias blancs (style photo)
  | 'couronne_basse' // Couronne florale basse + bougies
  | 'eucalyptus'     // Feuillage eucalyptus + roses blanches champêtres
  | 'bougeoirs'      // Trio de bougeoirs cristal & pétales
  | 'aucun';         // Sans centre de table

/** Styles d'assiettes, verres et couverts. */
export type TablewareStyle =
  | 'classique' // Assiette + serviette pliée couleur d'accent + 1 verre (défaut historique)
  | 'prestige'  // Assiette creuse porcelaine + 3 verres à pied cristal + couverts argentés complets (style photo)
  | 'filet_or'  // Sous-assiette dorée + porcelaine filet d'or + 3 verres cristal + couverts dorés
  | 'champetre';// Assiette en grès sable naturel + serviette lin + 2 verres

/** Configuration esthétique globale de la salle et des tables. */
export interface DecorConfig {
  floor: FloorStyle;
  tableStyle: TableSurfaceStyle;
  clothColor: string;
  chairStyle: ChairStyle;
  centerpiece: CenterpieceStyle;
  flowerColor: string;
  tableware: TablewareStyle;
}

/** Valeurs par défaut = exactement l'ancienne version historique. */
export const DEFAULT_DECOR: DecorConfig = {
  floor: 'dalles',
  tableStyle: 'nappe',
  clothColor: '#f5f1ea',
  chairStyle: 'napoleon',
  centerpiece: 'candelabre',
  flowerColor: '#e8b4b8',
  tableware: 'classique',
};

/** Le document complet sauvegardé dans `table_plans`. */
export interface TablePlanDoc {
  client_id: string;
  planner_id: string;
  room: RoomConfig;
  decor?: DecorConfig;
  tables: PlanTable[];
  objects: SceneObject[];
  guests: PlanGuest[];
  updated_at?: unknown;
  updated_by?: string;
}

/** Contraintes d'affectation (Phase contraintes : garder ensemble / séparer). */
export interface PlanConstraint {
  guest_a: string;
  guest_b: string;
  mode: 'together' | 'apart';
}
