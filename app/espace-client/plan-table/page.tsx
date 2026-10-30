'use client';

/**
 * Page Plan de table — orchestre l'état du plan (tables, objets, invités,
 * sièges), la persistance Firestore (`table_plans`), l'undo/redo et les
 * deux vues : 3D immersive et plan 2D du dessus (SVG).
 * Toute la logique "métier" vit ici ; les composants rendent/rendent.
 */

import dynamic from 'next/dynamic';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ClientDashboardLayout } from '@/components/layout/ClientDashboardLayout';
import { useClientData } from '@/contexts/ClientDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { calculateDaysRemaining } from '@/lib/client-helpers';
import { getDocuments, updateDocument } from '@/lib/db';
import { toast } from 'sonner';
import {
  Loader2, Move3d, Plus, Trash2, Sun, Moon, Users, Save,
  Undo2, Redo2, LayoutGrid, Armchair, Check, X, PersonStanding,
} from 'lucide-react';
import {
  DEFAULT_DECOR,
  type PlanTable,
  type PlanGuest,
  type PlanSeat,
  type SceneObject,
  type SceneObjectKind,
  type TableShape,
  type SeatKind,
  type RoomConfig,
  type TablePlanDoc,
  type PlanConstraint,
  type DecorConfig,
  type FloorStyle,
  type TableSurfaceStyle,
  type ChairStyle,
  type CenterpieceStyle,
  type TablewareStyle,
} from '@/lib/table-plan/types';
import { autoAssign } from '@/lib/table-plan/autoAssign';
import { exportTraiteurPdf, exportEscortCardsPdf } from '@/lib/table-plan/exportPdf';
import { ACCENTS, OBJECT_DEFS, TABLE_SHAPES, type Mood } from '@/components/table-plan/StaticHallScene';
import { SetupWizard } from '@/components/table-plan/SetupWizard';

// ---- Chargement dynamique de la scène 3D (client-only : WebGL) ----
const StaticHallScene = dynamic(
  () => import('@/components/table-plan/StaticHallScene').then((m) => ({ default: m.StaticHallScene })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-brand-gray">
        <Loader2 className="h-8 w-8 animate-spin text-brand-turquoise" />
        <p className="text-sm">Chargement de la salle 3D...</p>
      </div>
    ),
  }
);

/* ============================ Constantes UI ============================ */

const SHAPE_CARDS: { shape: TableShape; label: string }[] = [
  { shape: 'carree', label: 'Carrée' },
  { shape: 'rectangle', label: 'Rectangle' },
  { shape: 'ronde', label: 'Ronde' },
  { shape: 'ovale', label: 'Ovale' },
];

const SEAT_KINDS: { kind: SeatKind; label: string }[] = [
  { kind: 'standard', label: 'Standard' },
  { kind: 'bebe', label: 'Chaise bébé' },
  { kind: 'pmr', label: 'PMR' },
  { kind: 'vip', label: 'VIP' },
];

const FLOOR_OPTIONS: { id: FloorStyle; label: string; swatch: string }[] = [
  { id: 'dalles', label: 'Dalles blanches (défaut)', swatch: '#f4f2ee' },
  { id: 'parquet_chevron', label: 'Parquet chevron merisier', swatch: '#a87d52' },
  { id: 'parquet_clair', label: 'Parquet chêne clair', swatch: '#dfcaa8' },
  { id: 'marbre_veine', label: 'Marbre blanc brillant', swatch: '#f8f8fa' },
  { id: 'beton_cire', label: 'Béton ciré grège', swatch: '#d2cdc4' },
  { id: 'tapis_sable', label: 'Moquette sable', swatch: '#e4d9c8' },
];

const TABLE_STYLE_OPTIONS: { id: TableSurfaceStyle; label: string; swatch: string }[] = [
  { id: 'nappe', label: 'Nappe drapée (défaut)', swatch: '#f5f1ea' },
  { id: 'bois_verni', label: 'Bois verni & pieds blancs', swatch: '#c46d38' },
  { id: 'bois_chene', label: 'Bois chêne naturel', swatch: '#d4ad7a' },
  { id: 'bois_noyer', label: 'Noyer foncé & pieds noirs', swatch: '#6b4429' },
  { id: 'marbre_or', label: 'Marbre blanc & Or', swatch: '#e6d3a3' },
];

const CLOTH_COLORS: { color: string; label: string }[] = [
  { color: '#f5f1ea', label: 'Ivoire (défaut)' },
  { color: '#ffffff', label: 'Blanc pur' },
  { color: '#f3e5cf', label: 'Champagne' },
  { color: '#e5dac9', label: 'Lin naturel' },
  { color: '#f4dce0', label: 'Rose poudré' },
  { color: '#dce6dc', label: 'Vert sauge' },
  { color: '#d7eeed', label: 'Turquoise doux' },
  { color: '#2b2630', label: 'Noir gala' },
];

const CHAIR_STYLE_OPTIONS: { id: ChairStyle; label: string }[] = [
  { id: 'napoleon', label: 'Napoléon blanche (défaut)' },
  { id: 'chiavari_bois', label: 'Chiavari bois doré & bambou' },
  { id: 'chiavari_or', label: 'Chiavari Or Champagne' },
  { id: 'chiavari_noire', label: 'Chiavari Noire' },
  { id: 'medaillon', label: 'Louis XVI Médaillon' },
  { id: 'ghost', label: 'Ghost cristal transparente' },
];

const CENTERPIECE_OPTIONS: { id: CenterpieceStyle; label: string }[] = [
  { id: 'candelabre', label: 'Candélabre doré & lys (défaut)' },
  { id: 'boule_blanche', label: 'Vase haut & boule florale' },
  { id: 'couronne_basse', label: 'Couronne basse & bougies' },
  { id: 'eucalyptus', label: 'Eucalyptus & roses' },
  { id: 'bougeoirs', label: 'Trio de bougeoirs dorés' },
  { id: 'aucun', label: 'Sans centre de table' },
];

const FLOWER_COLORS: { color: string; label: string }[] = [
  { color: '#ffffff', label: 'Blanc pur' },
  { color: '#e8b4b8', label: 'Rose poudré' },
  { color: '#d96b78', label: 'Rose carmin' },
  { color: '#f5e1c0', label: 'Champagne / Pêche' },
  { color: '#88b7b5', label: 'Turquoise' },
  { color: '#b89cd9', label: 'Lavande' },
];

const TABLEWARE_OPTIONS: { id: TablewareStyle; label: string; desc: string }[] = [
  { id: 'classique', label: 'Classique avec serviette (défaut)', desc: 'Assiette plate, serviette pliée et verre' },
  { id: 'prestige', label: 'Prestige porcelaine & 3 verres cristal', desc: 'Assiette creuse glacée, 3 verres à pied et couverts argentés' },
  { id: 'filet_or', label: 'Porcelaine filet d\'or & Or', desc: 'Sous-assiette dorée, couverts dorés et 3 verres cristal' },
  { id: 'champetre', label: 'Grès naturel & serviette lin', desc: 'Assiette en grès sable, serviette et 2 verres à pied' },
];

/** Emplacements libres par défaut quand on ajoute une table. */
const SLOTS: [number, number][] = [
  [0, -4.5], [-4.4, -1.8], [4.4, -1.8], [-4.4, 1.6], [4.4, 1.6], [0, 1.8],
];

/** Snap fin de déplacement (5 cm) pour un glisser fluide et précis. */
const SNAP = 0.05;
const clampRoom = (v: number, half: number) =>
  Math.max(-half + 0.8, Math.min(half - 0.8, Math.round(v / SNAP) * SNAP));
const makeSeats = (count: number): PlanSeat[] =>
  Array.from({ length: count }, (_, i) => ({ index: i, guest_id: null, kind: 'standard' as SeatKind }));

const resizeSeats = (seats: PlanSeat[], count: number): PlanSeat[] => {
  const next = seats.slice(0, count);
  while (next.length < count) next.push({ index: next.length, guest_id: null, kind: 'standard' });
  return next.map((s, i) => ({ ...s, index: i }));
};

/** Abrège le nom d'un invité pour l'afficher dans une chaise 2D (ex: "Jean Dupont" -> "JD", "Marion" -> "M."). */
function formatSeatGuestLabel(name?: string): string {
  if (!name) return '';
  const clean = name.trim();
  if (!clean) return '';
  if (clean.length <= 3) return clean;
  const parts = clean.split(/[\s-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return clean.slice(0, 2);
}

/* ============================ Vue 2D (dessus — style architectural) ============================ */

function TopDownView({
  tables,
  objects,
  room,
  selectedId,
  assignTarget,
  onSelect,
  onSeatClick,
  onMoveTable,
  onMoveObject,
  onRotateTable,
  onRotateObject,
  onAssignSeatDirect,
  guests,
}: {
  tables: PlanTable[];
  objects: SceneObject[];
  room: RoomConfig;
  guests: PlanGuest[];
  selectedId: string | null;
  assignTarget: { tableId: string; seatIndex: number } | null;
  onSelect: (id: string | null) => void;
  onSeatClick: (tableId: string, seatIndex: number) => void;
  onMoveTable: (id: string, x: number, z: number) => void;
  onMoveObject: (id: string, x: number, z: number) => void;
  onRotateTable: (id: string, rotation: number) => void;
  onRotateObject: (id: string, rotation: number) => void;
  onAssignSeatDirect: (tableId: string, seatIndex: number, guestId: string | null) => void;
}) {
  // Échelle fixe mètres → pixels SVG
  const SCALE = 72;
  // Marge réduite autour de la salle pour que la salle occupe tout l'espace visuel
  const MARGIN = 1.25;
  const originX = -room.width / 2 - MARGIN;
  const originZ = -room.length / 2 - MARGIN;
  const spanX = room.width + MARGIN * 2;
  const spanZ = room.length + MARGIN * 2;
  const W = spanX * SCALE;
  const H = spanZ * SCALE;
  const px = (x: number) => (x - originX) * SCALE;
  const pz = (z: number) => (z - originZ) * SCALE;

  // Panneau latéral gauche "Invités :" (comme sur la maquette)
  const [guestDrawerOpen, setGuestDrawerOpen] = useState(true);
  const [sortBy, setSortBy] = useState<'alpha' | 'group' | 'added'>('alpha');
  const [onlyUnseated, setOnlyUnseated] = useState(true);
  const [activeGuestId, setActiveGuestId] = useState<string | null>(null);
  const [dragOverSeat, setDragOverSeat] = useState<{ tableId: string; seatIndex: number } | null>(null);

  // Pan & Zoom du canevas 2D
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement | null>(null);

  const placedIds = useMemo(
    () => new Set(tables.flatMap((t) => t.seats.map((s) => s.guest_id).filter(Boolean) as string[])),
    [tables]
  );

  const totalSeats = useMemo(
    () => tables.reduce((acc, t) => acc + t.seats.length, 0),
    [tables]
  );
  const occupiedSeats = useMemo(
    () => tables.reduce((acc, t) => acc + t.seats.filter((s) => !!s.guest_id).length, 0),
    [tables]
  );
  const freeSeats = Math.max(0, totalSeats - occupiedSeats);

  const filteredGuests = useMemo(() => {
    const base = onlyUnseated ? guests.filter((g) => !placedIds.has(g.id)) : [...guests];
    if (sortBy === 'alpha') {
      base.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
    } else if (sortBy === 'group') {
      base.sort((a, b) => (a.group || 'ZZZ').localeCompare(b.group || 'ZZZ', 'fr') || a.name.localeCompare(b.name, 'fr'));
    }
    return base;
  }, [guests, onlyUnseated, placedIds, sortBy]);

  const clientToWorld = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, z: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, z: 0 };
    const m = pt.matrixTransform(ctm.inverse());
    return {
      x: m.x / SCALE + originX,
      z: m.y / SCALE + originZ,
    };
  };

  // Drag fluide d'une table ou d'un objet avec conservation de l'offset du pointeur
  const startItemDrag = (
    e: React.PointerEvent,
    id: string,
    itemX: number,
    itemZ: number,
    isTable: boolean
  ) => {
    e.stopPropagation();
    e.preventDefault();
    const startWorld = clientToWorld(e.clientX, e.clientY);
    const offsetX = itemX - startWorld.x;
    const offsetZ = itemZ - startWorld.z;
    const pointerId = e.pointerId;
    const target = e.currentTarget as Element;
    target.setPointerCapture?.(pointerId);

    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      const cur = clientToWorld(ev.clientX, ev.clientY);
      const nx = cur.x + offsetX;
      const nz = cur.z + offsetZ;
      if (isTable) onMoveTable(id, nx, nz);
      else onMoveObject(id, nx, nz);
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      target.releasePointerCapture?.(pointerId);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  // Pan de la grille au glisser sur le fond
  const startCanvasPan = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const startX = e.clientX - pan.x;
    const startY = e.clientY - pan.y;
    const pointerId = e.pointerId;
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      setPan({ x: ev.clientX - startX, y: ev.clientY - startY });
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  const applyZoom = (dir: number) => {
    setZoom((z) => Math.min(3.2, Math.max(0.5, Number((z * (dir > 0 ? 1.18 : 1 / 1.18)).toFixed(2)))));
  };

  // Rotation directe à la souris autour du centre de l'élément sélectionné
  const startRotateDrag2D = (
    e: React.PointerEvent,
    id: string,
    centerX: number,
    centerZ: number,
    isTable: boolean
  ) => {
    e.stopPropagation();
    e.preventDefault();
    const cx = px(centerX);
    const cy = pz(centerZ);
    const pointerId = e.pointerId;
    const target = e.currentTarget as Element;
    target.setPointerCapture?.(pointerId);

    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      const svg = svgRef.current;
      if (!svg) return;
      const pt = svg.createSVGPoint();
      pt.x = ev.clientX;
      pt.y = ev.clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const m = pt.matrixTransform(ctm.inverse());
      // Angle depuis le haut (poignée à 12h = 0°)
      const rad = Math.atan2(m.x - cx, -(m.y - cy));
      let deg = Math.round((rad * 180) / Math.PI);
      deg = ((deg % 360) + 360) % 360;
      if (isTable) onRotateTable(id, deg);
      else onRotateObject(id, deg);
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      target.releasePointerCapture?.(pointerId);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  // Coordonnées 2D grand format des chaises façon "fleur" autour de la table
  const getSeatPositions2D = (t: PlanTable): { x: number; y: number }[] => {
    const count = t.seats.length;
    if (t.shape === 'ronde') {
      const radius = 66; // px — grand et très lisible
      return Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 - Math.PI / 2;
        return { x: Math.cos(a) * radius, y: Math.sin(a) * radius };
      });
    }
    if (t.shape === 'ovale') {
      const rx = 90;
      const ry = 60;
      return Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 - Math.PI / 2;
        return { x: Math.cos(a) * rx, y: Math.sin(a) * ry };
      });
    }
    const w = t.shape === 'carree' ? 116 : 176;
    const d = t.shape === 'carree' ? 116 : 98;
    const per = 2 * (w + d);
    return Array.from({ length: count }, (_, i) => {
      let dist = ((i + 0.5) / count) * per;
      if (dist < w) return { x: dist - w / 2, y: -d / 2 };
      dist -= w;
      if (dist < d) return { x: w / 2, y: dist - d / 2 };
      dist -= d;
      if (dist < w) return { x: w / 2 - dist, y: d / 2 };
      return { x: -w / 2, y: d / 2 - (dist - w) };
    });
  };

  const roomX = px(-room.width / 2);
  const roomY = pz(-room.length / 2);
  const roomW = room.width * SCALE;
  const roomH = room.length * SCALE;

  return (
    <div className="relative w-full h-full flex bg-white select-none overflow-hidden">
      {/* Panneau latéral gauche "Invités :" (identique à la maquette) */}
      {guestDrawerOpen ? (
        <div className="w-[250px] sm:w-[275px] shrink-0 h-full bg-[#F5F3EF] border-r border-[#E5E0D8] flex flex-col z-20">
          <div className="relative px-4 pt-4 pb-2 flex items-center justify-center">
            <h3 className="text-[14px] font-medium text-[#3D3745]">Invités :</h3>
            <button
              onClick={() => setGuestDrawerOpen(false)}
              title="Masquer la liste des invités"
              className="absolute right-3 top-3.5 w-7 h-7 rounded-full flex items-center justify-center text-[#6E6878] hover:bg-black/5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Classer par */}
          <div className="px-4 py-2 flex items-center gap-2 text-[12.5px] text-[#4B4456]">
            <span className="shrink-0 text-[#6E6878]">Classer par</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'alpha' | 'group' | 'added')}
              className="flex-1 min-w-0 bg-white border border-[#E5E0D8] rounded-full px-3 py-1.5 text-[12px] font-medium text-[#3D3745] shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-turquoise/40"
            >
              <option value="alpha">Ordre Alphabétique</option>
              <option value="group">Par groupe</option>
              <option value="added">Ordre d&apos;ajout</option>
            </select>
          </div>

          {/* Case à cocher "Afficher seulement les non placés" */}
          <label className="px-4 py-2 flex items-center gap-2.5 cursor-pointer text-[12.5px] text-[#3D3745]">
            <button
              type="button"
              onClick={() => setOnlyUnseated((v) => !v)}
              className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                onlyUnseated ? 'bg-[#5A6472] text-white' : 'bg-white border border-[#C5C0B8]'
              }`}
            >
              {onlyUnseated && <Check className="w-3 h-3 stroke-[3]" />}
            </button>
            <span className="select-none">Afficher seulement les non placés</span>
          </label>

          {/* Astuce rapide si un invité est sélectionné */}
          {activeGuestId && (
            <div className="mx-4 mt-1 mb-1 px-3 py-1.5 rounded-lg bg-brand-turquoise/15 text-[11px] font-medium text-[#3D3745] flex items-center justify-between">
              <span>Cliquez sur une place du plan</span>
              <button onClick={() => setActiveGuestId(null)} className="text-brand-purple font-bold ml-2">×</button>
            </div>
          )}

          {/* Liste des invités (glisser-déposer ou cliquer vers un siège) */}
          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
            {filteredGuests.length === 0 ? (
              <p className="text-[12px] text-[#8D8696] text-center py-6">
                {onlyUnseated
                  ? 'Tous les invités sont placés.'
                  : 'Aucun invité dans la liste.'}
              </p>
            ) : (
              filteredGuests.map((g) => {
                const isSeated = placedIds.has(g.id);
                const isSelectedGuest = activeGuestId === g.id;
                return (
                  <div
                    key={g.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', g.id);
                      e.dataTransfer.effectAllowed = 'move';
                      setActiveGuestId(g.id);
                    }}
                    onDragEnd={() => setDragOverSeat(null)}
                    onClick={() => {
                      if (assignTarget) {
                        onAssignSeatDirect(assignTarget.tableId, assignTarget.seatIndex, g.id);
                        setActiveGuestId(null);
                      } else {
                        setActiveGuestId((cur) => (cur === g.id ? null : g.id));
                      }
                    }}
                    className={`group bg-white rounded-xl px-3.5 py-2.5 flex items-center justify-between shadow-sm border transition-all cursor-grab active:cursor-grabbing ${
                      isSelectedGuest
                        ? 'border-brand-turquoise ring-2 ring-brand-turquoise/30'
                        : 'border-transparent hover:border-[#D8D2C9]'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-[13.5px] font-medium text-[#2F2A36] truncate">{g.name}</p>
                      {(g.group || g.isChild) && (
                        <p className="text-[10.5px] text-[#8D8696] truncate">
                          {g.isChild ? 'Enfant' : ''}{g.isChild && g.group ? ' · ' : ''}{g.group || ''}
                        </p>
                      )}
                    </div>
                    <span
                      title={isSeated ? 'Déjà placé' : 'À placer (glissez sur une place)'}
                      className={`w-4 h-4 rounded-full shrink-0 ${
                        isSeated ? 'bg-brand-turquoise' : 'bg-[#CBD5F0]'
                      }`}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setGuestDrawerOpen(true)}
          className="absolute top-3 left-3 z-20 px-3.5 py-2 rounded-full bg-white/95 shadow-md border border-[#E5E0D8] text-[12px] font-semibold text-[#3D3745] hover:bg-[#F5F3EF] flex items-center gap-1.5"
        >
          <Users className="w-3.5 h-3.5 text-brand-turquoise" />
          Invités ({guests.length - occupiedSeats})
        </button>
      )}

      {/* Zone canevas 2D quadrillée */}
      <div className="relative flex-1 h-full overflow-hidden bg-white">
        {/* Contrôles de zoom en haut à droite */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-white/95 backdrop-blur rounded-full shadow-md border border-[rgba(75,68,86,0.12)] p-1">
          <button
            onClick={() => applyZoom(-1)}
            title="Dézoomer"
            className="w-7 h-7 rounded-full text-brand-purple font-bold hover:bg-[#FAF9F7] flex items-center justify-center"
          >
            −
          </button>
          <span className="text-[11px] font-semibold text-brand-gray w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => applyZoom(1)}
            title="Zoomer"
            className="w-7 h-7 rounded-full text-brand-purple font-bold hover:bg-[#FAF9F7] flex items-center justify-center"
          >
            +
          </button>
          <button
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            title="Réinitialiser la vue"
            className="px-2.5 h-7 rounded-full text-[11px] font-semibold text-brand-purple hover:bg-[#FAF9F7]"
          >
            Ajuster
          </button>
        </div>

        {/* Compteurs en bas à gauche (comme sur l'image : 91 places / 9 occupées / 82 libres) */}
        <div className="absolute bottom-10 left-4 z-20 pointer-events-none bg-white/80 backdrop-blur-[2px] px-3 py-2 rounded-xl border border-black/5">
          <p className="text-[15px] font-medium text-[#23202A] leading-snug">{totalSeats} places</p>
          <p className="text-[15px] font-medium text-[#23202A] leading-snug">{occupiedSeats} occupées</p>
          <p className="text-[15px] font-medium text-[#23202A] leading-snug">{freeSeats} libres</p>
        </div>

        {/* Canevas SVG interactif */}
        <div
          className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
          onPointerDown={startCanvasPan}
          onWheel={(e) => {
            e.preventDefault();
            applyZoom(e.deltaY < 0 ? 1 : -1);
          }}
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            style={{
              width: `${100 * zoom}%`,
              height: `${100 * zoom}%`,
              transform: `translate(${pan.x}px, ${pan.y}px)`,
            }}
            preserveAspectRatio="xMidYMid meet"
            onClick={(e) => {
              if (e.target === e.currentTarget) onSelect(null);
            }}
          >
            <defs>
              {/* Grille architecturale fine + principale */}
              <pattern id="minorGrid2D" width={SCALE / 2} height={SCALE / 2} patternUnits="userSpaceOnUse">
                <path
                  d={`M ${SCALE / 2} 0 L 0 0 0 ${SCALE / 2}`}
                  fill="none"
                  stroke="#F1F1F1"
                  strokeWidth="1"
                />
              </pattern>
              <pattern id="majorGrid2D" width={SCALE * 2} height={SCALE * 2} patternUnits="userSpaceOnUse">
                <rect width={SCALE * 2} height={SCALE * 2} fill="url(#minorGrid2D)" />
                <path
                  d={`M ${SCALE * 2} 0 L 0 0 0 ${SCALE * 2}`}
                  fill="none"
                  stroke="#E4E4E4"
                  strokeWidth="1.2"
                />
              </pattern>

              {/* Parquet chevron chaud pour l'intérieur de la salle */}
              <pattern id="parquetChevron2D" width="44" height="44" patternUnits="userSpaceOnUse">
                <rect width="44" height="44" fill="#A9845B" />
                <path
                  d="M0 11 L11 0 L22 11 L11 22 Z M22 11 L33 0 L44 11 L33 22 Z M0 33 L11 22 L22 33 L11 44 Z M22 33 L33 22 L44 33 L33 44 Z"
                  fill="#9A754D"
                  opacity="0.55"
                />
                <path
                  d="M0 0 L22 22 M22 0 L44 22 M0 22 L22 44 M22 22 L44 44 M22 0 L0 22 M44 0 L22 22 M22 22 L0 44 M44 22 L22 44"
                  stroke="#87633D"
                  strokeWidth="0.9"
                  opacity="0.55"
                />
                {/* Quadrillage blanc subtil par-dessus le parquet comme sur l'image */}
                <path d="M 44 0 L 0 0 0 44" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="0.8" />
              </pattern>

              {/* Ombre portée douce pour les tables et sièges */}
              <filter id="tableShadow2D" x="-25%" y="-25%" width="150%" height="150%">
                <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#000000" floodOpacity="0.22" />
              </filter>
            </defs>

            {/* Fond quadrillé sur toute la surface */}
            <rect
              x={0}
              y={0}
              width={W}
              height={H}
              fill="url(#majorGrid2D)"
              onClick={() => onSelect(null)}
            />

            {/* Salle de réception : sol parquet + murs noirs épais */}
            <g>
              {/* Sol parquet */}
              <rect
                x={roomX}
                y={roomY}
                width={roomW}
                height={roomH}
                fill="url(#parquetChevron2D)"
              />

              {/* Lignes de grille blanches principales sur le parquet */}
              {Array.from({ length: Math.floor(room.width / 2) }, (_, i) => {
                const gx = roomX + (i + 1) * 2 * SCALE;
                return (
                  <line
                    key={`vg-${i}`}
                    x1={gx}
                    y1={roomY}
                    x2={gx}
                    y2={roomY + roomH}
                    stroke="rgba(255,255,255,0.28)"
                    strokeWidth={1}
                  />
                );
              })}
              {Array.from({ length: Math.floor(room.length / 2) }, (_, i) => {
                const gy = roomY + (i + 1) * 2 * SCALE;
                return (
                  <line
                    key={`hg-${i}`}
                    x1={roomX}
                    y1={gy}
                    x2={roomX + roomW}
                    y2={gy}
                    stroke="rgba(255,255,255,0.28)"
                    strokeWidth={1}
                  />
                );
              })}

              {/* Murs architecturaux noirs épais */}
              <rect
                x={roomX}
                y={roomY}
                width={roomW}
                height={roomH}
                fill="none"
                stroke="#0F0F0F"
                strokeWidth={9}
              />

              {/* Repères d'ouvertures / portes sur le mur du bas (comme sur le plan architectural) */}
              {[-0.22, 0, 0.22].map((ratio, idx) => (
                <rect
                  key={`door-${idx}`}
                  x={roomX + roomW * (0.5 + ratio) - 24}
                  y={roomY + roomH - 3.5}
                  width={48}
                  height={7}
                  fill="#EAE6DF"
                  stroke="#0F0F0F"
                  strokeWidth={1.5}
                />
              ))}

              {/* Dimensions de la salle affichées discrètement */}
              <text
                x={roomX + roomW / 2}
                y={roomY - 10}
                textAnchor="middle"
                fontSize={11}
                fill="#5A5365"
                fontWeight={600}
              >
                {room.width} m × {room.length} m
              </text>
            </g>

            {/* Objets de salle (Piste, Scène, Buffet, Bar, Photobooth, Estrade...) */}
            {objects.map((o) => {
              const d = OBJECT_DEFS[o.kind];
              const ow = d.w * SCALE;
              const od = d.d * SCALE;
              const isSelected = selectedId === o.id;
              const handleY = -od / 2 - 42;
              return (
                <g
                  key={o.id}
                  transform={`translate(${px(o.x)},${pz(o.z)}) rotate(${o.rotation})`}
                  onPointerDown={(e) => {
                    onSelect(o.id);
                    startItemDrag(e, o.id, o.x, o.z, false);
                  }}
                  className="cursor-move"
                >
                  <rect
                    x={-ow / 2}
                    y={-od / 2}
                    width={ow}
                    height={od}
                    fill={d.color}
                    fillOpacity={0.9}
                    rx={8}
                    stroke={isSelected ? '#88b7b5' : '#1F1B24'}
                    strokeWidth={isSelected ? 4.5 : 2.2}
                    filter="url(#tableShadow2D)"
                  />
                  <text
                    textAnchor="middle"
                    dy={5}
                    fontSize={16}
                    fill={o.kind === 'allee' ? '#2F2A36' : '#FFFFFF'}
                    fontWeight={700}
                    className="pointer-events-none"
                  >
                    {o.label}
                  </text>

                  {/* Poignée + boutons de rotation directe quand l'objet est sélectionné */}
                  {isSelected && (
                    <g>
                      <line
                        x1={0}
                        y1={-od / 2}
                        x2={0}
                        y2={handleY + 18}
                        stroke="#88b7b5"
                        strokeWidth={3}
                        strokeDasharray="4 3"
                      />
                      {/* Bouton -45° */}
                      <g
                        transform={`translate(-44, ${handleY})`}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          onRotateObject(o.id, ((o.rotation - 45) % 360 + 360) % 360);
                        }}
                        className="cursor-pointer"
                      >
                        <circle r={16} fill="#4B4456" stroke="#FFFFFF" strokeWidth={2} />
                        <text textAnchor="middle" dy={5} fontSize={14} fontWeight={700} fill="#FFFFFF">↺</text>
                      </g>
                      {/* Poignée centrale glissable à 360° */}
                      <g
                        transform={`translate(0, ${handleY})`}
                        onPointerDown={(e) => startRotateDrag2D(e, o.id, o.x, o.z, false)}
                        className="cursor-grab active:cursor-grabbing"
                      >
                        <title>Glissez pour tourner librement ({Math.round(o.rotation || 0)}°)</title>
                        <circle r={20} fill="#88b7b5" stroke="#FFFFFF" strokeWidth={2.5} />
                        <text textAnchor="middle" dy={5} fontSize={15} fontWeight={700} fill="#FFFFFF">⟳</text>
                      </g>
                      {/* Bouton +45° */}
                      <g
                        transform={`translate(44, ${handleY})`}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          onRotateObject(o.id, ((o.rotation + 45) % 360 + 360) % 360);
                        }}
                        className="cursor-pointer"
                      >
                        <circle r={16} fill="#4B4456" stroke="#FFFFFF" strokeWidth={2} />
                        <text textAnchor="middle" dy={5} fontSize={14} fontWeight={700} fill="#FFFFFF">↻</text>
                      </g>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Tables + chaises en corolle grand format ("fleur" blanche autour du plateau bois orangé) */}
            {tables.map((t) => {
              const seatCoords = getSeatPositions2D(t);
              const isSelected = selectedId === t.id;
              const seatRadius = 26;
              const selectRadius = t.shape === 'rectangle' ? 118 : t.shape === 'ovale' ? 114 : 98;
              const handleY = -selectRadius - 36;

              const tablePlateau =
                t.shape === 'ronde' ? (
                  <>
                    <circle r={42} fill="#FFFFFF" stroke="#E5E0D8" strokeWidth={2} />
                    <circle r={30} fill="#C67D3B" stroke="#A66326" strokeWidth={2} />
                  </>
                ) : t.shape === 'ovale' ? (
                  <>
                    <ellipse rx={64} ry={38} fill="#FFFFFF" stroke="#E5E0D8" strokeWidth={2} />
                    <ellipse rx={48} ry={26} fill="#C67D3B" stroke="#A66326" strokeWidth={2} />
                  </>
                ) : t.shape === 'carree' ? (
                  <>
                    <rect x={-44} y={-44} width={88} height={88} rx={12} fill="#FFFFFF" stroke="#E5E0D8" strokeWidth={2} />
                    <rect x={-32} y={-32} width={64} height={64} rx={8} fill="#C67D3B" stroke="#A66326" strokeWidth={2} />
                  </>
                ) : (
                  <>
                    <rect x={-74} y={-36} width={148} height={72} rx={12} fill="#FFFFFF" stroke="#E5E0D8" strokeWidth={2} />
                    <rect x={-58} y={-25} width={116} height={50} rx={8} fill="#C67D3B" stroke="#A66326" strokeWidth={2} />
                  </>
                );

              return (
                <g
                  key={t.id}
                  transform={`translate(${px(t.x)},${pz(t.z)}) rotate(${t.rotation})`}
                  onPointerDown={(e) => {
                    onSelect(t.id);
                    startItemDrag(e, t.id, t.x, t.z, true);
                  }}
                  className="cursor-move"
                  filter="url(#tableShadow2D)"
                >
                  {/* Halo de sélection + poignée de rotation directe sur la table */}
                  {isSelected && (
                    <g>
                      <circle
                        cx={0}
                        cy={0}
                        r={selectRadius}
                        fill="none"
                        stroke="#88b7b5"
                        strokeWidth={3.5}
                        strokeDasharray="7 5"
                      />
                      <line
                        x1={0}
                        y1={-selectRadius}
                        x2={0}
                        y2={handleY + 18}
                        stroke="#88b7b5"
                        strokeWidth={3}
                        strokeDasharray="4 3"
                      />
                      {/* Bouton -45° */}
                      <g
                        transform={`translate(-44, ${handleY})`}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          onRotateTable(t.id, ((t.rotation - 45) % 360 + 360) % 360);
                        }}
                        className="cursor-pointer"
                      >
                        <circle r={16} fill="#4B4456" stroke="#FFFFFF" strokeWidth={2} />
                        <text textAnchor="middle" dy={5} fontSize={14} fontWeight={700} fill="#FFFFFF">↺</text>
                      </g>
                      {/* Poignée centrale glissable à 360° */}
                      <g
                        transform={`translate(0, ${handleY})`}
                        onPointerDown={(e) => startRotateDrag2D(e, t.id, t.x, t.z, true)}
                        className="cursor-grab active:cursor-grabbing"
                      >
                        <title>Glissez pour tourner la table ({Math.round(t.rotation || 0)}°)</title>
                        <circle r={20} fill="#88b7b5" stroke="#FFFFFF" strokeWidth={2.5} />
                        <text textAnchor="middle" dy={5} fontSize={15} fontWeight={700} fill="#FFFFFF">⟳</text>
                      </g>
                      {/* Bouton +45° */}
                      <g
                        transform={`translate(44, ${handleY})`}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          onRotateTable(t.id, ((t.rotation + 45) % 360 + 360) % 360);
                        }}
                        className="cursor-pointer"
                      >
                        <circle r={16} fill="#4B4456" stroke="#FFFFFF" strokeWidth={2} />
                        <text textAnchor="middle" dy={5} fontSize={14} fontWeight={700} fill="#FFFFFF">↻</text>
                      </g>
                    </g>
                  )}

                  {/* Chaises blanches autour de la table (numéro si libre, initiales si occupée) */}
                  {t.seats.map((s, i) => {
                    const pos = seatCoords[i] || { x: 0, y: 0 };
                    const occupant = s.guest_id ? guests.find((g) => g.id === s.guest_id) : undefined;
                    const isTarget =
                      (assignTarget?.tableId === t.id && assignTarget?.seatIndex === i) ||
                      (dragOverSeat?.tableId === t.id && dragOverSeat?.seatIndex === i);
                    const seatLabel = occupant ? formatSeatGuestLabel(occupant.name) : String(i + 1);

                    return (
                      <g
                        key={i}
                        transform={`translate(${pos.x},${pos.y})`}
                        onPointerDown={(e) => {
                          // Empêche le drag de la table quand on clique directement une chaise
                          e.stopPropagation();
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (activeGuestId) {
                            onAssignSeatDirect(t.id, i, activeGuestId);
                            setActiveGuestId(null);
                          } else {
                            onSeatClick(t.id, i);
                          }
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          if (dragOverSeat?.tableId !== t.id || dragOverSeat?.seatIndex !== i) {
                            setDragOverSeat({ tableId: t.id, seatIndex: i });
                          }
                        }}
                        onDragLeave={() => {
                          if (dragOverSeat?.tableId === t.id && dragOverSeat?.seatIndex === i) {
                            setDragOverSeat(null);
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const droppedGuestId = e.dataTransfer.getData('text/plain');
                          if (droppedGuestId) {
                            onAssignSeatDirect(t.id, i, droppedGuestId);
                            setActiveGuestId(null);
                          }
                          setDragOverSeat(null);
                        }}
                        className="cursor-pointer"
                      >
                        <title>
                          {occupant
                            ? `Place ${i + 1} : ${occupant.name}${occupant.isChild ? ' (Enfant)' : ''}`
                            : `Place ${i + 1} (libre — cliquez ou glissez un invité)`}
                        </title>
                        <circle
                          r={seatRadius}
                          fill={occupant ? '#FFFDF9' : '#FFFFFF'}
                          stroke={isTarget ? '#88b7b5' : occupant ? '#C67D3B' : '#CFC9BE'}
                          strokeWidth={isTarget ? 3.5 : occupant ? 2.2 : 1.6}
                        />
                        <text
                          textAnchor="middle"
                          dy={5.5}
                          transform={`rotate(${-t.rotation})`}
                          fontSize={occupant ? 15.5 : 16.5}
                          fontWeight={occupant ? 700 : 600}
                          fill={occupant ? '#1F1B24' : '#3A3542'}
                          className="pointer-events-none"
                        >
                          {seatLabel}
                        </text>
                        {occupant?.isChild && (
                          <circle
                            cx={seatRadius * 0.65}
                            cy={-seatRadius * 0.65}
                            r={6}
                            fill="#EA580C"
                            stroke="#FFFFFF"
                            strokeWidth={1.5}
                          />
                        )}
                      </g>
                    );
                  })}

                  {/* Plateau central de la table */}
                  {tablePlateau}

                  {/* Nom de la table au centre */}
                  <text
                    textAnchor="middle"
                    dy={5}
                    fontSize={15.5}
                    fontWeight={700}
                    fill="#FFFFFF"
                    style={{ paintOrder: 'stroke', stroke: '#5A3410', strokeWidth: 3.2, strokeLinejoin: 'round' }}
                    className="pointer-events-none"
                  >
                    {t.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}

/* ---------- Point caméra sur la minimap (rAF, pas de setState) ---------- */
function CamDot({ camRef }: { camRef: React.MutableRefObject<{ x: number; z: number; dir: number } | null> }) {
  const dotRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const p = camRef.current;
      if (dotRef.current && p) {
        dotRef.current.style.left = `${50 + p.x * 5.4}%`;
        dotRef.current.style.top = `${50 + p.z * 5.4}%`;
        dotRef.current.style.transform = `translate(-50%,-50%) rotate(${p.dir}rad)`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [camRef]);
  return (
    <div
      ref={dotRef}
      className="absolute w-0 h-0"
      style={{ left: '50%', top: '50%' }}
    >
      <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-b-[9px] border-l-transparent border-r-transparent border-b-brand-purple" />
    </div>
  );
}

/* ============================ Page ============================ */

export default function PlanTablePage() {
  const { client, event } = useClientData();
  const { user } = useAuth();
  const clientName = `${client?.name || ''}${client?.partner ? ' & ' + client.partner : ''}`.trim() || event?.couple_names || 'Client';
  const daysRemaining = event?.event_date ? calculateDaysRemaining(event.event_date) : 0;
  const clientId = (client as any)?.id || '';

  // ---- État du plan ----
  const [planId, setPlanId] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomConfig>({ width: 16, length: 16 });
  const [decor, setDecor] = useState<DecorConfig>(DEFAULT_DECOR);
  // Zéro donnée par défaut : nouveaux comptes = plan vide, wizard propose.
  const [tables, setTables] = useState<PlanTable[]>([]);
  const [objects, setObjects] = useState<SceneObject[]>([]);
  const [guests, setGuests] = useState<PlanGuest[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [assignTarget, setAssignTarget] = useState<{ tableId: string; seatIndex: number } | null>(null);
  const [mood, setMood] = useState<Mood>('jour');
  const [view, setView] = useState<'3d' | '2d'>('3d');
  const [walkMode, setWalkMode] = useState(false);
  const [tour, setTour] = useState(false);
  const [flyTo, setFlyTo] = useState<{ pos: [number, number, number]; look: [number, number, number] } | null>(null);
  const [walkHint, setWalkHint] = useState(false);
  const camRef = useRef<{ x: number; z: number; dir: number } | null>(null);
  const miniRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [newGuestName, setNewGuestName] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [captureNonce, setCaptureNonce] = useState(0);
  const [resetOpen, setResetOpen] = useState(false);

  // Réinitialisation : vide la salle, optionnellement les invités.
  const resetPlan = (keepGuests: boolean) => {
    pushHistory();
    setTables([]);
    setObjects([]);
    setRoom({ width: 16, length: 16 });
    setDecor(DEFAULT_DECOR);
    setSelectedId(null);
    setAssignTarget(null);
    if (!keepGuests) setGuests([]);
    setResetOpen(false);
    toast.success(keepGuests ? 'Salle réinitialisée : invités conservés' : 'Plan entièrement effacé');
  };
  const [wizardOpen, setWizardOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<'composer' | 'style' | 'placement'>('composer');

  // ---- Undo / Redo : pile d'états du plan ----
  type PlanState = { tables: PlanTable[]; objects: SceneObject[]; guests: PlanGuest[]; room: RoomConfig; decor: DecorConfig };
  const [history, setHistory] = useState<PlanState[]>([]);
  const [future, setFuture] = useState<PlanState[]>([]);
  // Snapshot avant chaque mutation importante (drag terminé, ajout, suppression).
  const pushHistory = useCallback(() => {
    setHistory((h) => [...h.slice(-30), { tables, objects, guests, room, decor }]);
    setFuture([]);
  }, [tables, objects, guests, room, decor]);

  const dragRecorded = useRef(false);
  useEffect(() => {
    const finishDrag = () => { dragRecorded.current = false; };
    window.addEventListener('pointerup', finishDrag);
    window.addEventListener('pointercancel', finishDrag);
    window.addEventListener('blur', finishDrag);
    return () => {
      window.removeEventListener('pointerup', finishDrag);
      window.removeEventListener('pointercancel', finishDrag);
      window.removeEventListener('blur', finishDrag);
    };
  }, []);
  const recordDrag = () => {
    if (dragRecorded.current) return;
    pushHistory();
    dragRecorded.current = true;
  };

  const undo = () => {
    if (!history.length) return;
    setFuture((f) => [{ tables, objects, guests, room, decor }, ...f]);
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setTables(prev.tables); setObjects(prev.objects); setGuests(prev.guests); setRoom(prev.room); setDecor(prev.decor || DEFAULT_DECOR);
  };
  const redo = () => {
    if (!future.length) return;
    setHistory((h) => [...h, { tables, objects, guests, room, decor }]);
    const next = future[0];
    setFuture((f) => f.slice(1));
    setTables(next.tables); setObjects(next.objects); setGuests(next.guests); setRoom(next.room); setDecor(next.decor || DEFAULT_DECOR);
  };

  // ---- Chargement du plan existant (table_plans, filtré client_id) ----
  useEffect(() => {
    if (!clientId || loaded) return;
    (async () => {
      try {
        const docs = (await getDocuments('table_plans', [{ field: 'client_id', operator: '==', value: clientId }])) as any[];
        if (docs[0]) {
          const d = docs[0];
          setPlanId(d.id);
          if (d.room) setRoom(d.room);
          if (d.decor) setDecor({ ...DEFAULT_DECOR, ...d.decor });
          if (Array.isArray(d.tables)) setTables(d.tables);
          if (Array.isArray(d.objects)) setObjects(d.objects);
          if (Array.isArray(d.guests)) setGuests(d.guests);
        }
        // Assistant auto UNIQUEMENT si plan totalement vide ou inexistant
        // (jamais si l'utilisateur a déjà du contenu sauvegardé).
        const plan = docs[0];
        const empty =
          !plan ||
          (!(plan.tables || []).length &&
            !(plan.objects || []).length &&
            !(plan.guests || []).length);
        if (empty) setWizardOpen(true);
      } catch (e) {
        console.error('plan-table load error:', e);
      } finally {
        setLoaded(true);
      }
    })();
  }, [clientId, loaded]);

  // Auto-fit : la salle grandit quand les éléments débordent ses murs
  // (rectangle chocolat englobe toujours tout, avec une marge de 2m).
  useEffect(() => {
    if (!loaded) return;
    let needW = room.width;
    let needL = room.length;
    for (const t of tables) {
      const r = TABLE_SHAPES[t.shape].seatDist + 1.4;
      needW = Math.max(needW, Math.abs(t.x) * 2 + r * 2);
      needL = Math.max(needL, Math.abs(t.z) * 2 + r * 2);
    }
    for (const o of objects) {
      const d = OBJECT_DEFS[o.kind];
      needW = Math.max(needW, Math.abs(o.x) * 2 + d.w + 2);
      needL = Math.max(needL, Math.abs(o.z) * 2 + d.d + 2);
    }
    const w = Math.round(needW * 2) / 2;
    const l = Math.round(needL * 2) / 2;
    if (w > room.width + 0.2 || l > room.length + 0.2) {
      setRoom({ width: Math.min(40, w), length: Math.min(34, l) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables, objects, loaded]);

  // Génération wizard : applique salle + tables + objets produits par
  // lib/table-plan/wizard.ts, puis laisse l'utilisateur tout modifier.
  const applyGenerated = (plan: { room: RoomConfig; tables: PlanTable[]; objects: SceneObject[] }) => {
    setRoom(plan.room);
    setTables(plan.tables);
    setObjects(plan.objects);
    setWizardOpen(false);
    setPanelTab('placement');
    toast.success('Votre salle est générée : personnalisez-la librement');
  };

  // ---- Sauvegarde du plan ----
  const savePlan = async () => {
    if (!clientId) return;
    setSaving(true);
    try {
      const { addDocument } = await import('@/lib/db');
      const payload: Partial<TablePlanDoc> = {
        client_id: clientId,
        planner_id: user?.uid || '',
        room, decor, tables, objects, guests,
        updated_at: new Date(),
        updated_by: user?.uid || '',
      };
      if (planId) await updateDocument('table_plans', planId, payload as any);
      else {
        const ref = await addDocument('table_plans', payload as any);
        setPlanId(ref.id);
      }
      toast.success('Plan sauvegardé');
    } catch (e) {
      console.error('save plan error:', e);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  // ---- Actions tables ----
  const addTable = (shape: TableShape) => {
    pushHistory();
    const free = SLOTS.find(([x, z]) => !tables.some((t) => Math.abs(t.x - x) < 1 && Math.abs(t.z - z) < 1)) || [0, 0];
    const n = tables.length + 1;
    const seatCount = shape === 'carree' ? 4 : shape === 'rectangle' ? 8 : 6;
    const t: PlanTable = {
      id: `t${Date.now()}`, shape, name: `Table ${n}`,
      x: free[0], z: free[1], rotation: 0, seatCount,
      accent: ACCENTS[n % ACCENTS.length].color, seats: makeSeats(seatCount),
    };
    setTables((p) => [...p, t]);
    setSelectedId(t.id);
  };
  const patchTable = (id: string, patch: Partial<PlanTable>) =>
    setTables((p) => p.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  // Déplace une table librement et de façon fluide dans la salle.
  const moveTable = (id: string, x: number, z: number) => {
    const self = tables.find((t) => t.id === id);
    if (!self) return;
    const nx = clampRoom(x, room.width / 2);
    const nz = clampRoom(z, room.length / 2);
    if (self.x !== nx || self.z !== nz) {
      recordDrag();
      patchTable(id, { x: nx, z: nz });
    }
  };
  const moveObject = (id: string, x: number, z: number) => {
    const object = objects.find((o) => o.id === id);
    const nx = clampRoom(x, room.width / 2);
    const nz = clampRoom(z, room.length / 2);
    if (!object || (object.x === nx && object.z === nz)) return;
    recordDrag();
    setObjects((p) => p.map((o) => (o.id === id ? { ...o, x: nx, z: nz } : o)));
  };
  const rotateTable = (id: string, rotation: number) => {
    recordDrag();
    patchTable(id, { rotation: ((Math.round(rotation) % 360) + 360) % 360 });
  };
  const rotateObject = (id: string, rotation: number) => {
    recordDrag();
    const norm = ((Math.round(rotation) % 360) + 360) % 360;
    setObjects((p) => p.map((o) => (o.id === id ? { ...o, rotation: norm } : o)));
  };
  const removeTable = (id: string) => {
    pushHistory();
    setTables((p) => p.filter((t) => t.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  // ---- Objets de salle ----
  const addObject = (kind: SceneObjectKind) => {
    pushHistory();
    const def = OBJECT_DEFS[kind];
    const o: SceneObject = { id: `o${Date.now()}`, kind, label: def.label, x: 0, z: 4.5, rotation: 0 };
    setObjects((p) => [...p, o]);
    setSelectedId(o.id);
  };
  const removeObject = (id: string) => {
    pushHistory();
    setObjects((p) => p.filter((o) => o.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  // ---- Invités & sièges ----
  const guestName = useCallback((id: string) => guests.find((g) => g.id === id)?.name, [guests]);
  const guestMap = useMemo(() => Object.fromEntries(guests.map((g) => [g.id, g.name])), [guests]);
  // Sièges occupés → ids d'invités déjà placés.
  const placedIds = useMemo(() => new Set(tables.flatMap((t) => t.seats.map((s) => s.guest_id).filter(Boolean))), [tables]);
  const unseatedGuests = guests.filter((g) => !placedIds.has(g.id));
  const seatedCount = guests.length - unseatedGuests.length;

  const addGuest = () => {
    const name = newGuestName.trim();
    if (!name) return;
    pushHistory();
    setGuests((p) => [...p, { id: `g${Date.now()}`, name }]);
    setNewGuestName('');
  };
  // Met à jour les détails d'un invité (groupe, régime, notes).
  const patchGuest = (id: string, patch: Partial<PlanGuest>) =>
    setGuests((p) => p.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  // Affectation auto : respecte groupes + contraintes, remplit les places libres.
  const runAutoAssign = () => {
    pushHistory();
    setTables((prev) => autoAssign(prev, guests));
    toast.success('Invités placés automatiquement');
  };
  const removeGuest = (id: string) => {
    pushHistory();
    // Libère le siège occupé éventuel + supprime l'invité.
    setTables((p) => p.map((t) => ({ ...t, seats: t.seats.map((s) => (s.guest_id === id ? { ...s, guest_id: null } : s)) })));
    setGuests((p) => p.filter((g) => g.id !== id));
  };

  // Clic siège → ouvre/ferme la cible d'assignation.
  const handleSeatClick = (tableId: string, seatIndex: number) => {
    setAssignTarget((cur) =>
      cur?.tableId === tableId && cur?.seatIndex === seatIndex ? null : { tableId, seatIndex }
    );
  };
  // Saisie libre sur une ligne de siège (onglet Placement) :
  // - vide → libère le siège
  // - siège occupé + nouveau nom inconnu → RENOMME l'invité (même id)
  // - nom d'un autre invité → le déplace sur ce siège
  // - nom inconnu + siège vide → crée l'invité
  const commitSeatName = (tableId: string, seatIndex: number, raw: string) => {
    const name = raw.trim();
    pushHistory();
    const seat = tables.find((t) => t.id === tableId)?.seats[seatIndex];
    const currentGuest = seat?.guest_id ? guests.find((g) => g.id === seat.guest_id) : null;
    const otherGuest = guests.find((g) => g.name.toLowerCase() === name.toLowerCase());

    // Cas 1 : vide → libère
    if (!name) {
      setTables((p) => p.map((t) => (t.id === tableId ? { ...t, seats: t.seats.map((s, i) => (i === seatIndex ? { ...s, guest_id: null } : s)) } : t)));
      return;
    }
    // Cas 2 : même invité renommé
    if (currentGuest && !otherGuest) {
      patchGuest(currentGuest.id, { name });
      return;
    }
    // Cas 3 : invité connu → le place ici (libère son ancien siège)
    const gid = otherGuest ? otherGuest.id : `g${Date.now()}_${seatIndex}`;
    if (!otherGuest) setGuests((p) => [...p, { id: gid, name }]);
    setTables((p) =>
      p.map((t) => ({
        ...t,
        seats: t.seats.map((s, i) => {
          if (s.guest_id === gid) return { ...s, guest_id: null };
          if (t.id === tableId && i === seatIndex) return { ...s, guest_id: gid };
          return s;
        }),
      }))
    );
  };

  // Assigne un invité au siège ciblé (libère son ancien siège le cas échéant).

  const assignSeatDirect = (tableId: string, seatIndex: number, guestId: string | null) => {
    pushHistory();
    setTables((prev) =>
      prev.map((t) => {
        const cleared = { ...t, seats: t.seats.map((s) => (guestId && s.guest_id === guestId ? { ...s, guest_id: null } : s)) };
        if (t.id !== tableId) return cleared;
        return { ...cleared, seats: cleared.seats.map((s, i) => (i === seatIndex ? { ...s, guest_id: guestId } : s)) };
      })
    );
    setAssignTarget(null);
  };

  const assignGuest = (guestId: string | null) => {
    if (!assignTarget) return;
    assignSeatDirect(assignTarget.tableId, assignTarget.seatIndex, guestId);
  };
  // Change le type de siège (bébé/PMR/VIP) du siège ciblé.
  const setSeatKind = (kind: SeatKind) => {
    if (!assignTarget) return;
    pushHistory();
    const { tableId, seatIndex } = assignTarget;
    setTables((prev) =>
      prev.map((t) => (t.id !== tableId ? t : { ...t, seats: t.seats.map((s, i) => (i === seatIndex ? { ...s, kind } : s)) }))
    );
  };

  const selected = tables.find((t) => t.id === selectedId) || null;
  const selectedObject = objects.find((o) => o.id === selectedId) || null;
  const targetSeat = assignTarget
    ? tables.find((t) => t.id === assignTarget.tableId)?.seats[assignTarget.seatIndex]
    : null;

  return (
    <ClientDashboardLayout clientName={clientName} daysRemaining={daysRemaining}>
      <div className="space-y-4">
        {/* En-tête + actions globales */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-purple">Plan de table 3D</h1>
            <p className="text-sm text-brand-gray mt-1">
              {tables.length} table{tables.length > 1 ? 's' : ''} · {seatedCount}/{guests.length} invités placés
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 max-w-full overflow-x-auto pb-1 [scrollbar-width:thin]">
            {/* undo / redo */}
            <div className="flex rounded-full bg-white border border-[rgba(75,68,86,0.1)] p-1 shadow-sm">
              <button onClick={undo} disabled={!history.length} title="Annuler"
                className="w-8 h-8 rounded-full flex items-center justify-center text-brand-gray hover:text-brand-purple disabled:opacity-30">
                <Undo2 className="w-4 h-4" />
              </button>
              <button onClick={redo} disabled={!future.length} title="Rétablir"
                className="w-8 h-8 rounded-full flex items-center justify-center text-brand-gray hover:text-brand-purple disabled:opacity-30">
                <Redo2 className="w-4 h-4" />
              </button>
            </div>
            {/* vue 3D / 2D */}
            <div className="flex rounded-full bg-white border border-[rgba(75,68,86,0.1)] p-1 shadow-sm">
              <button onClick={() => setView('3d')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${view === '3d' ? 'bg-brand-purple text-white' : 'text-brand-gray'}`}>
                <Move3d className="w-3.5 h-3.5" /> 3D
              </button>
              <button onClick={() => { setWalkMode((w) => !w); setTour(false); setWalkHint(walkMode ? walkHint : true); }} disabled={view === '2d'}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${walkMode ? 'bg-brand-turquoise text-white' : 'text-brand-gray'} disabled:opacity-40`}>
                <Users className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{walkMode ? 'Quitter la balade' : 'Se balader'}</span>
              </button>
              <button onClick={() => { setTour((t) => !t); setWalkMode(false); }} disabled={view === '2d'}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${tour ? 'bg-brand-purple text-white' : 'text-brand-gray'} disabled:opacity-40`}>
                <Move3d className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{tour ? 'Stop visite' : 'Visite guidée'}</span>
              </button>
              <button onClick={() => setView('2d')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${view === '2d' ? 'bg-brand-purple text-white' : 'text-brand-gray'}`}>
                <LayoutGrid className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Vue du dessus</span><span className="sm:hidden">2D</span>
              </button>
            </div>
            {/* ambiance */}
            <div className="flex rounded-full bg-white border border-[rgba(75,68,86,0.1)] p-1 shadow-sm">
              {(['jour', 'soiree'] as Mood[]).map((m) => (
                <button key={m} onClick={() => setMood(m)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${mood === m ? 'bg-brand-purple text-white' : 'text-brand-gray'}`}>
                  {m === 'jour' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
            {/* exports réels : PDF jsPDF + PNG multi-angles */}
            <div className="flex rounded-full bg-white border border-[rgba(75,68,86,0.1)] p-1 shadow-sm gap-0.5">
              <button onClick={() => exportTraiteurPdf(tables, guests, clientName)}
                className="px-2.5 py-1.5 rounded-full text-[11.5px] font-semibold text-brand-gray hover:text-brand-purple transition-colors">
                Fiche traiteur
              </button>
              <button onClick={() => setCaptureNonce((n) => n + 1)} disabled={view === '2d'}
                className="px-2.5 py-1.5 rounded-full text-[11.5px] font-semibold text-brand-gray hover:text-brand-purple transition-colors disabled:opacity-40">
                Vues 3D
              </button>
            </div>
            {/* relancer l'assistant de génération */}
            <button onClick={() => setWizardOpen(true)}
              className="px-3.5 py-2 rounded-full text-[12.5px] font-semibold border border-brand-turquoise/40 text-brand-turquoise hover:bg-brand-turquoise hover:text-white transition-colors">
              Assistant
            </button>
            <button onClick={() => void savePlan()} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-brand-turquoise text-white text-[12.5px] font-semibold shadow hover:bg-brand-turquoise-hover transition-colors disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Sauvegarder
            </button>
            {/* réinitialiser tout : juste après Sauvegarder */}
            <button onClick={() => setResetOpen(true)} title="Réinitialiser le plan"
              className="w-9 h-9 rounded-full bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4 items-start">
          {/* Zone centrale : 3D ou 2D */}
          <div
            ref={containerRef}
            className={`relative rounded-[22px] overflow-hidden border border-[rgba(75,68,86,0.08)] shadow-xl ${
              view === '2d' ? 'bg-white h-[78vh] min-h-[600px]' : 'bg-[#f2eadf] h-[68vh] min-h-[480px]'
            }`}
          >
            {view === '3d' ? (
              <StaticHallScene
                tables={tables}
                objects={objects}
                selectedId={selectedId}
                assignTarget={assignTarget}
                guestName={guestName}
                childGuestIds={guests.filter((g) => g.isChild).map((g) => g.id)}
                onSelectTable={setSelectedId}
                onSeatClick={handleSeatClick}
                onMoveTable={moveTable}
                onMoveObject={moveObject}
                onRotateTable={rotateTable}
                onRotateObject={rotateObject}
                walkMode={walkMode}
                room={room}
                decor={decor}
                tour={tour}
                onTourEnd={() => setTour(false)}
                flyTo={flyTo}
                camRef={camRef}
                captureNonce={captureNonce}
                onCaptureViews={(imgs) => {
                  // composite 3×2 des 6 angles → téléchargement PNG unique
                  const size = 640;
                  const cv = document.createElement('canvas');
                  cv.width = size * 3;
                  cv.height = size * 2;
                  const ctx = cv.getContext('2d')!;
                  ctx.fillStyle = '#f4f2ee';
                  ctx.fillRect(0, 0, cv.width, cv.height);
                  const LABELS = ['Vue du dessus', 'Face +Z', 'Face -Z', 'Côté +X', 'Côté -X', 'Perspective'];
                  imgs.forEach((src, i) => {
                    const img = new Image();
                    img.onload = () => {
                      ctx.drawImage(img, (i % 3) * size, Math.floor(i / 3) * size, size, size);
                      ctx.fillStyle = 'rgba(255,255,255,0.9)';
                      ctx.fillRect((i % 3) * size + 12, Math.floor(i / 3) * size + 12, 130, 26);
                      ctx.fillStyle = '#4B4456';
                      ctx.font = 'bold 15px sans-serif';
                      ctx.fillText(LABELS[i], (i % 3) * size + 20, Math.floor(i / 3) * size + 31);
                      if (i === imgs.length - 1) {
                        const a = document.createElement('a');
                        a.href = cv.toDataURL('image/png');
                        a.download = `plan-salle-multi-angles-${Date.now()}.png`;
                        a.click();
                      }
                    };
                    img.src = src;
                  });
                }}
                mood={mood}
              />
            ) : (
              <TopDownView
                tables={tables}
                objects={objects}
                room={room}
                guests={guests}
                selectedId={selectedId}
                assignTarget={assignTarget}
                onSelect={setSelectedId}
                onSeatClick={handleSeatClick}
                onMoveTable={moveTable}
                onMoveObject={moveObject}
                onRotateTable={rotateTable}
                onRotateObject={rotateObject}
                onAssignSeatDirect={assignSeatDirect}
              />
            )}
            {/* aide balade : s'affiche à l'entrée du mode, se ferme au clic */}
            {view === '3d' && walkMode && walkHint && (
              <button
                onClick={() => setWalkHint(false)}
                className="absolute inset-x-4 top-4 mx-auto max-w-md bg-white/95 backdrop-blur rounded-2xl shadow-xl border border-[rgba(75,68,86,0.08)] p-4 text-left"
              >
                <p className="text-[13px] font-semibold text-brand-purple mb-1">Bienvenue dans votre salle</p>
                <p className="text-[12px] text-brand-gray leading-relaxed">
                  <strong className="text-brand-purple">Ordinateur</strong> : cliquez dans la salle, puis ZQSD ou flèches pour marcher, Échap pour quitter.
                  <br />
                  <strong className="text-brand-purple">Téléphone</strong> : glissez pour regarder, touchez un point au sol pour y aller.
                </p>
                <p className="text-[11px] text-brand-turquoise font-semibold mt-2 text-center">Compris</p>
              </button>
            )}
            {/* minimap : position caméra en temps réel */}
            {view === '3d' && (
              <div className="absolute bottom-3 right-3 w-24 h-24 rounded-xl bg-white/80 backdrop-blur-sm border border-[rgba(75,68,86,0.1)] shadow-sm overflow-hidden">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <rect x={4} y={4} width={92} height={92} fill="#f2eadf" rx={6} />
                  {tables.map((t) => (
                    <circle key={t.id} cx={50 + t.x * 5.4} cy={50 + t.z * 5.4} r={4.5}
                      fill={t.accent} opacity={0.9} />
                  ))}
                  {objects.map((o) => (
                    <rect key={o.id} x={50 + o.x * 5.4 - 3} y={50 + o.z * 5.4 - 3} width={6} height={6}
                      fill="#4B4456" opacity={0.5} rx={1.5} />
                  ))}
                </svg>
                <CamDot camRef={camRef} />
              </div>
            )}
            {/* bouton photo : capture le canvas WebGL */}
            {view === '3d' && (
              <button
                onClick={() => {
                  const c = containerRef.current?.querySelector('canvas');
                  if (!c) return;
                  const a = document.createElement('a');
                  a.href = c.toDataURL('image/png');
                  a.download = `plan-salle-${Date.now()}.png`;
                  a.click();
                }}
                className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-white/85 backdrop-blur-sm text-[11px] font-semibold text-brand-purple shadow-sm hover:bg-white transition-colors"
              >
                Photo
              </button>
            )}
            <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/85 backdrop-blur-sm text-[11px] text-brand-purple shadow-sm pointer-events-none">
              <Move3d className="w-3.5 h-3.5" />
              {view === '2d' ? 'Glissez les tables et objets' : tour ? 'Visite guidée en cours...' : walkMode ? 'Cliquez pour regarder · ZQSD ou flèches pour marcher · Échap pour sortir' : 'Glissez les tables · cliquez une chaise pour placer un invité'}
            </div>
          </div>

          {/* Panneau latéral : onglets Composer / Style & Décor / Placement */}
          <div className="space-y-4">
            <div className="flex rounded-full bg-white border border-[rgba(75,68,86,0.1)] p-1 shadow-sm">
              {([
                { id: 'composer', label: 'Salle' },
                { id: 'style', label: 'Style & Décor' },
                { id: 'placement', label: 'Invités' },
              ] as const).map((tab) => (
                <button key={tab.id} onClick={() => setPanelTab(tab.id)}
                  className={`flex-1 py-1.5 rounded-full text-[11.5px] font-semibold transition-colors ${panelTab === tab.id ? 'bg-brand-purple text-white' : 'text-brand-gray'}`}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ==== Onglet Style & Décor : sol, tables, couleurs, chaises, fleurs, assiettes ==== */}
            {panelTab === 'style' && (
              <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                {/* Ambiances rapides en 1 clic */}
                <div className="bg-white rounded-[16px] border border-[rgba(75,68,86,0.08)] p-3.5 shadow-sm">
                  <p className="text-[12.5px] font-semibold text-brand-purple mb-2">Ambiances prédéfinies</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => { pushHistory(); setDecor(DEFAULT_DECOR); }}
                      className="text-left px-2.5 py-2 rounded-xl border border-[rgba(75,68,86,0.12)] bg-[#FAF9F7] hover:border-brand-turquoise transition-colors"
                    >
                      <p className="text-[11.5px] font-semibold text-brand-purple">Classique (Défaut)</p>
                      <p className="text-[10px] text-brand-gray">Dalles · Nappe · Napoléon</p>
                    </button>
                    <button
                      onClick={() => {
                        pushHistory();
                        setDecor({
                          floor: 'parquet_chevron',
                          tableStyle: 'bois_verni',
                          clothColor: '#f5f1ea',
                          chairStyle: 'chiavari_bois',
                          centerpiece: 'boule_blanche',
                          flowerColor: '#ffffff',
                          tableware: 'prestige',
                        });
                      }}
                      className="text-left px-2.5 py-2 rounded-xl border border-[rgba(75,68,86,0.12)] bg-[#FAF9F7] hover:border-brand-turquoise transition-colors"
                    >
                      <p className="text-[11.5px] font-semibold text-brand-purple">Bois & Cristal</p>
                      <p className="text-[10px] text-brand-gray">Parquet · Bois verni · Chiavari</p>
                    </button>
                    <button
                      onClick={() => {
                        pushHistory();
                        setDecor({
                          floor: 'marbre_veine',
                          tableStyle: 'marbre_or',
                          clothColor: '#ffffff',
                          chairStyle: 'chiavari_or',
                          centerpiece: 'candelabre',
                          flowerColor: '#f5e1c0',
                          tableware: 'filet_or',
                        });
                      }}
                      className="text-left px-2.5 py-2 rounded-xl border border-[rgba(75,68,86,0.12)] bg-[#FAF9F7] hover:border-brand-turquoise transition-colors"
                    >
                      <p className="text-[11.5px] font-semibold text-brand-purple">Château Or</p>
                      <p className="text-[10px] text-brand-gray">Marbre · Filet d&apos;or · Or</p>
                    </button>
                    <button
                      onClick={() => {
                        pushHistory();
                        setDecor({
                          floor: 'parquet_clair',
                          tableStyle: 'bois_chene',
                          clothColor: '#e5dac9',
                          chairStyle: 'medaillon',
                          centerpiece: 'eucalyptus',
                          flowerColor: '#ffffff',
                          tableware: 'champetre',
                        });
                      }}
                      className="text-left px-2.5 py-2 rounded-xl border border-[rgba(75,68,86,0.12)] bg-[#FAF9F7] hover:border-brand-turquoise transition-colors"
                    >
                      <p className="text-[11.5px] font-semibold text-brand-purple">Champêtre</p>
                      <p className="text-[10px] text-brand-gray">Chêne · Médaillon · Eucalyptus</p>
                    </button>
                  </div>
                </div>

                {/* Sol */}
                <div className="bg-white rounded-[16px] border border-[rgba(75,68,86,0.08)] p-3.5 shadow-sm">
                  <p className="text-[12.5px] font-semibold text-brand-purple mb-2">Sol de la salle</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {FLOOR_OPTIONS.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => { pushHistory(); setDecor((d) => ({ ...d, floor: f.id })); }}
                        className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border text-left text-[11px] font-medium transition-colors ${
                          decor.floor === f.id
                            ? 'border-brand-turquoise bg-brand-turquoise/10 text-brand-purple font-semibold'
                            : 'border-[rgba(75,68,86,0.1)] bg-[#FAF9F7] text-brand-gray hover:text-brand-purple'
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full border border-black/15 shrink-0" style={{ background: f.swatch }} />
                        <span className="truncate">{f.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Style des tables + Couleur de nappe */}
                <div className="bg-white rounded-[16px] border border-[rgba(75,68,86,0.08)] p-3.5 shadow-sm">
                  <p className="text-[12.5px] font-semibold text-brand-purple mb-2">Style des tables</p>
                  <div className="space-y-1.5">
                    {TABLE_STYLE_OPTIONS.map((ts) => (
                      <button
                        key={ts.id}
                        onClick={() => { pushHistory(); setDecor((d) => ({ ...d, tableStyle: ts.id })); }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left text-[11.5px] font-medium transition-colors ${
                          decor.tableStyle === ts.id
                            ? 'border-brand-turquoise bg-brand-turquoise/10 text-brand-purple font-semibold'
                            : 'border-[rgba(75,68,86,0.1)] bg-[#FAF9F7] text-brand-gray hover:text-brand-purple'
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full border border-black/15 shrink-0" style={{ background: ts.swatch }} />
                        <span>{ts.label}</span>
                      </button>
                    ))}
                  </div>
                  {decor.tableStyle === 'nappe' && (
                    <div className="mt-3 pt-2.5 border-t border-[rgba(75,68,86,0.08)]">
                      <p className="text-[11px] text-brand-gray mb-2">Couleur de la nappe</p>
                      <div className="flex flex-wrap gap-2">
                        {CLOTH_COLORS.map((c) => (
                          <button
                            key={c.color}
                            onClick={() => { pushHistory(); setDecor((d) => ({ ...d, clothColor: c.color })); }}
                            title={c.label}
                            className={`w-7 h-7 rounded-full border border-black/15 transition-transform hover:scale-110 ${
                              decor.clothColor === c.color ? 'ring-2 ring-offset-2 ring-brand-purple scale-110' : ''
                            }`}
                            style={{ background: c.color }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Style des chaises */}
                <div className="bg-white rounded-[16px] border border-[rgba(75,68,86,0.08)] p-3.5 shadow-sm">
                  <p className="text-[12.5px] font-semibold text-brand-purple mb-2">Modèle de chaises</p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {CHAIR_STYLE_OPTIONS.map((ch) => (
                      <button
                        key={ch.id}
                        onClick={() => { pushHistory(); setDecor((d) => ({ ...d, chairStyle: ch.id })); }}
                        className={`px-3 py-2 rounded-xl border text-left text-[11.5px] font-medium transition-colors ${
                          decor.chairStyle === ch.id
                            ? 'border-brand-turquoise bg-brand-turquoise/10 text-brand-purple font-semibold'
                            : 'border-[rgba(75,68,86,0.1)] bg-[#FAF9F7] text-brand-gray hover:text-brand-purple'
                        }`}
                      >
                        {ch.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fleurs & Centres de table */}
                <div className="bg-white rounded-[16px] border border-[rgba(75,68,86,0.08)] p-3.5 shadow-sm">
                  <p className="text-[12.5px] font-semibold text-brand-purple mb-2">Fleurs & Centres de table</p>
                  <div className="space-y-1.5">
                    {CENTERPIECE_OPTIONS.map((cp) => (
                      <button
                        key={cp.id}
                        onClick={() => { pushHistory(); setDecor((d) => ({ ...d, centerpiece: cp.id })); }}
                        className={`w-full px-3 py-2 rounded-xl border text-left text-[11.5px] font-medium transition-colors ${
                          decor.centerpiece === cp.id
                            ? 'border-brand-turquoise bg-brand-turquoise/10 text-brand-purple font-semibold'
                            : 'border-[rgba(75,68,86,0.1)] bg-[#FAF9F7] text-brand-gray hover:text-brand-purple'
                        }`}
                      >
                        {cp.label}
                      </button>
                    ))}
                  </div>
                  {decor.centerpiece !== 'aucun' && decor.centerpiece !== 'bougeoirs' && (
                    <div className="mt-3 pt-2.5 border-t border-[rgba(75,68,86,0.08)]">
                      <p className="text-[11px] text-brand-gray mb-2">Teinte des fleurs</p>
                      <div className="flex flex-wrap gap-2">
                        {FLOWER_COLORS.map((fc) => (
                          <button
                            key={fc.color}
                            onClick={() => { pushHistory(); setDecor((d) => ({ ...d, flowerColor: fc.color })); }}
                            title={fc.label}
                            className={`w-7 h-7 rounded-full border border-black/15 transition-transform hover:scale-110 ${
                              decor.flowerColor === fc.color ? 'ring-2 ring-offset-2 ring-brand-purple scale-110' : ''
                            }`}
                            style={{ background: fc.color }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Assiettes, Verres & Couverts */}
                <div className="bg-white rounded-[16px] border border-[rgba(75,68,86,0.08)] p-3.5 shadow-sm">
                  <p className="text-[12.5px] font-semibold text-brand-purple mb-2">Assiettes, Verres & Couverts</p>
                  <div className="space-y-1.5">
                    {TABLEWARE_OPTIONS.map((tw) => (
                      <button
                        key={tw.id}
                        onClick={() => { pushHistory(); setDecor((d) => ({ ...d, tableware: tw.id })); }}
                        className={`w-full px-3 py-2 rounded-xl border text-left transition-colors ${
                          decor.tableware === tw.id
                            ? 'border-brand-turquoise bg-brand-turquoise/10'
                            : 'border-[rgba(75,68,86,0.1)] bg-[#FAF9F7] hover:border-brand-turquoise/50'
                        }`}
                      >
                        <p className="text-[11.5px] font-semibold text-brand-purple">{tw.label}</p>
                        <p className="text-[10px] text-brand-gray mt-0.5">{tw.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ==== Onglet Placement : nom d'invité par chaise ==== */}
            {panelTab === 'placement' && (
              <div className="space-y-3">
                {/* datalist : autocomplete sur les noms déjà saisis */}
                <datalist id="guest-names">
                  {guests.map((g) => <option key={g.id} value={g.name} />)}
                </datalist>
                <p className="text-[11.5px] text-brand-gray leading-relaxed px-1">
                  Tapez le nom de chaque invité sur sa chaise. Un nouveau nom crée l'invité ; vider une ligne libère le siège.
                </p>
                {/* Invités non placés : ajout / édition / suppression */}
                <div className="bg-white rounded-[16px] border border-[rgba(75,68,86,0.08)] p-3.5 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[13px] font-semibold text-brand-purple">Invités non placés ({unseatedGuests.length})</p>
                    {unseatedGuests.length > 0 && (
                      <button onClick={runAutoAssign} className="text-[10.5px] font-semibold text-brand-turquoise hover:underline">
                        Placement auto
                      </button>
                    )}
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {unseatedGuests.map((g) => (
                      <div key={g.id} className="flex items-center gap-1.5">
                        <input
                          key={`ug-${g.id}-${g.name}`}
                          defaultValue={g.name}
                          onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== g.name) patchGuest(g.id, { name: v }); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                          className="flex-1 min-w-0 text-[12.5px] border border-transparent bg-[#FAF9F7] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-turquoise/40"
                        />
                        <label className="flex items-center gap-1 min-h-[44px] text-xs text-brand-purple shrink-0">
                          <input type="checkbox" checked={!!g.isChild} onChange={(e) => patchGuest(g.id, { isChild: e.target.checked })} />
                          Enfant
                        </label>
                        <button onClick={() => removeGuest(g.id)} title="Supprimer l'invité"
                          className="w-6 h-6 rounded-full text-red-400 hover:bg-red-50 flex items-center justify-center shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {unseatedGuests.length === 0 && guests.length > 0 && (
                      <p className="text-[11px] text-brand-gray text-center py-1">Tous vos invités sont placés.</p>
                    )}
                  </div>
                  {/* ajouter une ligne invité */}
                  <div className="flex gap-1.5 mt-2">
                    <input value={newGuestName} onChange={(e) => setNewGuestName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addGuest()}
                      placeholder="Nouvel invité"
                      className="flex-1 min-w-0 text-[12.5px] border border-[rgba(75,68,86,0.12)] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-turquoise/40" />
                    <button onClick={addGuest} className="w-7 h-7 rounded-lg bg-brand-turquoise text-white flex items-center justify-center shrink-0">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-3 max-h-[52vh] overflow-y-auto pr-1">
                  {tables.map((t) => {
                    const filled = t.seats.filter((s) => s.guest_id).length;
                    return (
                      <div key={t.id} className="bg-white rounded-[16px] border border-[rgba(75,68,86,0.08)] p-3.5 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          {/* nom de table éditable : clic → tape le nouveau nom */}
                          <input
                            key={`name-${t.id}-${t.name}`}
                            defaultValue={t.name}
                            onBlur={(e) => {
                              const v = e.target.value.trim();
                              if (v && v !== t.name) patchTable(t.id, { name: v });
                            }}
                            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                            className="text-[13px] font-semibold bg-transparent border-b border-dashed border-transparent hover:border-brand-turquoise focus:border-brand-turquoise focus:outline-none max-w-[65%] px-0.5"
                            style={{ color: t.accent }}
                            title="Cliquez pour renommer la table"
                          />
                          <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${filled === t.seatCount ? 'bg-brand-turquoise/10 text-brand-turquoise' : 'bg-[#FAF9F7] text-brand-gray'}`}>
                            {filled}/{t.seatCount}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {t.seats.map((s) => (
                            <div key={s.index} className="flex items-center gap-2">
                              <span className="w-5 text-[10px] text-brand-gray text-right">{s.index + 1}.</span>
                              <input
                                key={`${t.id}-${s.index}-${s.guest_id}`}
                                list="guest-names"
                                defaultValue={s.guest_id ? guestName(s.guest_id) || '' : ''}
                                placeholder={s.kind === 'bebe' ? 'Enfant (chaise bébé)' : 'Nom de l\'invité'}
                                onBlur={(e) => commitSeatName(t.id, s.index, e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                className={`flex-1 min-w-0 text-[12.5px] border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-turquoise/40 ${s.guest_id ? 'border-transparent bg-[#FAF9F7]' : 'border-dashed border-[rgba(75,68,86,0.25)]'}`}
                              />
                              {s.guest_id && (
                                <label className="flex items-center gap-1 min-h-[44px] text-xs text-brand-purple shrink-0">
                                  <input type="checkbox" checked={!!guests.find((g) => g.id === s.guest_id)?.isChild}
                                    onChange={(e) => patchGuest(s.guest_id!, { isChild: e.target.checked })} />
                                  Enfant
                                </label>
                              )}
                              {s.kind !== 'standard' && (
                                <span className="text-[9.5px] font-semibold text-brand-turquoise uppercase">{s.kind}</span>
                              )}
                              {/* libère la place */}
                              <button onClick={() => commitSeatName(t.id, s.index, '')} title="Vider la place"
                                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${s.guest_id ? 'text-red-400 hover:bg-red-50' : 'text-brand-gray/40 hover:bg-[#FAF9F7]'}`}>
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          {/* ajouter une place à la table */}
                          <button
                            onClick={() => { pushHistory(); patchTable(t.id, { seatCount: t.seatCount + 1, seats: resizeSeats(t.seats, t.seatCount + 1) }); }}
                            className="w-full mt-1 text-[11px] font-semibold text-brand-turquoise border border-dashed border-brand-turquoise/40 rounded-lg py-1.5 hover:bg-brand-turquoise/5 transition-colors">
                            + Ajouter une place
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {panelTab === 'composer' && (
            <>
            {/* Ajouter une table */}
            <div className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.08)] p-4 shadow-sm">
              <p className="text-[13px] font-semibold text-brand-purple mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4 text-brand-turquoise" /> Ajouter une table
              </p>
              <div className="grid grid-cols-2 gap-2">
                {SHAPE_CARDS.map(({ shape, label }) => (
                  <button key={shape} onClick={() => addTable(shape)}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-[rgba(75,68,86,0.1)] bg-[#FAF9F7] hover:border-brand-turquoise hover:bg-brand-turquoise/5 p-2.5 transition-colors">
                    <div className={`bg-[#4B4456] ${shape === 'ronde' ? 'w-8 h-8 rounded-full' : shape === 'ovale' ? 'w-11 h-7 rounded-full' : shape === 'carree' ? 'w-8 h-8 rounded-[5px]' : 'w-11 h-6 rounded-[5px]'}`} />
                    <span className="text-[11.5px] font-medium text-brand-purple">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Ajouter un objet de salle */}
            <div className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.08)] p-4 shadow-sm">
              <p className="text-[13px] font-semibold text-brand-purple mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4 text-brand-turquoise" /> Ajouter un élément de salle
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(OBJECT_DEFS) as SceneObjectKind[]).map((k) => (
                  <button key={k} onClick={() => addObject(k)}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-[#FAF9F7] border border-[rgba(75,68,86,0.1)] text-brand-purple hover:border-brand-turquoise transition-colors">
                    + {OBJECT_DEFS[k].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Panneau contextuel : siège ciblé / table / objet */}
            {assignTarget && targetSeat && (
              <div className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.08)] p-4 shadow-sm">
                <p className="text-[13px] font-semibold text-brand-purple mb-2.5">
                  Siège {assignTarget.seatIndex + 1}
                  {targetSeat.guest_id ? ` — ${guestMap[targetSeat.guest_id] || 'Occupé'}` : ' — libre'}
                </p>
                {/* invités à placer */}
                <div className="max-h-32 overflow-y-auto space-y-1 mb-3">
                  {unseatedGuests.length === 0 && (
                    <p className="text-[11.5px] text-brand-gray">Tous vos invités sont placés.</p>
                  )}
                  {unseatedGuests.map((g) => (
                    <button key={g.id} onClick={() => assignGuest(g.id)}
                      className="w-full text-left text-[12.5px] px-2.5 py-1.5 rounded-md bg-[#FAF9F7] hover:bg-brand-turquoise/10 border border-[rgba(75,68,86,0.08)] text-brand-purple transition-colors">
                      {g.name}
                    </button>
                  ))}
                </div>
                {targetSeat.guest_id && (
                  <button onClick={() => assignGuest(null)}
                    className="w-full mb-3 text-[12px] font-semibold text-red-500 border border-red-200 rounded-lg py-1.5 hover:bg-red-50 transition-colors">
                    Libérer le siège
                  </button>
                )}
                {/* type de siège */}
                <p className="text-[11px] text-brand-gray mb-1.5">Type de siège</p>
                <div className="flex flex-wrap gap-1.5">
                  {SEAT_KINDS.map((k) => (
                    <button key={k.kind} onClick={() => setSeatKind(k.kind)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${targetSeat.kind === k.kind ? 'bg-brand-turquoise text-white' : 'bg-[#FAF9F7] border border-[rgba(75,68,86,0.1)] text-brand-purple'}`}>
                      {k.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selected && !assignTarget && (
              <div className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.08)] p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-[13px] font-semibold text-brand-purple">{selected.name}</p>
                  <div className="flex gap-1.5">
                    {/* duplique la table (sans les invités) */}
                    <button onClick={() => {
                      pushHistory();
                      const copy: PlanTable = { ...selected, id: `t${Date.now()}`, name: `${selected.name} (copie)`, x: Math.min(selected.x + 2.5, room.width / 2 - 1.5), seats: makeSeats(selected.seatCount) };
                      setTables((p) => [...p, copy]);
                      setSelectedId(copy.id);
                    }} className="w-7 h-7 rounded-full bg-brand-turquoise/10 text-brand-turquoise flex items-center justify-center" title="Dupliquer">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => removeTable(selected.id)} className="w-7 h-7 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <input value={selected.name} onChange={(e) => patchTable(selected.id, { name: e.target.value })}
                  className="w-full text-sm border border-[rgba(75,68,86,0.12)] rounded-lg px-3 py-1.5 mb-2.5 focus:outline-none focus:ring-2 focus:ring-brand-turquoise/40" />
                <p className="text-[11px] text-brand-gray mb-1.5">Places</p>
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {[4, 6, 8, 10, 12].map((n) => (
                    <button key={n} onClick={() => { pushHistory(); patchTable(selected.id, { seatCount: n, seats: resizeSeats(selected.seats, n) }); }}
                      className={`w-9 h-8 rounded-lg text-[12px] font-semibold transition-colors ${selected.seatCount === n ? 'bg-brand-turquoise text-white' : 'bg-[#FAF9F7] border border-[rgba(75,68,86,0.1)] text-brand-purple'}`}>
                      {n}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-brand-gray mb-1.5">Rotation ({Math.round(selected.rotation)}°)</p>
                <input type="range" min={0} max={360} value={selected.rotation}
                  onChange={(e) => rotateTable(selected.id, Number(e.target.value))}
                  className="w-full mb-2.5 accent-[#88b7b5]" />
                <p className="text-[11px] text-brand-gray mb-1.5">Couleur</p>
                <div className="flex gap-2">
                  {ACCENTS.map((a) => (
                    <button key={a.id} onClick={() => patchTable(selected.id, { accent: a.color })} title={a.label}
                      className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${selected.accent === a.color ? 'ring-2 ring-offset-2 ring-brand-purple scale-110' : ''}`}
                      style={{ background: a.color }} />
                  ))}
                </div>
              </div>
            )}

            {selectedObject && !assignTarget && (
              <div className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.08)] p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-[13px] font-semibold text-brand-purple">{selectedObject.label}</p>
                  <button onClick={() => removeObject(selectedObject.id)} className="w-7 h-7 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[11px] text-brand-gray mb-1.5">Rotation ({Math.round(selectedObject.rotation)}°)</p>
                <input type="range" min={0} max={360} value={selectedObject.rotation}
                  onChange={(e) => rotateObject(selectedObject.id, Number(e.target.value))}
                  className="w-full accent-[#88b7b5]" />
              </div>
            )}
            </>
            )}
          </div>
        </div>
      </div>

      {/* Réinitialisation : choix garder ou supprimer les invités */}
      {resetOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-brand-purple/50 backdrop-blur-sm">
          <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-brand-purple mb-1">Tout effacer ?</h3>
            <p className="text-[13px] text-brand-gray mb-5">
              Choisis ce que tu conserves. Les invités gardés passeront dans « non placés » pour être replacés ensuite.
            </p>
            <div className="space-y-2.5">
              <button onClick={() => resetPlan(true)}
                className="w-full text-left px-4 py-3 rounded-xl border border-[rgba(75,68,86,0.12)] hover:border-brand-turquoise hover:bg-brand-turquoise/5 transition-colors">
                <p className="text-[13.5px] font-semibold text-brand-purple">Vider la salle, garder les invités</p>
                <p className="text-[11.5px] text-brand-gray">Tables et objets supprimés · {guests.length} invité{guests.length > 1 ? 's' : ''} conservé{guests.length > 1 ? 's' : ''}</p>
              </button>
              <button onClick={() => resetPlan(false)}
                className="w-full text-left px-4 py-3 rounded-xl border border-red-200 hover:bg-red-50 transition-colors">
                <p className="text-[13.5px] font-semibold text-red-600">Tout supprimer</p>
                <p className="text-[11.5px] text-red-400">Tables, objets ET invités effacés</p>
              </button>
              <button onClick={() => setResetOpen(false)}
                className="w-full text-center text-[12.5px] font-semibold text-brand-gray hover:text-brand-purple py-1.5">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assistant de création : génère salle + tables + objets */}
      {wizardOpen && (
        <SetupWizard
          onGenerate={applyGenerated}
          onClose={() => setWizardOpen(false)}
          isEdit={!!planId || tables.length > 0}
        />
      )}
    </ClientDashboardLayout>
  );
}
