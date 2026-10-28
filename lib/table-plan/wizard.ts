/**
 * Génération du plan de salle (wizard) — fonctions pures, testables.
 * Entrées : nombre d'invités, forme de table, places/table, objets choisis.
 * Sorties : dimensions de salle, tables posées en grille, objets aux zones.
 */

import type { PlanTable, PlanSeat, SceneObject, SceneObjectKind, RoomConfig, TableShape, SeatKind } from './types';

const makeSeats = (count: number): PlanSeat[] =>
  Array.from({ length: count }, (_, i) => ({ index: i, guest_id: null, kind: 'standard' as SeatKind }));

/** Encombrement d'une table avec ses chaises (demi-largeur, m). */
const SHAPE_RADIUS: Record<TableShape, { rx: number; rz: number }> = {
  ronde: { rx: 1.9, rz: 1.9 },
  ovale: { rx: 2.4, rz: 1.5 },
  carree: { rx: 1.4, rz: 1.4 },
  rectangle: { rx: 2.2, rz: 1.5 },
};

/** Zones réservées par objet (pour le dimensionnement de la salle). */
const OBJECT_FOOTPRINT: Partial<Record<SceneObjectKind, number>> = {
  estrade: 5, scene: 4.5, buffet: 3.5, bar: 3, piste: 6, photobooth: 2,
  urne: 1.5, candy_bar: 2, allee: 2,
};

/**
 * Dimensionne la salle : surface tables (encombrement + circulation 60%)
 * + surface objets + marge. Ratio ~4:3 (les salles sont plus larges que profondes).
 */
export function roomSizeFor(
  guestCount: number,
  seatCount: number,
  shape: TableShape,
  objects: SceneObjectKind[]
): RoomConfig {
  const tableCount = Math.max(1, Math.ceil(guestCount / Math.max(1, seatCount)));
  const r = SHAPE_RADIUS[shape];
  const tableArea = tableCount * r.rx * 2 * r.rz * 2 * 1.6; // encombrement × circulation
  const objectArea = objects.reduce((s, k) => s + (OBJECT_FOOTPRINT[k] ?? 2) * 3, 0);
  const total = tableArea + objectArea + 25; // marge libre (entrée, circulation)
  const width = Math.round(Math.sqrt(total * (4 / 3)) * 2) / 2;
  const length = Math.round((total / width) * 2) / 2;
  return { width: Math.max(12, Math.min(30, width)), length: Math.max(10, Math.min(26, length)) };
}

/** Positions par défaut des objets selon la taille de salle. */
function objectPosition(kind: SceneObjectKind, room: RoomConfig, i: number): { x: number; z: number } {
  const { width: W, length: L } = room;
  switch (kind) {
    case 'estrade': return { x: 0, z: -L / 2 + 2.2 };
    case 'scene': return { x: 0, z: -L / 2 + 2.4 };
    case 'allee': return { x: 0, z: -L / 2 + 5.5 };
    case 'piste': return { x: 0, z: L / 2 - 3.4 };
    case 'buffet': return { x: -W / 2 + 2.4, z: L / 2 - 3 };
    case 'bar': return { x: W / 2 - 2.4, z: L / 2 - 3 };
    case 'candy_bar': return { x: W / 2 - 2.2, z: L / 2 - 6 };
    case 'photobooth': return { x: -W / 2 + 2.2, z: L / 2 - 6 };
    default: return { x: -W / 2 + 2 + i * 1.5, z: L / 2 - 2 };
  }
}

/**
 * Génère le plan complet : tables en grille centrée (zone utile = salle
 * moins zones objets), objets aux positions standard.
 */
export function generatePlan(opts: {
  guestCount: number;
  shape: TableShape;
  seatCount: number;
  objectKinds: SceneObjectKind[];
  /** Nombre de tables forcé (sinon auto : invités / places). */
  tableCount?: number;
}): { room: RoomConfig; tables: PlanTable[]; objects: SceneObject[] } {
  const { guestCount, shape, seatCount, objectKinds } = opts;
  const room = roomSizeFor(guestCount, seatCount, shape, objectKinds);
  const r = SHAPE_RADIUS[shape];
  const tableCount = Math.max(1, opts.tableCount ?? Math.ceil(guestCount / Math.max(1, seatCount)));

  // Zone utile : on évite le haut (estrade/scène) et le bas (piste).
  const topClear = objectKinds.some((k) => ['estrade', 'scene'].includes(k)) ? 5.5 : 2.5;
  const bottomClear = objectKinds.includes('piste') ? 6 : 2.5;
  const sideClear = (objectKinds.includes('buffet') || objectKinds.includes('photobooth')) ? 4.5 : 3;

  const ux = room.width - sideClear * 2;
  const uz = room.length - topClear - bottomClear;
  const cols = Math.max(1, Math.min(tableCount, Math.floor(ux / (r.rx * 2 + 1.2))));
  const rows = Math.ceil(tableCount / cols);
  const gapX = cols > 1 ? Math.max(r.rx * 2 + 1.2, ux / cols) : 0;
  const gapZ = rows > 1 ? Math.max(r.rz * 2 + 1.2, uz / rows) : 0;
  const z0 = -room.length / 2 + topClear + (uz - gapZ * (rows - 1)) / 2;

  const accents = ['#88b7b5', '#e8b4b8', '#9bb39b', '#c9a96e', '#4b4456'];
  const tables: PlanTable[] = [];
  for (let i = 0; i < tableCount; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    // décale la dernière rangée pour la centrer si incomplète
    const rowCount = Math.min(cols, tableCount - row * cols);
    const xOff = cols > 1 ? (cols - rowCount) * (gapX / 2) : 0;
    tables.push({
      id: `t${i + 1}`,
      shape,
      name: `Table ${i + 1}`,
      x: Math.round(((-ux / 2) + xOff + col * gapX + gapX / 2) * 2) / 2,
      z: Math.round((z0 + row * gapZ) * 2) / 2,
      rotation: 0,
      seatCount,
      accent: accents[i % accents.length],
      seats: makeSeats(seatCount),
    });
  }

  const objects: SceneObject[] = objectKinds.map((k, i) => {
    const pos = objectPosition(k, room, i);
    const labels: Record<SceneObjectKind, string> = {
      piste: 'Piste de danse', scene: 'Scène', buffet: 'Buffet', bar: 'Bar',
      urne: "Urne / Livre d'or", photobooth: 'Photobooth', candy_bar: 'Candy bar',
      estrade: 'Estrade + cœurs', allee: 'Allée tapis blanc',
    };
    return { id: `o${i + 1}`, kind: k, label: labels[k], x: pos.x, z: pos.z, rotation: 0 };
  });

  return { room, tables, objects };
}
