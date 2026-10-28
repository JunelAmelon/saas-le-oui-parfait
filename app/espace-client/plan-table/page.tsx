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
  Undo2, Redo2, LayoutGrid, Armchair, Check, X,
} from 'lucide-react';
import type {
  PlanTable, PlanGuest, PlanSeat, SceneObject, SceneObjectKind,
  TableShape, SeatKind, RoomConfig, TablePlanDoc, PlanConstraint,
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

/** Emplacements libres par défaut quand on ajoute une table. */
const SLOTS: [number, number][] = [
  [0, -4.5], [-4.4, -1.8], [4.4, -1.8], [-4.4, 1.6], [4.4, 1.6], [0, 1.8],
];

/** Snap de déplacement (m). */
const SNAP = 0.4;
const clampRoom = (v: number, half: number) => Math.max(-half + 1.2, Math.min(half - 1.2, Math.round(v / SNAP) * SNAP));
const makeSeats = (count: number): PlanSeat[] =>
  Array.from({ length: count }, (_, i) => ({ index: i, guest_id: null, kind: 'standard' as SeatKind }));

const resizeSeats = (seats: PlanSeat[], count: number): PlanSeat[] => {
  const next = seats.slice(0, count);
  while (next.length < count) next.push({ index: next.length, guest_id: null, kind: 'standard' });
  return next.map((s, i) => ({ ...s, index: i }));
};

/* ============================ Vue 2D (dessus) ============================ */

function TopDownView({
  tables, objects, room, selectedId, onSelect, onMoveTable, onMoveObject,
}: {
  tables: PlanTable[]; objects: SceneObject[]; room: RoomConfig;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMoveTable: (id: string, x: number, z: number) => void;
  onMoveObject: (id: string, x: number, z: number) => void;
}) {
  // Conversion mètres → px SVG : échelle fixe (pas de rétrécissement),
  // le conteneur scrolle si le plan est grand.
  const SCALE = 55;
  // Bornes réelles : la salle + tous les éléments (avec leur encombrement).
  let minX = -room.width / 2;
  let maxX = room.width / 2;
  let minZ = -room.length / 2;
  let maxZ = room.length / 2;
  for (const t of tables) {
    const r = TABLE_SHAPES[t.shape].seatDist + 0.6;
    minX = Math.min(minX, t.x - r); maxX = Math.max(maxX, t.x + r);
    minZ = Math.min(minZ, t.z - r); maxZ = Math.max(maxZ, t.z + r);
  }
  for (const o of objects) {
    const d = OBJECT_DEFS[o.kind];
    const r = Math.max(d.w, d.d) / 2 + 0.4;
    minX = Math.min(minX, o.x - r); maxX = Math.max(maxX, o.x + r);
    minZ = Math.min(minZ, o.z - r); maxZ = Math.max(maxZ, o.z + r);
  }
  const pad = 1.2; // marge autour des bornes (m)
  const originX = minX - pad;
  const originZ = minZ - pad;
  const spanX = maxX - minX + pad * 2;
  const spanZ = maxZ - minZ + pad * 2;
  const W = spanX * SCALE;
  const H = spanZ * SCALE;
  const px = (x: number) => (x - originX) * SCALE;
  const pz = (z: number) => (z - originZ) * SCALE;

  const drag = (e: React.PointerEvent, id: string, isTable: boolean) => {
    e.preventDefault();
    const svg = (e.currentTarget as SVGElement).closest('svg')!;
    const pt = svg.createSVGPoint();
    const move = (ev: PointerEvent) => {
      pt.x = ev.clientX; pt.y = ev.clientY;
      const m = pt.matrixTransform(svg.getScreenCTM()!.inverse());
      const x = m.x / SCALE + originX;
      const z = m.y / SCALE + originZ;
      if (isTable) onMoveTable(id, x, z); else onMoveObject(id, x, z);
    };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const [zoom, setZoom] = useState(1);
  const [fit, setFit] = useState(true);
  // Zoom : molette (ctrl ou simple), boutons +/−, « Ajuster » = tout voir.
  const applyZoom = (dir: number) => {
    setFit(false);
    setZoom((z) => Math.min(2.5, Math.max(0.25, z * (dir > 0 ? 1.2 : 1 / 1.2))));
  };

  return (
    <div className="relative w-full h-full">
      {/* contrôles zoom */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-white/90 backdrop-blur rounded-full shadow-sm border border-[rgba(75,68,86,0.1)] p-1">
        <button onClick={() => applyZoom(-1)} title="Dézoomer"
          className="w-7 h-7 rounded-full text-brand-purple font-bold hover:bg-[#FAF9F7] flex items-center justify-center">−</button>
        <span className="text-[10.5px] font-semibold text-brand-gray w-9 text-center">{Math.round(zoom * 100)}%</span>
        <button onClick={() => applyZoom(1)} title="Zoomer"
          className="w-7 h-7 rounded-full text-brand-purple font-bold hover:bg-[#FAF9F7] flex items-center justify-center">+</button>
        <button onClick={() => { setFit(true); setZoom(1); }} title="Tout voir"
          className="px-2.5 h-7 rounded-full text-[10.5px] font-semibold text-brand-purple hover:bg-[#FAF9F7]">
          Ajuster
        </button>
      </div>
      <div
        className="w-full h-full overflow-auto flex items-start justify-center p-3"
        onWheel={(e) => {
          if (e.ctrlKey || Math.abs(e.deltaY) > 0) {
            e.preventDefault();
            applyZoom(e.deltaY < 0 ? 1 : -1);
          }
        }}
      >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={fit ? '100%' : W * zoom}
        height={fit ? undefined : H * zoom}
        className="max-w-none shrink-0"
        preserveAspectRatio="xMidYMin meet"
      >
      {/* salle (rectangle aux dimensions réelles, centré dans le cadre) */}
      <rect x={px(-room.width / 2)} y={pz(-room.length / 2)} width={room.width * SCALE} height={room.length * SCALE}
        fill="#f2eadf" stroke="#c9a96e" strokeWidth={2.5} rx={10} />
      {/* objets */}
      {objects.map((o) => {
        const d = OBJECT_DEFS[o.kind];
        return (
          <g key={o.id} transform={`translate(${px(o.x)},${pz(o.z)}) rotate(${o.rotation})`}
            onPointerDown={(e) => { onSelect(o.id); drag(e, o.id, false); }} className="cursor-grab">
            <rect x={-d.w * SCALE / 2} y={-d.d * SCALE / 2} width={d.w * SCALE} height={d.d * SCALE}
              fill={d.color} opacity={0.85} rx={6}
              stroke={selectedId === o.id ? '#88b7b5' : 'transparent'} strokeWidth={3} />
            <text textAnchor="middle" dy={3} fontSize={9} fill="#fff" fontWeight={600}>{o.label}</text>
          </g>
        );
      })}
      {/* tables + sièges (positions réelles du registry par forme) */}
      {tables.map((t) => {
        const def = TABLE_SHAPES[t.shape];
        const seatPos = def.seats(t.seatCount);
        const shapeEl =
          t.shape === 'ronde' ? <circle r={1.1 * SCALE} fill="#fff" /> :
          t.shape === 'ovale' ? <ellipse rx={1.5 * SCALE} ry={0.78 * SCALE} fill="#fff" /> :
          t.shape === 'carree' ? <rect x={-0.78 * SCALE} y={-0.78 * SCALE} width={1.56 * SCALE} height={1.56 * SCALE} rx={6} fill="#fff" /> :
          <rect x={-1.38 * SCALE} y={-0.6 * SCALE} width={2.76 * SCALE} height={1.2 * SCALE} rx={6} fill="#fff" />;
        return (
          <g key={t.id} transform={`translate(${px(t.x)},${pz(t.z)}) rotate(${t.rotation})`}
            onPointerDown={(e) => { onSelect(t.id); drag(e, t.id, true); }} className="cursor-grab">
            {/* sièges aux positions exactes de la forme */}
            {t.seats.map((s, i) => (
              <circle key={i} cx={seatPos[i].x * 1.05 * SCALE} cy={seatPos[i].z * 1.05 * SCALE} r={6}
                fill={s.guest_id ? t.accent : '#fff'} stroke="#9C97A3" strokeWidth={1} />
            ))}
            {shapeEl}
            <circle cx={0} cy={0} r={1.1 * SCALE} fill="transparent"
              stroke={selectedId === t.id ? '#88b7b5' : t.accent} strokeWidth={selectedId === t.id ? 3 : 1.5} strokeDasharray={t.shape === 'ronde' || t.shape === 'ovale' ? '0' : '0 0'} />
            <text textAnchor="middle" dy={4} fontSize={11} fill="#4B4456" fontWeight={600}>{t.name}</text>
          </g>
        );
      })}
      </svg>
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
    setSelectedId(null);
    setAssignTarget(null);
    if (!keepGuests) setGuests([]);
    setResetOpen(false);
    toast.success(keepGuests ? 'Salle réinitialisée : invités conservés' : 'Plan entièrement effacé');
  };
  const [wizardOpen, setWizardOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<'composer' | 'placement'>('composer');

  // ---- Undo / Redo : pile d'états du plan ----
  type PlanState = { tables: PlanTable[]; objects: SceneObject[]; guests: PlanGuest[]; room: RoomConfig };
  const [history, setHistory] = useState<PlanState[]>([]);
  const [future, setFuture] = useState<PlanState[]>([]);
  // Snapshot avant chaque mutation importante (drag terminé, ajout, suppression).
  const pushHistory = useCallback(() => {
    setHistory((h) => [...h.slice(-30), { tables, objects, guests, room }]);
    setFuture([]);
  }, [tables, objects, guests, room]);

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
    setFuture((f) => [{ tables, objects, guests, room }, ...f]);
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setTables(prev.tables); setObjects(prev.objects); setGuests(prev.guests); setRoom(prev.room);
  };
  const redo = () => {
    if (!future.length) return;
    setHistory((h) => [...h, { tables, objects, guests, room }]);
    const next = future[0];
    setFuture((f) => f.slice(1));
    setTables(next.tables); setObjects(next.objects); setGuests(next.guests); setRoom(next.room);
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
          if (Array.isArray(d.tables)) setTables(d.tables);
          if (Array.isArray(d.objects)) setObjects(d.objects);
          if (Array.isArray(d.guests)) setGuests(d.guests);
        }
        // Aucun plan OU plan vide → l'assistant s'ouvre pour aider.
        if (!docs[0] || !(docs[0].tables || []).length) setWizardOpen(true);
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
        room, tables, objects, guests,
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
  // Déplace une table : clamp salle, snap magnétique sur les autres tables,
  // et refus de superposition (collision grossière par rayon de forme).
  const moveTable = (id: string, x: number, z: number) => {
    const self = tables.find((t) => t.id === id);
    const r = self ? ({ ronde: 1.9, ovale: 2.2, carree: 1.5, rectangle: 2.0 } as const)[self.shape] : 1.8;
    let nx = clampRoom(x, room.width / 2);
    let nz = clampRoom(z, room.length / 2);
    // snap : colle à l'axe d'une table voisine si proche (<0.5m)
    for (const t of tables) {
      if (t.id === id) continue;
      if (Math.abs(t.x - nx) < 0.5) nx = t.x;
      if (Math.abs(t.z - nz) < 0.5) nz = t.z;
    }
    // collision : refuse le drop s'il chevauche une autre table
    const rr = (t: PlanTable) => ({ ronde: 1.9, ovale: 2.2, carree: 1.5, rectangle: 2.0 } as const)[t.shape];
    const clash = tables.some((t) => t.id !== id && Math.hypot(t.x - nx, t.z - nz) < (r + rr(t)) * 0.62);
    if (!clash && self && (self.x !== nx || self.z !== nz)) {
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

  const assignGuest = (guestId: string | null) => {
    if (!assignTarget) return;
    pushHistory();
    const { tableId, seatIndex } = assignTarget;
    setTables((prev) =>
      prev.map((t) => {
        // Retire l'invité de tout autre siège qu'il occupait.
        const cleared = { ...t, seats: t.seats.map((s) => (guestId && s.guest_id === guestId ? { ...s, guest_id: null } : s)) };
        if (t.id !== tableId) return cleared;
        return { ...cleared, seats: cleared.seats.map((s, i) => (i === seatIndex ? { ...s, guest_id: guestId } : s)) };
      })
    );
    setAssignTarget(null);
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
          <div ref={containerRef} className="relative rounded-[22px] overflow-hidden border border-[rgba(75,68,86,0.08)] bg-[#f2eadf] shadow-xl h-[62vh] min-h-[440px]">
            {view === '3d' ? (
              <StaticHallScene
                tables={tables}
                objects={objects}
                selectedId={selectedId}
                assignTarget={assignTarget}
                guestName={guestName}
                onSelectTable={setSelectedId}
                onSeatClick={handleSeatClick}
                onMoveTable={moveTable}
                onMoveObject={moveObject}
                walkMode={walkMode}
                room={room}
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
                tables={tables} objects={objects} room={room}
                selectedId={selectedId} onSelect={setSelectedId}
                onMoveTable={moveTable} onMoveObject={moveObject}
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

          {/* Panneau latéral : onglets Composer / Placement */}
          <div className="space-y-4">
            <div className="flex rounded-full bg-white border border-[rgba(75,68,86,0.1)] p-1 shadow-sm">
              {(['composer', 'placement'] as const).map((tab) => (
                <button key={tab} onClick={() => setPanelTab(tab)}
                  className={`flex-1 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${panelTab === tab ? 'bg-brand-purple text-white' : 'text-brand-gray'}`}>
                  {tab === 'composer' ? 'Composer la salle' : 'Placer les invités'}
                </button>
              ))}
            </div>

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
                <p className="text-[11px] text-brand-gray mb-1.5">Rotation</p>
                <input type="range" min={0} max={90} value={selected.rotation}
                  onChange={(e) => patchTable(selected.id, { rotation: Number(e.target.value) })}
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
                <p className="text-[11px] text-brand-gray mb-1.5">Rotation</p>
                <input type="range" min={0} max={90} value={selectedObject.rotation}
                  onChange={(e) => setObjects((p) => p.map((o) => (o.id === selectedObject.id ? { ...o, rotation: Number(e.target.value) } : o)))}
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
