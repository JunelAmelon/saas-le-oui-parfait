/**
 * Affectation automatique des invités — logique pure, testable.
 * Stratégie : respecter les contraintes `together`/`apart`, puis regrouper
 * par `group` (famille, collègues...) tout en répartissant sur les places libres.
 */

import type { PlanTable, PlanGuest, PlanConstraint, PlanSeat } from './types';

/** Construit la map guest_id → (tableId, seatIndex) actuelle. */
export function seatIndexOf(tables: PlanTable[]): Map<string, { tableId: string; seatIndex: number }> {
  const m = new Map<string, { tableId: string; seatIndex: number }>();
  for (const t of tables)
    for (const s of t.seats) if (s.guest_id) m.set(s.guest_id, { tableId: t.id, seatIndex: s.index });
  return m;
}

/**
 * Affecte les invités non placés dans les sièges libres.
 * Renvoie de nouvelles tables (immutabilité).
 */
export function autoAssign(
  tables: PlanTable[],
  guests: PlanGuest[],
  constraints: PlanConstraint[] = []
): PlanTable[] {
  // Copie profonde légère : on clone les sièges uniquement.
  const next = tables.map((t) => ({ ...t, seats: t.seats.map((s) => ({ ...s })) }));

  const placed = seatIndexOf(next);
  const unseated = guests.filter((g) => !placed.has(g.id));

  // Contraintes "apart" → paires à séparer.
  const apart = new Map<string, Set<string>>();
  for (const c of constraints) {
    if (c.mode !== 'apart') continue;
    if (!apart.has(c.guest_a)) apart.set(c.guest_a, new Set());
    if (!apart.has(c.guest_b)) apart.set(c.guest_b, new Set());
    apart.get(c.guest_a)!.add(c.guest_b);
    apart.get(c.guest_b)!.add(c.guest_a);
  }

  // Trie les sièges libres dans l'ordre des tables.
  const freeSeats: { t: (typeof next)[number]; s: PlanSeat }[] = [];
  for (const t of next) for (const s of t.seats) if (!s.guest_id) freeSeats.push({ t, s });

  // Table d'un invité déjà placé du même groupe → privilégie sa table.
  const tableGuests = (t: PlanTable) => new Set(t.seats.map((s) => s.guest_id).filter(Boolean) as string[]);
  const groupOf = (g: PlanGuest) => g.group || '';

  const seatOk = (t: PlanTable, g: PlanGuest): boolean => {
    const forbid = apart.get(g.id);
    if (!forbid) return true;
    // Array.from : éviter d'itérer directement le Set (compat es5 target).
    for (const id of Array.from(tableGuests(t))) if (forbid.has(id)) return false;
    return true;
  };

  // Passe 1 : contraintes "together" → cherche la table des liés.
  const together = new Map<string, Set<string>>();
  for (const c of constraints) {
    if (c.mode !== 'together') continue;
    if (!together.has(c.guest_a)) together.set(c.guest_a, new Set());
    if (!together.has(c.guest_b)) together.set(c.guest_b, new Set());
    together.get(c.guest_a)!.add(c.guest_b);
    together.get(c.guest_b)!.add(c.guest_a);
  }

  // Ordre : d'abord les invités liés par des contraintes, puis par groupe (les
  // groupes les plus gros d'abord se placent mieux).
  const scored = unseated.sort((a, b) => {
    const ga = unseated.filter((x) => x.group && x.group === a.group).length;
    const gb = unseated.filter((x) => x.group && x.group === b.group).length;
    const ca = (together.get(a.id)?.size || 0) + ga;
    const cb = (together.get(b.id)?.size || 0) + gb;
    return cb - ca;
  });

  for (const g of scored) {
    // Cherche d'abord la table de ses liens "together" ou de son groupe.
    const links = together.get(g.id) || new Set<string>();
    const placedGroup = new Map<string, number>();
    for (const t of next) {
      let score = 0;
      for (const id of t.seats.map((s) => s.guest_id).filter(Boolean) as string[]) {
        if (links.has(id)) score += 10;
        const gg = guests.find((x) => x.id === id);
        if (gg && gg.group && gg.group === groupOf(g)) score += 2;
      }
      placedGroup.set(t.id, score);
    }
    // Sièges candidats : meilleure table d'abord, contraintes respectées.
    const candidates = freeSeats
      .filter((fs) => fs.s.guest_id === null && seatOk(fs.t, g))
      .sort((a, b) => (placedGroup.get(b.t.id) || 0) - (placedGroup.get(a.t.id) || 0));
    const seat = candidates[0] || freeSeats.find((fs) => fs.s.guest_id === null && seatOk(fs.t, g));
    if (!seat) break; // plus de place
    seat.s.guest_id = g.id;
  }
  return next;
}
