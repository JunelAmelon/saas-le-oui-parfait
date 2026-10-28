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

/** Le document complet sauvegardé dans `table_plans`. */
export interface TablePlanDoc {
  client_id: string;
  planner_id: string;
  room: RoomConfig;
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
