'use client';

/**
 * Démo interactive — salle de réception 3D (react-three-fiber).
 * Textures 100% procédurales (canvas) : aucun asset distant.
 * Registry de formes de tables (SOLID/Open-Closed) : ajouter une forme
 * = une entrée dans TABLE_SHAPES.
 */

import { Suspense, createContext, useContext, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Html, Float, PointerLockControls } from '@react-three/drei';
import { useEffect } from 'react';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { PlanTable, SceneObject, SceneObjectKind, SeatKind, TableShape } from '@/lib/table-plan/types';

/* ============================ Palette ============================ */
const C = {
  floor: '#b98d63',
  floorDark: '#a67c56',
  wall: '#cfc9c2',
  trim: '#efe9df',
  cloth: '#f5f1ea',
  chairWood: '#8a6f4d',
  chairSeat: '#ece4d6',
  turquoise: '#88b7b5',
  purple: '#4b4456',
  rose: '#e8b4b8',
  sage: '#9bb39b',
  gold: '#c9a96e',
};

export const ACCENTS = [
  { id: 'turquoise', color: C.turquoise, label: 'Turquoise' },
  { id: 'rose', color: C.rose, label: 'Rose' },
  { id: 'sage', color: C.sage, label: 'Sauge' },
  { id: 'gold', color: C.gold, label: 'Doré' },
  { id: 'purple', color: C.purple, label: 'Prune' },
];

export type Mood = 'jour' | 'soiree';
// Types metier partages : voir lib/table-plan/types.ts
export type { PlanTable } from '@/lib/table-plan/types';
export type { TableShape } from '@/lib/table-plan/types';

/* ==================== Textures procédurales ==================== */

/* ============================ Pièces ============================ */

import { DecorModel } from './DecorModel';

/* ---------- Lustre en cristal suspendu ---------- */
function Chandelier({ x, z }: { x: number; z: number }) {
  // GLTF si /models/table-plan/chandelier.glb présent, sinon procédural.
  return (
    <DecorModel
      decor="chandelier"
      position={[x, 4.6, z]}
      fallback={
    <group>
      {/* tige */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 1, 8]} />
        <meshStandardMaterial color="#8a8a92" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* couronne */}
      <mesh position={[0, -0.05, 0]} castShadow>
        <torusGeometry args={[0.42, 0.035, 12, 40]} />
        <meshStandardMaterial color="#d4b678" metalness={0.75} roughness={0.25} />
      </mesh>
      {/* gouttes de cristal */}
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.4, -0.22, Math.sin(a) * 0.4]}>
            <octahedronGeometry args={[0.035, 0]} />
            <meshPhysicalMaterial color="#ffffff" roughness={0.05} metalness={0.1} transparent opacity={0.8} />
          </mesh>
        );
      })}
      <mesh position={[0, -0.32, 0]}>
        <octahedronGeometry args={[0.06, 0]} />
        <meshPhysicalMaterial color="#ffffff" roughness={0.05} transparent opacity={0.85} />
      </mesh>
      <pointLight position={[0, -0.3, 0]} intensity={6} color="#ffe9c4" distance={6} />
    </group>
      }
    />
  );
}

function Room({ mood, room }: { mood: Mood; room: { width: number; length: number } }) {
  const W = room.width;
  const L = room.length;
  const HW = W / 2;
  const HL = L / 2;
  // Sol : grandes dalles (joints tous les ~1.6m)
  const jointX = Math.max(1, Math.round(W / 1.6));
  const jointZ = Math.max(1, Math.round(L / 1.6));
  return (
    <group>
      {/* Sol : dalles blanches brillantes */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W + 1, L + 1]} />
        <meshStandardMaterial color="#f4f2ee" roughness={0.25} metalness={0.05} />
      </mesh>
      {/* joints de dalles */}
      {Array.from({ length: jointX - 1 }, (_, i) => (
        <mesh key={`gx${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[-HW + ((i + 1) * W) / jointX, 0.005, 0]}>
          <planeGeometry args={[0.02, L]} />
          <meshStandardMaterial color="#dcd8d2" roughness={0.6} />
        </mesh>
      ))}
      {Array.from({ length: jointZ - 1 }, (_, i) => (
        <mesh key={`gz${i}`} rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[0, 0.005, -HL + ((i + 1) * L) / jointZ]}>
          <planeGeometry args={[0.02, W]} />
          <meshStandardMaterial color="#dcd8d2" roughness={0.6} />
        </mesh>
      ))}
      {/* Murs : faces tournées vers l'intérieur → invisibles en orbite,
          visibles en balade (même principe que le plafond) */}
      <mesh position={[0, 2.8, -HL]} receiveShadow>
        <planeGeometry args={[W, 5.6]} />
        <meshStandardMaterial color="#f3efe9" roughness={0.9} />
      </mesh>
      <mesh position={[-HW, 2.8, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[L, 5.6]} />
        <meshStandardMaterial color="#f3efe9" roughness={0.9} />
      </mesh>
      <mesh position={[HW, 2.8, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[L, 5.6]} />
        <meshStandardMaterial color="#f3efe9" roughness={0.9} />
      </mesh>
      {/* Plafond : face vers le bas uniquement */}
      <mesh position={[0, 5.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, L]} />
        <meshStandardMaterial color="#efe9e0" roughness={0.9} />
      </mesh>
      {/* Poutres apparentes sombres */}
      {[-W / 4, 0, W / 4].map((x) => (
        <mesh key={`beam${x}`} position={[x, 5.35, 0]} castShadow>
          <boxGeometry args={[0.3, 0.35, L + 1]} />
          <meshStandardMaterial color="#4a4038" roughness={0.7} />
        </mesh>
      ))}
      {/* Lustres cristal, espacés selon la salle */}
      <Chandelier x={-W / 5} z={-L / 5} />
      <Chandelier x={W / 5} z={-L / 5} />
      <Chandelier x={0} z={L / 6} />
      {/* Plinthes */}
      <mesh position={[0, 0.14, -HL + 0.16]}>
        <boxGeometry args={[W, 0.28, 0.04]} />
        <meshStandardMaterial color={C.trim} roughness={0.8} />
      </mesh>
      <mesh position={[-HW + 0.16, 0.14, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[L, 0.28, 0.04]} />
        <meshStandardMaterial color={C.trim} roughness={0.8} />
      </mesh>
      <mesh position={[HW - 0.16, 0.14, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <boxGeometry args={[L, 0.28, 0.04]} />
        <meshStandardMaterial color={C.trim} roughness={0.8} />
      </mesh>
      {/* échelle : étiquettes de cotes sur le sol */}
      <Html zIndexRange={[60, 0]} center position={[HW - 1.2, 0.06, HL - 0.5]} rotation={[Math.PI / 2, 0, 0]} className="pointer-events-none select-none">
        <span className="text-[10px] text-[#9C97A3] font-semibold bg-white/70 px-1.5 rounded">{W} m</span>
      </Html>
      <Html zIndexRange={[60, 0]} center position={[-HW + 0.5, 0.06, HL - 1.2]} rotation={[Math.PI / 2, 0, Math.PI / 2]} className="pointer-events-none select-none">
        <span className="text-[10px] text-[#9C97A3] font-semibold bg-white/70 px-1.5 rounded">{L} m</span>
      </Html>
    </group>
  );
}

/* ---------- Couvert ---------- */
function PlaceSetting({ x, z, angle, accent }: { x: number; z: number; angle: number; accent: string }) {
  return (
    <group position={[x, 0, z]} rotation={[0, angle, 0]}>
      {/* assiette */}
      <mesh position={[0, 0.82, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.11, 0.018, 32]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.833, 0]}>
        <cylinderGeometry args={[0.105, 0.105, 0.004, 32]} />
        <meshStandardMaterial color="#fdfcf9" roughness={0.35} />
      </mesh>
      {/* serviette */}
      <mesh position={[0, 0.845, 0]} rotation={[0, 0.6, 0]}>
        <boxGeometry args={[0.07, 0.012, 0.07]} />
        <meshStandardMaterial color={accent} roughness={0.8} />
      </mesh>
      {/* verre */}
      <mesh position={[0.2, 0.87, -0.08]} castShadow>
        <cylinderGeometry args={[0.032, 0.026, 0.11, 16, 1, true]} />
        <meshPhysicalMaterial color="#cfe3e8" roughness={0.05} transmission={0.7} thickness={0.02} transparent opacity={0.55} />
      </mesh>
      {/* couverts */}
      {[-0.18, 0.18].map((cx, i) => (
        <mesh key={i} position={[cx, 0.84, -0.02]} castShadow>
          <boxGeometry args={[0.012, 0.008, 0.16]} />
          <meshStandardMaterial color="#c8c8ce" metalness={0.85} roughness={0.25} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------- Fleur : cœur + pétales ellipsoïdes + tige ---------- */
function Flower({
  position,
  color,
  size = 1,
  tilt = 0.4,
}: {
  position: [number, number, number];
  color: string;
  size?: number;
  tilt?: number;
}) {
  return (
    <group position={position} scale={size} rotation={[tilt, 0, 0]}>
      {/* tige */}
      <mesh position={[0, -0.14, 0]} castShadow>
        <cylinderGeometry args={[0.008, 0.008, 0.26, 6]} />
        <meshStandardMaterial color={C.sage} roughness={0.9} />
      </mesh>
      {/* cœur */}
      <mesh castShadow>
        <sphereGeometry args={[0.035, 12, 12]} />
        <meshStandardMaterial color="#f6e6b8" roughness={0.6} />
      </mesh>
      {/* pétales : 8 ellipsoïdes aplatis autour du cœur */}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.05, 0, Math.sin(a) * 0.05]}
            rotation={[Math.PI / 2.4, -a, 0]}
            castShadow
          >
            <sphereGeometry args={[0.045, 10, 8]} />
            <meshStandardMaterial color={color} roughness={0.75} />
          </mesh>
        );
      })}
    </group>
  );
}

/* ---------- Centre de table : candelabra doré + bouquet vraies fleurs ---------- */
function Centerpiece({ accent, x = 0, z = 0 }: { accent: string; x?: number; z?: number }) {
  const FLOWERS: { pos: [number, number, number]; col: string; s: number; tilt: number }[] = [
    { pos: [0, 1.5, 0], col: accent, s: 1.3, tilt: 0.15 },
    { pos: [0.14, 1.44, 0.06], col: C.rose, s: 1, tilt: 0.5 },
    { pos: [-0.13, 1.46, -0.05], col: '#fff', s: 1.05, tilt: 0.4 },
    { pos: [0.06, 1.43, -0.13], col: accent, s: 0.9, tilt: 0.55 },
    { pos: [-0.06, 1.45, 0.12], col: '#f6d9e0', s: 0.95, tilt: 0.5 },
    { pos: [0.11, 1.5, -0.09], col: C.rose, s: 0.8, tilt: 0.35 },
    { pos: [-0.11, 1.49, 0.08], col: accent, s: 0.85, tilt: 0.45 },
  ];
  return (
    <group position={[x, 0, z]}>
      {/* pied trompette doré : base → tige fine → coupe */}
      <mesh position={[0, 0.82, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.12, 0.04, 20]} />
        <meshStandardMaterial color={C.gold} metalness={0.8} roughness={0.25} />
      </mesh>
      <mesh position={[0, 1.05, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.05, 0.44, 12]} />
        <meshStandardMaterial color={C.gold} metalness={0.8} roughness={0.25} />
      </mesh>
      <mesh position={[0, 1.28, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.05, 0.09, 20]} />
        <meshStandardMaterial color={C.gold} metalness={0.8} roughness={0.25} />
      </mesh>
      {/* bouquet : GLTF si flower.glb, sinon fleurs à pétales procédurales.
          NB : la position est portée par DecorModel — le fallback doit être à [0,0,0]. */}
      {FLOWERS.map((f, i) => (
        <DecorModel key={i} decor="flower" position={f.pos}
          fallback={<Flower position={[0, 0, 0]} color={f.col} size={f.s} tilt={f.tilt} />} />
      ))}
      {/* feuilles vertes tombantes */}
      {[0.4, 1.6, 2.8, 4.0, 5.2].map((a, i) => (
        <mesh key={i} position={[Math.cos(a) * 0.19, 1.28, Math.sin(a) * 0.19]} rotation={[0.85, a, 0]} castShadow>
          <boxGeometry args={[0.022, 0.24, 0.006]} />
          <meshStandardMaterial color="#5f8a5f" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------- Chaise (kind : standard / bebe / pmr / vip) ---------- */
// Base Napoléon blanche commune (siège + dossier à barreaux + pieds).
function Chair({ accent, kind }: { accent: string; kind: SeatKind }) {
  if (kind === 'bebe') {
    return (
      <group>
        <mesh position={[0, 0.5, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.18, 0.05, 20]} />
          <meshStandardMaterial color={C.chairSeat} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.68, -0.17]} castShadow>
          <boxGeometry args={[0.32, 0.34, 0.035]} />
          <meshStandardMaterial color={accent} roughness={0.6} />
        </mesh>
        {[[-0.13,-0.13],[0.13,-0.13],[-0.13,0.13],[0.13,0.13]].map(([lx,lz],i)=>(
          <mesh key={i} position={[lx,0.24,lz]} castShadow>
            <cylinderGeometry args={[0.02,0.02,0.48,8]} />
            <meshStandardMaterial color={C.chairWood} roughness={0.5} />
          </mesh>
        ))}
      </group>
    );
  }
  if (kind === 'pmr') {
    return (
      <group>
        <mesh position={[0, 0.4, 0]} castShadow>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshStandardMaterial color={C.chairSeat} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.72, -0.22]} castShadow>
          <boxGeometry args={[0.5, 0.45, 0.06]} />
          <meshStandardMaterial color={accent} roughness={0.6} />
        </mesh>
      </group>
    );
  }
  const frame = kind === 'vip' ? C.gold : '#f0ece4';
  const napoleon = (
    <group>
      <mesh position={[0, 0.45, 0]} castShadow>
        <cylinderGeometry args={[0.24, 0.2, 0.06, 24]} />
        <meshStandardMaterial color='#faf6ef' roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.92, -0.2]} castShadow>
        <boxGeometry args={[0.42, 0.05, 0.045]} />
        <meshStandardMaterial color={frame} roughness={0.5} />
      </mesh>
      {[-0.16,-0.05,0.05,0.16].map((bx,i)=>(
        <mesh key={i} position={[bx,0.68,-0.2]} castShadow>
          <cylinderGeometry args={[0.015,0.015,0.46,8]} />
          <meshStandardMaterial color={frame} roughness={0.5} />
        </mesh>
      ))}
      {[[-0.16,-0.16],[0.16,-0.16],[-0.16,0.16],[0.16,0.16]].map(([lx,lz],i)=>(
        <mesh key={i} position={[lx,0.22,lz]} castShadow>
          <cylinderGeometry args={[0.022,0.018,0.44,8]} />
          <meshStandardMaterial color={frame} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
  return napoleon;
}


/* ---------- Drag & drop au sol (raycast sur plan y=0) ---------- */
/**
 * Retourne un handler pointerDown : le pointeur est capturé, chaque
 * pointermove projette le rayon caméra→sol et appelle onMove(x, z).
 * pointerup termine le drag. Utilisé par tables ET objets de salle.
 */
const DragMode = createContext({ allowed: true, touchId: null as string | null });

function useFloorDrag(onMove: (x: number, z: number) => void, onEnd: () => void, onStart: () => void, id: string, origin: { x: number; z: number }) {
  const { gl, camera, controls } = useThree();
  const mode = useContext(DragMode);
  const cleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanup.current?.(), []);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const point = useMemo(() => new THREE.Vector3(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);

  return (e: any) => {
    // Bloque la propagation : ne déclenche ni sélection ni orbite.
    e.stopPropagation();
    if (!mode.allowed || (e.pointerType !== 'mouse' && mode.touchId !== id) || e.isPrimary === false) return;
    cleanup.current?.();
    const control = controls as unknown as { enabled: boolean } | undefined;
    const wasEnabled = control?.enabled ?? false;
    if (control) control.enabled = false;
    onStart();
    const pointerId = e.pointerId;
    const target = e.target;
    target.setPointerCapture?.(pointerId);
    const project = (clientX: number, clientY: number) => {
      const rect = gl.domElement.getBoundingClientRect();
      ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      return raycaster.ray.intersectPlane(plane, point);
    };
    const start = project(e.clientX, e.clientY);
    const offsetX = start ? origin.x - start.x : 0;
    const offsetZ = start ? origin.z - start.z : 0;
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      const rect = gl.domElement.getBoundingClientRect();
      ndc.set(
        ((ev.clientX - rect.left) / rect.width) * 2 - 1,
        -((ev.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(ndc, camera);
      // Intersection du rayon avec le sol (y=0) → nouvelle position.
      if (raycaster.ray.intersectPlane(plane, point)) onMove(point.x + offsetX, point.z + offsetZ);
    };
    const up = (ev?: PointerEvent) => {
      if (ev && ev.pointerId !== pointerId) return;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      window.removeEventListener('blur', blur);
      gl.domElement.removeEventListener('lostpointercapture', up);
      cleanup.current = null;
      target.releasePointerCapture?.(pointerId);
      if (control) control.enabled = wasEnabled;
      onEnd();
    };
    const blur = () => up();
    cleanup.current = blur;
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    window.addEventListener('blur', blur);
    gl.domElement.addEventListener('lostpointercapture', up);
  };
}

/* ---------- Objets de salle non-tables (registry) ---------- */
export const OBJECT_DEFS: Record<
  SceneObjectKind,
  { label: string; color: string; w: number; d: number; h: number }
> = {
  piste: { label: 'Piste de danse', color: '#4b4456', w: 5.5, d: 3.4, h: 0.04 },
  scene: { label: 'Scène / Orchestre', color: '#2e2937', w: 4.2, d: 2.2, h: 0.35 },
  buffet: { label: 'Buffet', color: '#a98f62', w: 3.2, d: 1.0, h: 0.9 },
  bar: { label: 'Bar', color: '#5a4a3a', w: 2.4, d: 1.0, h: 1.0 },
  urne: { label: 'Urne / Livre d\'or', color: '#c9a96e', w: 0.9, d: 0.9, h: 1.0 },
  photobooth: { label: 'Photobooth', color: '#e8b4b8', w: 1.4, d: 1.4, h: 1.8 },
  candy_bar: { label: 'Candy bar', color: '#d98fa0', w: 1.6, d: 0.9, h: 1.0 },
  estrade: { label: 'Estrade + cœurs', color: '#8a6fb8', w: 4.6, d: 2.6, h: 0.45 },
  allee: { label: 'Allée tapis blanc', color: '#f2eee8', w: 1.8, d: 5.0, h: 0.02 },
};

/* ---------- Rendus réels par kind (Open/Closed : 1 entrée par objet) ---------- */
const Speaker = ({ x }: { x: number }) => (
  <group position={[x, 0, 0]}>
    <mesh position={[0, 0.6, 0]} castShadow>
      <boxGeometry args={[0.35, 0.6, 0.3]} />
      <meshStandardMaterial color="#1f1c26" roughness={0.6} />
    </mesh>
    <mesh position={[0, 0.62, -0.16]}>
      <cylinderGeometry args={[0.09, 0.09, 0.02, 16]} />
      <meshStandardMaterial color="#3a3546" roughness={0.5} />
    </mesh>
  </group>
);

const OBJECT_RENDERERS: Record<SceneObjectKind, () => JSX.Element> = {
  // Parquet sombre brillant
  piste: () => (
    <mesh position={[0, 0.02, 0]} receiveShadow>
      <boxGeometry args={[5.5, 0.04, 3.4]} />
      <meshStandardMaterial color="#3a3244" roughness={0.2} metalness={0.3} />
    </mesh>
  ),
  // Estrade noire + enceintes + pied micro
  scene: () => (
    <group>
      <mesh position={[0, 0.18, 0]} castShadow>
        <boxGeometry args={[4.2, 0.35, 2.2]} />
        <meshStandardMaterial color="#241f2e" roughness={0.5} />
      </mesh>
      <Speaker x={-1.7} />
      <Speaker x={1.7} />
      <mesh position={[0, 0.8, 0.4]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, 1.0, 8]} />
        <meshStandardMaterial color="#8a8a92" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.32, 0.4]} castShadow>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshStandardMaterial color="#2e2937" roughness={0.5} />
      </mesh>
    </group>
  ),
  // Table longue + chafing dishes métal
  buffet: () => (
    <group>
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[3.2, 0.9, 1.0]} />
        <meshStandardMaterial color="#f5f1ea" roughness={0.85} />
      </mesh>
      {[-1.0, 0, 1.0].map((x, i) => (
        <group key={i} position={[x, 0.95, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.28, 0.24, 0.18, 24]} />
            <meshStandardMaterial color="#c8c8ce" metalness={0.85} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.11, 0]} castShadow>
            <sphereGeometry args={[0.1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#c8c8ce" metalness={0.85} roughness={0.2} />
          </mesh>
        </group>
      ))}
    </group>
  ),
  // Comptoir noir + bouteilles + tabourets
  bar: () => (
    <group>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[2.4, 1.0, 1.0]} />
        <meshStandardMaterial color="#2e2937" roughness={0.4} />
      </mesh>
      {[-0.8, 0, 0.8].map((x, i) => (
        <mesh key={i} position={[x, 1.15, -0.2]} castShadow>
          <cylinderGeometry args={[0.035, 0.045, 0.3, 10]} />
          <meshStandardMaterial color={['#5a8a5a', '#8a5a5a', '#5a5a8a'][i]} roughness={0.3} />
        </mesh>
      ))}
      {[-0.7, 0.7].map((x, i) => (
        <group key={`s${i}`} position={[x, 0, 0.85]}>
          <mesh position={[0, 0.32, 0]} castShadow>
            <cylinderGeometry args={[0.18, 0.16, 0.05, 16]} />
            <meshStandardMaterial color="#8a6f4d" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.16, 0]} castShadow>
            <cylinderGeometry args={[0.02, 0.02, 0.32, 8]} />
            <meshStandardMaterial color="#5a4a3a" roughness={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  ),
  // Tablette + urne dorée + livre ouvert
  urne: () => (
    <group>
      <mesh position={[0, 0.45, 0]} castShadow>
        <cylinderGeometry args={[0.42, 0.38, 0.9, 24]} />
        <meshStandardMaterial color="#f5f1ea" roughness={0.85} />
      </mesh>
      <mesh position={[-0.12, 1.0, 0]} castShadow>
        <boxGeometry args={[0.3, 0.22, 0.22]} />
        <meshStandardMaterial color={C.gold} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0.18, 0.93, 0]} rotation={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[0.24, 0.02, 0.18]} />
        <meshStandardMaterial color="#ffffff" roughness={0.7} />
      </mesh>
    </group>
  ),
  // Photobooth vintage : caisson bois + objectif + écran + trépied bois
  photobooth: () => (
    <group>
      {/* caisson bois arrondi */}
      <mesh position={[0, 1.55, 0]} castShadow>
        <boxGeometry args={[0.55, 0.62, 0.28]} />
        <meshStandardMaterial color="#c9a06a" roughness={0.6} />
      </mesh>
      {/* façade plus claire */}
      <mesh position={[0, 1.55, 0.15]} castShadow>
        <boxGeometry args={[0.5, 0.56, 0.03]} />
        <meshStandardMaterial color="#d9b380" roughness={0.55} />
      </mesh>
      {/* objectif */}
      <mesh position={[0, 1.72, 0.18]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.09, 0.05, 24]} />
        <meshStandardMaterial color="#1f1c26" roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.72, 0.205]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.01, 24]} />
        <meshStandardMaterial color="#3a5a8a" roughness={0.15} metalness={0.4} />
      </mesh>
      {/* écran */}
      <mesh position={[0, 1.48, 0.17]}>
        <planeGeometry args={[0.32, 0.2]} />
        <meshStandardMaterial color="#22242e" emissive="#4a5568" emissiveIntensity={0.6} roughness={0.4} />
      </mesh>
      {/* trépied : 3 pieds bois évasés + tablette */}
      {[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((a, i) => (
        <mesh key={i} position={[Math.sin(a) * 0.3, 0.5, Math.cos(a) * 0.3]} rotation={[Math.cos(a) * 0.28, 0, -Math.sin(a) * 0.28]} castShadow>
          <cylinderGeometry args={[0.025, 0.02, 1.35, 8]} />
          <meshStandardMaterial color="#b08d5e" roughness={0.6} />
        </mesh>
      ))}
      {/* colonne centrale */}
      <mesh position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 0.5, 8]} />
        <meshStandardMaterial color="#8a6f4d" roughness={0.5} />
      </mesh>
      {/* petite tablette circulaire */}
      <mesh position={[0, 0.72, 0.32]} castShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.02, 20]} />
        <meshStandardMaterial color="#c9a06a" roughness={0.6} />
      </mesh>
    </group>
  ),
  // Table nappée + bocaux de bonbons transparents
  candy_bar: () => (
    <group>
      <mesh position={[0, 0.42, 0]} castShadow>
        <cylinderGeometry args={[0.75, 0.8, 0.84, 24]} />
        <meshStandardMaterial color="#f5f1ea" roughness={0.85} />
      </mesh>
      {[
        [-0.45, '#e8b4b8'],
        [-0.15, '#f6d9a0'],
        [0.15, '#b8d9b8'],
        [0.45, '#c5b8e8'],
      ].map(([x, col], i) => (
        <group key={i} position={[x as number, 0.9, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.09, 0.08, 0.22, 16, 1, true]} />
            <meshPhysicalMaterial color="#e8f0f2" roughness={0.1} transparent opacity={0.35} transmission={0.5} />
          </mesh>
          <mesh position={[0, -0.03, 0]}>
            <sphereGeometry args={[0.065, 12, 8]} />
            <meshStandardMaterial color={col as string} roughness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  ),
  // Estrade + arche + 2 cœurs lilas rétroéclairés + table des mariés
  estrade: () => (
    <group>
      <mesh position={[0, 0.22, 0]} castShadow>
        <boxGeometry args={[4.6, 0.45, 2.6]} />
        <meshStandardMaterial color="#f1e8d8" roughness={0.9} />
      </mesh>
      {/* marche */}
      <mesh position={[0, 0.12, 1.7]} castShadow>
        <boxGeometry args={[1.6, 0.24, 0.8]} />
        <meshStandardMaterial color="#f1e8d8" roughness={0.9} />
      </mesh>
      {/* backdrop + 2 cœurs lumineux (vraie forme de cœur extrudée) */}
      <mesh position={[0, 2.4, -1.1]} castShadow>
        <boxGeometry args={[4.6, 4.2, 0.15]} />
        <meshStandardMaterial color="#efe9e0" roughness={0.85} />
      </mesh>
      {Array.from({ length: 64 }, (_, i) => (
        <mesh key={`fold-${i}`} position={[-2.26 + i * 4.52 / 63, 2.4, -0.98]} castShadow>
          <cylinderGeometry args={[0.045, 0.045, 4.1, 8]} />
          <meshStandardMaterial color={i % 2 ? '#fffaf2' : '#eee9e1'} roughness={0.95} />
        </mesh>
      ))}
      {Array.from({ length: 5 }, (_, panel) => (
        <group key={`drape-${panel}`}>
          {Array.from({ length: 20 }, (_, i) => {
            const t = i / 19;
            return (
              <mesh key={i} scale={[0.065, 0.14, 0.04]} position={[-2.25 + panel * 0.9 + t * 0.9, 2.15 - Math.sin(t * Math.PI) * 0.7, -0.86]}>
                <sphereGeometry args={[1, 8, 6]} />
                <meshStandardMaterial color="#fffaf4" roughness={0.95} />
              </mesh>
            );
          })}
        </group>
      ))}
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 0.98, 0.97, 0.35]} castShadow>
            <boxGeometry args={[0.24, 0.35, 0.85]} />
            <meshStandardMaterial color="#f4e8d5" roughness={0.85} />
          </mesh>
          <mesh position={[side * 1.93, 1.05, -0.25]} castShadow>
            <cylinderGeometry args={[0.16, 0.08, 1.15, 20]} />
            <meshStandardMaterial color="#c9cbd0" metalness={0.85} roughness={0.2} />
          </mesh>
          {Array.from({ length: 18 }, (_, i) => {
            const angle = i * 2.39996;
            const radius = 0.32 * Math.sqrt(i / 18);
            return (
              <mesh key={`vase-${i}`} position={[side * 1.93 + Math.cos(angle) * radius, 1.7 + 0.16 * Math.cos(i * 1.7), -0.25 + Math.sin(angle) * radius]} castShadow>
                <sphereGeometry args={[0.13, 10, 8]} />
                <meshStandardMaterial color={i % 3 ? '#fffaf0' : '#e8e5d6'} roughness={0.95} />
              </mesh>
            );
          })}
          {Array.from({ length: 28 }, (_, i) => (
            <mesh key={`garland-${i}`} position={[side * (0.92 + 0.22 * Math.sin(i * 2.4)), 0.6 + i / 28 * 0.85, -0.15 + 0.22 * Math.cos(i * 2.4)]} castShadow>
              <sphereGeometry args={[0.13, 10, 8]} />
              <meshStandardMaterial color={i % 4 ? '#fffaf0' : '#e5e3d3'} roughness={0.95} />
            </mesh>
          ))}
          {[0, 1, 2].map((i) => (
            <group key={`candle-${i}`} position={[side * (1.35 + i * 0.15), 0.45, -0.65]}>
              <mesh position={[0, (0.65 + i * 0.22) / 2, 0]}>
                <cylinderGeometry args={[0.018, 0.025, 0.65 + i * 0.22, 8]} />
                <meshStandardMaterial color="#c9cbd0" metalness={0.85} roughness={0.2} />
              </mesh>
              <mesh position={[0, 0.73 + i * 0.22, 0]}>
                <cylinderGeometry args={[0.025, 0.025, 0.16, 8]} />
                <meshStandardMaterial color="#fff4d7" emissive="#ffe0a3" emissiveIntensity={0.3} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
      <mesh position={[0, 1.17, -0.05]} castShadow>
        <boxGeometry args={[1.85, 0.6, 0.22]} />
        <meshStandardMaterial color="#f4e8d5" roughness={0.85} />
      </mesh>
      {/* table des mariés */}
      <mesh position={[0, 0.85, 0.6]} castShadow>
        <boxGeometry args={[2.2, 0.8, 0.8]} />
        <meshStandardMaterial color="#f5f1ea" roughness={0.85} />
      </mesh>
    </group>
  ),
  // Tapis blanc + pétales + colonnes de cristal
  allee: () => (
    <group>
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <boxGeometry args={[1.8, 0.02, 5.0]} />
        <meshStandardMaterial color="#ffffff" roughness={0.6} />
      </mesh>
      {/* pétales épars */}
      {Array.from({ length: 22 }, (_, i) => (
        <mesh key={i} position={[(Math.random() - 0.5) * 1.4, 0.035, (Math.random() - 0.5) * 4.6]} rotation={[Math.PI / 2, 0, Math.random() * 3]}>
          <circleGeometry args={[0.035 + Math.random() * 0.03, 8]} />
          <meshStandardMaterial color={i % 3 === 0 ? '#e8b4c8' : i % 3 === 1 ? '#f6d9e0' : '#d98fa0'} roughness={0.8} />
        </mesh>
      ))}
      {/* colonnes de perles cristal en rangées */}
      {[-1.2, 1.2].map((x) =>
        [-1.8, 0, 1.8].map((z) => (
          <group key={`${x}${z}`} position={[x, 0, z]}>
            <mesh position={[0, 1.15, 0]} castShadow>
              <cylinderGeometry args={[0.16, 0.16, 0.04, 16]} />
              <meshStandardMaterial color={C.gold} metalness={0.7} roughness={0.3} />
            </mesh>
            {Array.from({ length: 10 }, (_, i) => {
              const a = (i / 10) * Math.PI * 2;
              return (
                <mesh key={i} position={[Math.cos(a) * 0.13, 0.55, Math.sin(a) * 0.13]}>
                  <cylinderGeometry args={[0.006, 0.006, 1.1, 4]} />
                  <meshStandardMaterial color="#e8eef2" roughness={0.2} metalness={0.4} transparent opacity={0.75} />
                </mesh>
              );
            })}
            <mesh position={[0, 0.06, 0]}>
              <cylinderGeometry args={[0.15, 0.15, 0.03, 16]} />
              <meshStandardMaterial color={C.gold} metalness={0.7} roughness={0.3} />
            </mesh>
          </group>
        ))
      )}
    </group>
  ),
};

function SceneObjectMesh({
  obj,
  selected,
  onSelect,
  onDragStart,
  onMove,
  onDragEnd,
}: {
  obj: SceneObject;
  selected: boolean;
  onSelect: () => void;
  onDragStart: () => void;
  onMove: (x: number, z: number) => void;
  onDragEnd: () => void;
}) {
  const def = OBJECT_DEFS[obj.kind];
  const drag = useFloorDrag((x, z) => onMove(x, z), onDragEnd, onDragStart, obj.id, obj);
  return (
    <group
      position={[obj.x, 0, obj.z]}
      rotation={[0, (obj.rotation * Math.PI) / 180, 0]}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect();
        drag(e);
      }}
    >
      {OBJECT_RENDERERS[obj.kind] ? OBJECT_RENDERERS[obj.kind]() : (
        <mesh position={[0, def.h / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[def.w, def.h, def.d]} />
          <meshStandardMaterial color={def.color} roughness={0.6} />
        </mesh>
      )}
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[Math.max(def.w, def.d) * 0.7, Math.max(def.w, def.d) * 0.77, 48]} />
          <meshBasicMaterial color={C.turquoise} transparent opacity={0.85} />
        </mesh>
      )}
      <Html zIndexRange={[60, 0]} center position={[0, def.h + 0.45, 0]} distanceFactor={9} className="pointer-events-none select-none">
        <div className="px-2.5 py-0.5 rounded-full bg-white/90 text-[11px] font-semibold text-[#4B4456] shadow whitespace-nowrap">
          {obj.label}
        </div>
      </Html>
    </group>
  );
}

/* ---------- Registry de formes (Open/Closed) ---------- */
interface ShapeDef {
  label: string;
  top: (accent: string) => JSX.Element;
  seats: (count: number) => { x: number; z: number; angle: number }[];
  placeOffset: number; // distance centre→couvert
  seatDist: number; // distance centre→chaise
}

/* ---------- Forme de cœur (Shape extrudée) ---------- */
let _heart: THREE.ExtrudeGeometry | null = null;
function heartGeometry() {
  if (!_heart) {
    const s = new THREE.Shape();
    s.moveTo(0.5, 0.5);
    s.bezierCurveTo(0.5, 0.5, 0.4, 0, 0, 0);
    s.bezierCurveTo(-0.6, 0, -0.6, 0.7, -0.6, 0.7);
    s.bezierCurveTo(-0.6, 1.1, -0.3, 1.54, 0.5, 1.9);
    s.bezierCurveTo(1.3, 1.54, 1.6, 1.1, 1.6, 0.7);
    s.bezierCurveTo(1.6, 0.7, 1.6, 0, 1.0, 0);
    s.bezierCurveTo(0.7, 0, 0.5, 0.5, 0.5, 0.5);
    _heart = new THREE.ExtrudeGeometry(s, {
      depth: 0.3,
      bevelEnabled: true,
      bevelSize: 0.06,
      bevelThickness: 0.06,
      bevelSegments: 4,
    });
    _heart.center();
  }
  return _heart;
}

const ellipseSeats = (a: number, b: number) => (count: number) =>
  Array.from({ length: count }, (_, i) => {
    const t = (i / count) * Math.PI * 2;
    return { x: Math.cos(t) * a, z: Math.sin(t) * b, angle: -t - Math.PI / 2 };
  });

const rectSeats = (w: number, d: number) => (count: number) => {
  const per = 2 * (w + d);
  return Array.from({ length: count }, (_, i) => {
    let t = (i / count) * per;
    if (t < w) return { x: t - w / 2, z: -d / 2, angle: 0 };
    t -= w;
    if (t < d) return { x: w / 2, z: t - d / 2, angle: Math.PI / 2 };
    t -= d;
    if (t < w) return { x: w / 2 - t, z: d / 2, angle: Math.PI };
    return { x: -w / 2, z: d / 2 - (t - w), angle: -Math.PI / 2 };
  });
};

export const TABLE_SHAPES: Record<TableShape, ShapeDef> = {
  ronde: {
    label: 'Ronde',
    top: () => (
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.05, 1.1, 0.74, 48]} />
        <meshStandardMaterial color={C.cloth} roughness={0.85} />
      </mesh>
    ),
    seats: (n) => ellipseSeats(1.75, 1.75)(n),
    placeOffset: 0.68,
    seatDist: 1.75,
  },
  carree: {
    label: 'Carrée',
    top: () => (
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 0.74, 1.5]} />
        <meshStandardMaterial color={C.cloth} roughness={0.85} />
      </mesh>
    ),
    seats: (n) => rectSeats(2.0, 2.0)(n),
    placeOffset: 0.55,
    seatDist: 1.0,
  },
  rectangle: {
    label: 'Rectangle',
    top: () => (
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.7, 0.74, 1.15]} />
        <meshStandardMaterial color={C.cloth} roughness={0.85} />
      </mesh>
    ),
    seats: (n) => rectSeats(3.4, 1.9)(n),
    placeOffset: 0.85,
    seatDist: 1.0,
  },
  ovale: {
    label: 'Ovale',
    top: () => (
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow scale={[1.45, 1, 0.75]}>
        <cylinderGeometry args={[1.05, 1.1, 0.74, 48]} />
        <meshStandardMaterial color={C.cloth} roughness={0.85} />
      </mesh>
    ),
    seats: (n) => ellipseSeats(2.15, 1.15)(n),
    placeOffset: 0.68,
    seatDist: 1.5,
  },
};

/* ---------- Table complète : draggable, sièges cliquables ---------- */
function Table3D({
  table,
  selected,
  assignTarget,
  guestName,
  onSelect,
  onSeatClick,
  onDragStart,
  onMove,
  onDragEnd,
}: {
  table: PlanTable;
  selected: boolean;
  /** Siège en cours d'assignation (anneau visible). */
  assignTarget: { tableId: string; seatIndex: number } | null;
  /** Résout guest_id → nom affiché. */
  guestName: (id: string) => string | undefined;
  onSelect: (id: string) => void;
  onSeatClick: (tableId: string, seatIndex: number) => void;
  onDragStart: () => void;
  onMove: (id: string, x: number, z: number) => void;
  onDragEnd: () => void;
}) {
  const def = TABLE_SHAPES[table.shape];
  const seats = def.seats(table.seatCount);
  // Drag : pointerdown sur la table → suit le sol, lève le drag à pointerup.
  const drag = useFloorDrag((x, z) => onMove(table.id, x, z), onDragEnd, onDragStart, table.id, table);

  return (
    <group
      position={[table.x, 0, table.z]}
      rotation={[0, (table.rotation * Math.PI) / 180, 0]}
    >
      <group
        onPointerDown={(e) => {
          // Clic table = sélection + début de drag possible.
          e.stopPropagation();
          onSelect(table.id);
          drag(e);
        }}
      >
        {def.top(table.accent)}
        <Centerpiece accent={table.accent} />
        {/* couverts */}
        {seats.map((s, i) => {
          const dir = Math.hypot(s.x, s.z) || 1;
          const px = (s.x / dir) * def.placeOffset;
          const pz = (s.z / dir) * def.placeOffset;
          return <PlaceSetting key={i} x={px} z={pz} angle={Math.atan2(s.x, s.z)} accent={table.accent} />;
        })}
      </group>

      {/* anneau de sélection */}
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[def.seatDist + 0.55, def.seatDist + 0.62, 48]} />
          <meshBasicMaterial color={C.turquoise} transparent opacity={0.85} />
        </mesh>
      )}

      {/* chaises cliquables + badges invités */}
      {seats.map((s, i) => {
        const seat = table.seats[i];
        const name = seat?.guest_id ? guestName(seat.guest_id) : null;
        const isAssign = assignTarget?.tableId === table.id && assignTarget?.seatIndex === i;
        return (
          <group key={i} position={[s.x * 1.05, 0, s.z * 1.05]} rotation={[0, Math.atan2(-s.x, -s.z), 0]}>
            <group
              onClick={(e) => {
                e.stopPropagation();
                onSeatClick(table.id, i);
              }}
            >
              <Chair accent={table.accent} kind={seat?.kind || 'standard'} />
            </group>
            {isAssign && (
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
                <ringGeometry args={[0.32, 0.38, 32]} />
                <meshBasicMaterial color={C.gold} transparent opacity={0.9} />
              </mesh>
            )}
            <Html zIndexRange={[60, 0]} center position={[0, 1.15, 0]} distanceFactor={10} className="pointer-events-none select-none">
              {name ? (
                <div className="px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-sm text-[10px] font-medium text-[#4B4456] shadow-sm whitespace-nowrap">
                  {name}
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full bg-white/60 border border-dashed border-[#9C97A3] text-[10px] text-[#9C97A3] flex items-center justify-center">
                  +
                </div>
              )}
            </Html>
          </group>
        );
      })}

      <Html zIndexRange={[60, 0]} center position={[0, 2.0, 0]} distanceFactor={9} className="pointer-events-none select-none">
        <div
          className="px-3 py-1 rounded-full text-[12px] font-semibold text-white shadow-md whitespace-nowrap"
          style={{ background: table.accent }}
        >
          {table.name} · {table.seats.filter((s) => s.guest_id).length}/{table.seatCount}
        </div>
      </Html>
    </group>
  );
}

/* ---------- Guirlandes + lumière ---------- */
function FairyLights({ mood }: { mood: Mood }) {
  const bulbs: [number, number, number][] = [];
  for (let i = -6; i <= 6; i++) {
    bulbs.push([i, 4.5 + Math.sin(i * 0.9) * 0.3, -5.8 + i * 0.4]);
    bulbs.push([i, 4.3 + Math.cos(i * 0.8) * 0.3, 2 + i * 0.35]);
  }
  const evening = mood === 'soiree';
  return (
    <group>
      {bulbs.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshBasicMaterial color={evening ? '#ffd9a0' : '#fff3d6'} />
        </mesh>
      ))}
      <pointLight position={[0, 4.2, -2]} intensity={evening ? 30 : 12} color="#ffdba8" distance={15} />
      <pointLight position={[0, 4.0, 3]} intensity={evening ? 22 : 9} color="#ffe4bd" distance={13} />
    </group>
  );
}

/* ---------- Mode balade : première personne ----------
 * Desktop : clic = verrou souris (regard libre) + ZQSD/flèches.
 * Tactile/fallback : glisser = regarder, tap rapide = marcher vers le point.
 * camRef expose {x,z,dir} pour la minimap.
 */
function WalkControls({ active, camRef }: { active: boolean; camRef?: React.MutableRefObject<{ x: number; z: number; dir: number } | null> }) {
  const { camera, gl } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const target = useRef<THREE.Vector3 | null>(null);
  const look = useRef({ yaw: 0, pitch: 0 });
  const touch = useRef<{ x: number; y: number; t: number; moved: boolean } | null>(null);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const hit = useMemo(() => new THREE.Vector3(), []);

  // Entrée en balade : on spawne en bas de l'allée, regard vers le fond (-z).
  useEffect(() => {
    if (!active) return;
    camera.position.set(0, 1.65, 6.8);
    camera.rotation.set(0, 0, 0);
    look.current = { yaw: 0, pitch: 0 };
    target.current = null;
    const dn = (e: KeyboardEvent) => (keys.current[e.key.toLowerCase()] = true);
    const up = (e: KeyboardEvent) => (keys.current[e.key.toLowerCase()] = false);
    window.addEventListener('keydown', dn);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', dn);
      window.removeEventListener('keyup', up);
    };
  }, [active, camera]);

  // Tactile : tap = déplacement vers le point, drag = regard.
  useEffect(() => {
    if (!active) return;
    const el = gl.domElement;
    const locked = () => !!document.pointerLockElement;
    const down = (e: PointerEvent) => {
      if (locked() || e.pointerType === 'mouse') return;
      touch.current = { x: e.clientX, y: e.clientY, t: Date.now(), moved: false };
    };
    const move = (e: PointerEvent) => {
      const t = touch.current;
      if (!t || locked()) return;
      const dx = e.clientX - t.x;
      const dy = e.clientY - t.y;
      if (Math.abs(dx) + Math.abs(dy) > 8) t.moved = true;
      if (t.moved) {
        look.current.yaw -= dx * 0.004;
        look.current.pitch = Math.max(-1.2, Math.min(1.2, look.current.pitch - dy * 0.004));
        camera.rotation.set(look.current.pitch, look.current.yaw, 0, 'YXZ');
        t.x = e.clientX;
        t.y = e.clientY;
      }
    };
    const end = (e: PointerEvent) => {
      const t = touch.current;
      touch.current = null;
      // Tap court : marcher vers le point visé au sol.
      if (t && !t.moved && Date.now() - t.t < 250) {
        const rect = el.getBoundingClientRect();
        const ndc = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1
        );
        raycaster.setFromCamera(ndc, camera);
        if (raycaster.ray.intersectPlane(plane, hit)) {
          target.current = hit.clone();
        }
      }
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', end);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', end);
    };
  }, [active, camera, gl, raycaster, plane, hit]);

  useFrame((_, dt) => {
    if (!active) return;
    const speed = 3 * dt;
    // clavier : ZQSD + WASD + flèches
    const fwd = (keys.current['z'] || keys.current['w'] || keys.current['arrowup'] ? 1 : 0) - (keys.current['s'] || keys.current['arrowdown'] ? 1 : 0);
    const side = (keys.current['d'] || keys.current['arrowright'] ? 1 : 0) - (keys.current['q'] || keys.current['a'] || keys.current['arrowleft'] ? 1 : 0);
    camera.translateZ(-fwd * speed);
    camera.translateX(side * speed);
    // tap-to-move : glisse doucement vers la cible
    if (target.current) {
      const dir = target.current.clone().sub(camera.position);
      dir.y = 0;
      const dist = dir.length();
      if (dist < 0.15) target.current = null;
      else camera.position.add(dir.normalize().multiplyScalar(Math.min(speed * 1.4, dist)));
    }
    // hauteur yeux + murs bloquants
    camera.position.y = 1.65;
    camera.position.x = Math.max(-7.5, Math.min(7.5, camera.position.x));
    camera.position.z = Math.max(-7.5, Math.min(7.5, camera.position.z));
    // minimap : position + cap
    if (camRef) {
      const v = new THREE.Vector3();
      camera.getWorldDirection(v);
      camRef.current = { x: camera.position.x, z: camera.position.z, dir: Math.atan2(v.x, v.z) };
    }
  });
  // Verrou souris uniquement sur pointer fin (desktop).
  const fine = typeof window !== 'undefined' && window.matchMedia?.('(pointer: fine)').matches;
  return active && fine ? <PointerLockControls /> : null;
}

/* ---------- Lumière qui suit la balade ---------- */
function WalkLight({ active }: { active: boolean }) {
  const ref = useRef<THREE.PointLight>(null);
  const { camera } = useThree();
  useFrame(() => {
    if (ref.current && active) {
      ref.current.position.set(camera.position.x, 2.4, camera.position.z);
    }
  });
  return <pointLight ref={ref} intensity={active ? 6 : 0} color="#fff2dc" distance={5} />;
}

/* ---------- Visite guidée : chemin cinématique ---------- */
const TOUR_POINTS: [number, number, number][] = [
  [0, 1.65, 6.8],
  [-4, 1.6, 3.2],
  [-5, 1.6, -1.5],
  [-2, 1.7, -5.5],
  [0, 1.8, -6.2],
  [2.5, 1.6, -5.5],
  [5, 1.6, -1.5],
  [4, 1.6, 3.2],
  [0, 1.65, 6.8],
];

function TourRig({ active, onDone }: { active: boolean; onDone: () => void }) {
  const { camera } = useThree();
  const progress = useRef(0);
  const curve = useMemo(
    () => new THREE.CatmullRomCurve3(TOUR_POINTS.map((p) => new THREE.Vector3(...p))),
    []
  );
  const DURATION = 26; // secondes
  useEffect(() => {
    if (active) progress.current = 0;
  }, [active]);
  useFrame((_, dt) => {
    if (!active) return;
    progress.current = Math.min(1, progress.current + dt / DURATION);
    const t = progress.current;
    const pos = curve.getPointAt(t);
    camera.position.copy(pos);
    // regard vers un point légèrement devant + centre de salle
    const ahead = curve.getPointAt(Math.min(1, t + 0.03));
    const lookTarget = new THREE.Vector3(ahead.x * 0.6, 1.2, ahead.z * 0.6);
    camera.lookAt(lookTarget);
    if (t >= 1) onDone();
  });
  return null;
}

/* ---------- Capture multi-angles : rend 6 vues fixes en PNG ----------
 * Quand captureNonce change : la caméra saute à chaque angle, on force un
 * render WebGL et on snapshot le canvas. Caméra restaurée après.
 */
function ViewCapture({
  nonce,
  room,
  onDone,
}: {
  nonce: number;
  room: { width: number; length: number };
  onDone: (imgs: string[]) => void;
}) {
  const { gl, scene, camera } = useThree();
  const last = useRef(0);
  useEffect(() => {
    if (!nonce || nonce === last.current) return;
    last.current = nonce;
    const { width: W, length: L } = room;
    // 6 angles repère : dessus, +z, -z, +x, -x, 3/4 perspective.
    const views: [number, number, number][] = [
      [0, Math.max(W, L) * 1.15, 0.01],
      [0, 5.5, L * 0.9],
      [0, 5.5, -L * 0.9],
      [W * 0.9, 5.5, 0],
      [-W * 0.9, 5.5, 0],
      [W * 0.55, 7, L * 0.55],
    ];
    const savedPos = camera.position.clone();
    const savedQuat = camera.quaternion.clone();
    const savedUp = camera.up.clone();
    const imgs: string[] = [];
    for (const [x, y, z] of views) {
      camera.position.set(x, y, z);
      // Vue pile du dessus : up arbitraire sinon → on fixe -z en haut de l'image.
      if (x === 0 && z === 0.01) camera.up.set(0, 0, -1);
      else camera.up.set(0, 1, 0);
      camera.lookAt(0, 0.8, 0);
      gl.render(scene, camera);
      imgs.push(gl.domElement.toDataURL('image/png'));
    }
    camera.position.copy(savedPos);
    camera.quaternion.copy(savedQuat);
    camera.up.copy(savedUp);
    gl.render(scene, camera);
    onDone(imgs);
  }, [nonce, gl, scene, camera, room, onDone]);
  return null;
}

/* ---------- OrbitControls + FlyTo + minimap ---------- */
function CameraRig({
  enabled,
  flyTo,
  camRef,
}: {
  enabled: boolean;
  flyTo?: { pos: [number, number, number]; look: [number, number, number] } | null;
  camRef?: React.MutableRefObject<{ x: number; z: number; dir: number } | null>;
}) {
  const ref = useRef<any>(null);
  const anim = useRef<{ pos: THREE.Vector3; look: THREE.Vector3 } | null>(null);
  // FlyTo : quand un point de vue prédéfini arrive, on lance la transition.
  useEffect(() => {
    if (flyTo) {
      anim.current = { pos: new THREE.Vector3(...flyTo.pos), look: new THREE.Vector3(...flyTo.look) };
      if (ref.current) ref.current.__interacted = true;
    }
  }, [flyTo]);
  useFrame((_, delta) => {
    const c = ref.current;
    if (!c?.object) return;
    // Transition douce vers le point de vue demandé.
    if (anim.current) {
      c.object.position.lerp(anim.current.pos, 0.12);
      c.target.lerp(anim.current.look, 0.12);
      c.update();
      if (c.object.position.distanceTo(anim.current.pos) < 0.08) anim.current = null;
    }
    // Rotation lente d'intro tant que l'utilisateur n'a pas touché.
    else if (!c.__interacted) {
      c.object.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), delta * 0.06);
      c.update();
    }
    // Position caméra → minimap.
    if (camRef) {
      const v = new THREE.Vector3();
      c.object.getWorldDirection(v);
      camRef.current = { x: c.object.position.x, z: c.object.position.z, dir: Math.atan2(v.x, v.z) };
    }
  });
  return (
    <OrbitControls
      ref={ref}
      makeDefault
      enabled={enabled}
      enableDamping
      dampingFactor={0.08}
      minDistance={4}
      maxDistance={15}
      maxPolarAngle={Math.PI / 2.15}
      target={[0, 0.7, 0]}
      onStart={() => {
        if (ref.current) ref.current.__interacted = true;
      }}
    />
  );
}

/* ============================ Scène ============================ */
export function StaticHallScene({
  tables,
  objects,
  selectedId,
  assignTarget,
  guestName,
  onSelectTable,
  onSeatClick,
  onMoveTable,
  onMoveObject,
  walkMode,
  tour,
  onTourEnd,
  flyTo,
  camRef,
  room,
  captureNonce,
  onCaptureViews,
  mood,
}: {
  tables: PlanTable[];
  objects: SceneObject[];
  selectedId: string | null;
  assignTarget: { tableId: string; seatIndex: number } | null;
  guestName: (id: string) => string | undefined;
  onSelectTable: (id: string | null) => void;
  onSeatClick: (tableId: string, seatIndex: number) => void;
  onMoveTable: (id: string, x: number, z: number) => void;
  onMoveObject: (id: string, x: number, z: number) => void;
  walkMode?: boolean;
  tour?: boolean;
  onTourEnd?: () => void;
  flyTo?: { pos: [number, number, number]; look: [number, number, number] } | null;
  camRef?: React.MutableRefObject<{ x: number; z: number; dir: number } | null>;
  room?: { width: number; length: number };
  captureNonce?: number;
  onCaptureViews?: (imgs: string[]) => void;
  mood: Mood;
}) {
  const evening = mood === 'soiree';
  // Bloque l'orbite caméra pendant un drag de table/objet.
  const [dragging, setDragging] = useState(false);
  const [touch, setTouch] = useState(false);
  const [movingId, setMovingId] = useState<string | null>(null);
  useEffect(() => {
    const query = window.matchMedia('(any-pointer: coarse)');
    const update = () => setTouch(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => { setMovingId(null); }, [selectedId, walkMode, tour]);
  const editing = !walkMode && !tour;
  const touchMoving = editing && !!movingId && movingId === selectedId;
  return (
    <div className="relative w-full h-full">
      {touch && editing && (
        <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-center gap-2 pointer-events-none">
          <span role="status" className="rounded-xl bg-white/95 px-3 py-2 text-xs text-[#4b4456] shadow-sm">
            {touchMoving ? 'Glissez l’élément sélectionné pour le déplacer' : 'Explorer : touchez un élément pour le sélectionner'}
          </span>
          {selectedId && (
            <button type="button" onClick={() => setMovingId(touchMoving ? null : selectedId)}
              className="pointer-events-auto min-h-[44px] rounded-xl bg-[#4b4456] px-4 py-2 text-sm font-semibold text-white shadow">
              {touchMoving ? 'Terminer' : 'Déplacer l’élément'}
            </button>
          )}
        </div>
      )}
      <DragMode.Provider value={{ allowed: editing, touchId: touchMoving ? movingId : null }}>
    <Canvas
      style={{ touchAction: 'none' }}
      shadows
      dpr={[1, 1.8]}
      camera={{ position: [7.5, 5.5, 8.5], fov: 42 }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = evening ? 0.95 : 1.1;
      }}
    >
      <color attach="background" args={[evening ? '#2b2a33' : '#f2eadf']} />
      <fog attach="fog" args={[evening ? '#2b2a33' : '#f2eadf', 20, 40]} />

      <Suspense fallback={null}>
        <ambientLight intensity={evening ? 0.25 : 0.55} />
        <hemisphereLight intensity={evening ? 0.25 : 0.5} color="#fff4e2" groundColor="#b98d63" />
        <directionalLight
          position={[evening ? -6 : 6, 8, 4]}
          intensity={evening ? 0.7 : 1.5}
          color={evening ? '#b8c6e8' : '#fff2e0'}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />
        <FairyLights mood={mood} />
        <Room mood={mood} room={room || { width: 16, length: 16 }} />
        {/* objets de salle (piste, scène, buffet...) — draggables */}
        {objects.map((o) => (
          <SceneObjectMesh
            key={o.id}
            obj={o}
            selected={o.id === selectedId}
            onSelect={() => onSelectTable(o.id)}
            onDragStart={() => setDragging(true)}
            onMove={(x, z) => onMoveObject(o.id, x, z)}
            onDragEnd={() => setDragging(false)}
          />
        ))}
        {/* tables : sélection, drag, sièges cliquables */}
        {tables.map((t) => (
          <Table3D
            key={t.id}
            table={t}
            selected={t.id === selectedId}
            assignTarget={assignTarget}
            guestName={guestName}
            onSelect={onSelectTable}
            onSeatClick={onSeatClick}
            onDragStart={() => setDragging(true)}
            onMove={onMoveTable}
            onDragEnd={() => setDragging(false)}
          />
        ))}
        <Float speed={1.4} rotationIntensity={0.4} floatIntensity={0.6}>
          <group position={[0, 3.6, -4]}>
            <mesh rotation={[Math.PI / 2.4, 0, 0]} castShadow>
              <torusGeometry args={[0.55, 0.03, 16, 64]} />
              <meshStandardMaterial color={C.turquoise} metalness={0.6} roughness={0.25} />
            </mesh>
          </group>
        </Float>
        <ContactShadows position={[0, 0.01, 0]} opacity={0.4} scale={18} blur={2.4} far={6} />
      </Suspense>

      <WalkLight active={!!walkMode} />
      <ViewCapture nonce={captureNonce || 0} room={room || { width: 16, length: 16 }} onDone={onCaptureViews || (() => {})} />
      {tour ? (
        <TourRig active onDone={() => onTourEnd?.()} />
      ) : walkMode ? (
        <WalkControls active camRef={camRef} />
      ) : (
        <CameraRig enabled={!dragging && !touchMoving} flyTo={flyTo} camRef={camRef} />
      )}
      <EffectComposer>
        <Bloom intensity={evening ? 0.55 : 0.25} luminanceThreshold={0.75} luminanceSmoothing={0.2} />
        <Vignette eskil={false} offset={0.18} darkness={0.55} />
      </EffectComposer>
    </Canvas>
      </DragMode.Provider>
    </div>
  );
}
