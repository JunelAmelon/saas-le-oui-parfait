'use client';

/**
 * Démo interactive — salle de réception 3D (react-three-fiber).
 * Textures 100% procédurales (canvas) : aucun asset distant.
 * Registry de formes de tables (SOLID/Open-Closed) : ajouter une forme
 * = une entrée dans TABLE_SHAPES.
 */

import { Suspense, createContext, useContext, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Html, Float, PointerLockControls, useGLTF } from '@react-three/drei';
import { useEffect } from 'react';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { PersonStanding } from 'lucide-react';
import {
  DEFAULT_DECOR,
  type CenterpieceStyle,
  type ChairStyle,
  type DecorConfig,
  type FloorStyle,
  type PlanTable,
  type SceneObject,
  type SceneObjectKind,
  type SeatKind,
  type TableShape,
  type TableSurfaceStyle,
  type TablewareStyle,
} from '@/lib/table-plan/types';

const DecorContext = createContext<DecorConfig>(DEFAULT_DECOR);

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

let _woodTableTex: THREE.CanvasTexture | null = null;
function getWoodTableTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  if (_woodTableTex) return _woodTableTex;
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 512;
  const ctx = cv.getContext('2d')!;
  // Fond bois merisier / acajou chaud verni
  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, '#c5723c');
  grad.addColorStop(0.5, '#b86230');
  grad.addColorStop(1, '#c97843');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);
  // Veines longitudinales fines du bois
  for (let i = 0; i < 220; i++) {
    const y = (i / 220) * 512;
    ctx.strokeStyle = i % 3 === 0 ? 'rgba(115, 52, 18, 0.16)' : i % 2 === 0 ? 'rgba(235, 165, 110, 0.12)' : 'rgba(92, 40, 12, 0.10)';
    ctx.lineWidth = 1 + (i % 3) * 0.6;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= 512; x += 32) {
      const wave = Math.sin(x * 0.018 + i * 0.35) * 3.5;
      ctx.lineTo(x, y + wave);
    }
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  _woodTableTex = tex;
  return tex;
}

let _parquetFloorTex: THREE.CanvasTexture | null = null;
function getParquetFloorTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  if (_parquetFloorTex) return _parquetFloorTex;
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 256;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#a8835a';
  ctx.fillRect(0, 0, 256, 256);
  const tones = ['#9d774f', '#b28c63', '#916c45', '#ab865d'];
  const step = 64;
  for (let y = 0; y < 256; y += step) {
    for (let x = 0; x < 256; x += step) {
      ctx.fillStyle = tones[((x + y) / step) % tones.length];
      ctx.beginPath();
      ctx.moveTo(x, y + step / 2);
      ctx.lineTo(x + step / 2, y);
      ctx.lineTo(x + step, y + step / 2);
      ctx.lineTo(x + step / 2, y + step);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(70, 46, 24, 0.32)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  tex.anisotropy = 8;
  _parquetFloorTex = tex;
  return tex;
}

/* ---------- Géométries Lathe partagées (assiette porcelaine + verre à pied) ---------- */
let _plateGeom: THREE.LatheGeometry | null = null;
function getPlateGeometry(): THREE.LatheGeometry {
  if (!_plateGeom) {
    // Profil d'une assiette creuse en porcelaine (pied -> bassin creux -> aile large -> bord arrondi)
    const pts = [
      new THREE.Vector2(0.0, 0.002),
      new THREE.Vector2(0.085, 0.002),
      new THREE.Vector2(0.095, 0.0),
      new THREE.Vector2(0.105, 0.008),
      new THREE.Vector2(0.135, 0.022),
      new THREE.Vector2(0.175, 0.031),
      new THREE.Vector2(0.182, 0.034),
      new THREE.Vector2(0.172, 0.036),
      new THREE.Vector2(0.130, 0.025),
      new THREE.Vector2(0.090, 0.008),
      new THREE.Vector2(0.0, 0.006),
    ];
    _plateGeom = new THREE.LatheGeometry(pts, 40);
    _plateGeom.computeVertexNormals();
  }
  return _plateGeom;
}

let _wineGlassGeom: THREE.LatheGeometry | null = null;
function getWineGlassGeometry(): THREE.LatheGeometry {
  if (!_wineGlassGeom) {
    // Profil d'un verre à vin sur pied (socle plat -> tige fine -> calice tulipe)
    const pts = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.036, 0.0),
      new THREE.Vector2(0.034, 0.004),
      new THREE.Vector2(0.006, 0.009),
      new THREE.Vector2(0.0045, 0.055),
      new THREE.Vector2(0.005, 0.105),
      new THREE.Vector2(0.016, 0.118),
      new THREE.Vector2(0.038, 0.145),
      new THREE.Vector2(0.044, 0.185),
      new THREE.Vector2(0.039, 0.225),
      new THREE.Vector2(0.037, 0.225),
      new THREE.Vector2(0.042, 0.185),
      new THREE.Vector2(0.035, 0.146),
      new THREE.Vector2(0.012, 0.120),
      new THREE.Vector2(0.0, 0.115),
    ];
    _wineGlassGeom = new THREE.LatheGeometry(pts, 32);
    _wineGlassGeom.computeVertexNormals();
  }
  return _wineGlassGeom;
}

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
  const decor = useContext(DecorContext);
  const floorStyle: FloorStyle = decor.floor || 'dalles';
  const parquetTex = useMemo(() => getParquetFloorTexture(), []);
  const jointX = Math.max(1, Math.round(W / 1.6));
  const jointZ = Math.max(1, Math.round(L / 1.6));

  return (
    <group>
      {/* Sol selon le style choisi (par défaut : dalles blanches historiques) */}
      {floorStyle === 'parquet_chevron' ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[W + 1, L + 1]} />
          <meshStandardMaterial map={parquetTex || undefined} color="#b8936a" roughness={0.38} metalness={0.05} />
        </mesh>
      ) : floorStyle === 'parquet_clair' ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[W + 1, L + 1]} />
          <meshStandardMaterial map={parquetTex || undefined} color="#dfcaa8" roughness={0.42} metalness={0.04} />
        </mesh>
      ) : floorStyle === 'marbre_veine' ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[W + 1, L + 1]} />
          <meshPhysicalMaterial color="#f8f8fa" roughness={0.1} metalness={0.05} clearcoat={0.9} clearcoatRoughness={0.1} />
        </mesh>
      ) : floorStyle === 'beton_cire' ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[W + 1, L + 1]} />
          <meshStandardMaterial color="#d2cdc4" roughness={0.55} metalness={0.08} />
        </mesh>
      ) : floorStyle === 'tapis_sable' ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[W + 1, L + 1]} />
          <meshStandardMaterial color="#e4d9c8" roughness={0.9} metalness={0.0} />
        </mesh>
      ) : (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[W + 1, L + 1]} />
            <meshStandardMaterial color="#f4f2ee" roughness={0.25} metalness={0.05} />
          </mesh>
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
        </>
      )}
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
      <Html zIndexRange={[40, 0]} center position={[HW - 1.2, 0.06, HL - 0.5]} rotation={[Math.PI / 2, 0, 0]} className="pointer-events-none select-none">
        <span className="text-[10px] text-[#9C97A3] font-semibold bg-white/70 px-1.5 rounded">{W} m</span>
      </Html>
      <Html zIndexRange={[40, 0]} center position={[-HW + 0.5, 0.06, HL - 1.2]} rotation={[Math.PI / 2, 0, Math.PI / 2]} className="pointer-events-none select-none">
        <span className="text-[10px] text-[#9C97A3] font-semibold bg-white/70 px-1.5 rounded">{L} m</span>
      </Html>
    </group>
  );
}

/* ---------- Couvert : supporte Classique (défaut), Prestige (photo), Filet d'or, Champêtre ---------- */
function SilverFork({ x, z, scale = 1, color = '#e4e7ec', y = 0.786 }: { x: number; z: number; scale?: number; color?: string; y?: number }) {
  return (
    <group position={[x, y, z]} scale={scale}>
      <mesh position={[0, 0, 0.045]} castShadow>
        <boxGeometry args={[0.011, 0.004, 0.095]} />
        <meshStandardMaterial color={color} metalness={0.92} roughness={0.14} />
      </mesh>
      <mesh position={[0, 0.001, -0.01]} castShadow>
        <boxGeometry args={[0.007, 0.0035, 0.025]} />
        <meshStandardMaterial color={color} metalness={0.92} roughness={0.14} />
      </mesh>
      <mesh position={[0, 0.002, -0.024]} castShadow>
        <boxGeometry args={[0.02, 0.0035, 0.008]} />
        <meshStandardMaterial color={color} metalness={0.92} roughness={0.14} />
      </mesh>
      {[-0.0075, -0.0025, 0.0025, 0.0075].map((tx, i) => (
        <mesh key={i} position={[tx, 0.0025, -0.048]} castShadow>
          <boxGeometry args={[0.0026, 0.003, 0.042]} />
          <meshStandardMaterial color={color} metalness={0.92} roughness={0.14} />
        </mesh>
      ))}
    </group>
  );
}

function SilverKnife({ x, z, color = '#e4e7ec', y = 0.786 }: { x: number; z: number; color?: string; y?: number }) {
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0, 0.048]} castShadow>
        <boxGeometry args={[0.012, 0.005, 0.095]} />
        <meshStandardMaterial color={color} metalness={0.92} roughness={0.14} />
      </mesh>
      <mesh position={[-0.001, 0.001, -0.038]} castShadow>
        <boxGeometry args={[0.014, 0.0025, 0.085]} />
        <meshStandardMaterial color={color} metalness={0.95} roughness={0.1} />
      </mesh>
    </group>
  );
}

function SilverSpoon({ x, z, rotationY = 0, scale = 1, color = '#e4e7ec', y = 0.786 }: { x: number; z: number; rotationY?: number; scale?: number; color?: string; y?: number }) {
  return (
    <group position={[x, y, z]} rotation={[0, rotationY, 0]} scale={scale}>
      <mesh position={[0, 0, 0.042]} castShadow>
        <boxGeometry args={[0.01, 0.004, 0.095]} />
        <meshStandardMaterial color={color} metalness={0.92} roughness={0.14} />
      </mesh>
      <mesh position={[0, 0.002, -0.032]} scale={[1, 0.32, 1.45]} castShadow>
        <sphereGeometry args={[0.018, 16, 12]} />
        <meshStandardMaterial color={color} metalness={0.93} roughness={0.12} />
      </mesh>
    </group>
  );
}

function StemmedGlass({ x, z, scale = 1, rimColor = '#ffffff', y = 0.783 }: { x: number; z: number; scale?: number; rimColor?: string; y?: number }) {
  const geom = useMemo(() => getWineGlassGeometry(), []);
  return (
    <group position={[x, y, z]} scale={scale}>
      <mesh geometry={geom} castShadow>
        <meshPhysicalMaterial
          color="#f7fafc"
          roughness={0.08}
          metalness={0.05}
          transmission={0.78}
          thickness={0.03}
          ior={1.45}
          transparent
          opacity={0.72}
        />
      </mesh>
      <mesh position={[0, 0.224, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.038, 0.0016, 8, 28]} />
        <meshStandardMaterial color={rimColor} roughness={0.15} metalness={0.6} transparent opacity={0.9} />
      </mesh>
    </group>
  );
}

function PlaceSetting({ x, z, angle, accent }: { x: number; z: number; angle: number; accent: string }) {
  const decor = useContext(DecorContext);
  const style: TablewareStyle = decor.tableware || 'classique';
  const plateGeom = useMemo(() => getPlateGeometry(), []);

  // Mode par défaut = ancienne version classique
  if (style === 'classique') {
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

  const isGold = style === 'filet_or';
  const isRustic = style === 'champetre';
  const cutleryCol = isGold ? '#d8b467' : '#e4e7ec';
  const baseY = decor.tableStyle === 'nappe' ? 0.775 : 0.783;

  return (
    <group position={[x, 0, z]} rotation={[0, angle, 0]}>
      {/* Sous-assiette dorée en mode filet d'or */}
      {isGold && (
        <mesh position={[0, baseY - 0.002, 0]} castShadow>
          <cylinderGeometry args={[0.195, 0.18, 0.006, 40]} />
          <meshStandardMaterial color="#d4af37" metalness={0.85} roughness={0.22} />
        </mesh>
      )}
      {/* Assiette creuse en porcelaine glacée (ou grès sable en mode champêtre) */}
      <mesh position={[0, baseY, 0]} geometry={plateGeom} castShadow receiveShadow>
        <meshPhysicalMaterial
          color={isRustic ? '#efe8dc' : '#ffffff'}
          roughness={isRustic ? 0.45 : 0.12}
          metalness={0.02}
          clearcoat={isRustic ? 0.3 : 0.95}
          clearcoatRoughness={0.08}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Liseré intérieur (doré en mode filet_or, subtil en prestige) */}
      <mesh position={[0, baseY + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.102, 0.108, 36]} />
        <meshStandardMaterial color={isGold ? '#d4af37' : '#e6e2dc'} metalness={isGold ? 0.85 : 0.1} roughness={isGold ? 0.2 : 0.4} />
      </mesh>
      {isRustic && (
        <mesh position={[0, baseY + 0.018, 0]} rotation={[0, 0.35, 0]}>
          <boxGeometry args={[0.09, 0.01, 0.14]} />
          <meshStandardMaterial color={accent} roughness={0.85} />
        </mesh>
      )}

      {/* Couverts gauche & droite */}
      <SilverFork x={-0.215} z={0.01} scale={1} color={cutleryCol} y={baseY + 0.003} />
      <SilverFork x={-0.25} z={0.018} scale={0.9} color={cutleryCol} y={baseY + 0.003} />
      <SilverKnife x={0.21} z={0.01} color={cutleryCol} y={baseY + 0.003} />
      <SilverSpoon x={0.252} z={0.015} scale={0.95} color={cutleryCol} y={baseY + 0.003} />
      {!isRustic && <SilverSpoon x={0.01} z={-0.215} rotationY={Math.PI / 2} scale={0.78} color={cutleryCol} y={baseY + 0.003} />}

      {/* Verres à pied en cristal */}
      <StemmedGlass x={0.13} z={-0.22} scale={1.08} rimColor={isGold ? '#d4af37' : '#ffffff'} y={baseY} />
      <StemmedGlass x={0.215} z={-0.175} scale={0.96} rimColor={isGold ? '#d4af37' : '#ffffff'} y={baseY} />
      {!isRustic && <StemmedGlass x={0.18} z={-0.265} scale={0.86} rimColor={isGold ? '#d4af37' : '#ffffff'} y={baseY} />}
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

/* ---------- Centre de table : Candelabre doré (défaut), Boule blanche (photo), Couronne, Eucalyptus, Bougeoirs, Aucun ---------- */
function Centerpiece({ accent, x = 0, z = 0 }: { accent: string; x?: number; z?: number }) {
  const decor = useContext(DecorContext);
  const style: CenterpieceStyle = decor.centerpiece || 'candelabre';
  const flowerTone = decor.flowerColor || accent;

  const petalPositions = useMemo(() => {
    const arr: { pos: [number, number, number]; rot: [number, number, number]; s: number }[] = [];
    const count = 34;
    for (let i = 0; i < count; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / count);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = 0.22;
      arr.push({
        pos: [Math.sin(phi) * Math.cos(theta) * r, Math.cos(phi) * r * 0.92, Math.sin(phi) * Math.sin(theta) * r],
        rot: [phi * 0.7, theta, (i % 3) * 0.4],
        s: 0.9 + (i % 4) * 0.12,
      });
    }
    return arr;
  }, []);

  if (style === 'aucun') return null;

  if (style === 'boule_blanche') {
    return (
      <group position={[x, 0, z]}>
        <mesh position={[0, 0.795, 0]} castShadow>
          <cylinderGeometry args={[0.032, 0.095, 0.03, 24]} />
          <meshPhysicalMaterial color="#f7f5f0" roughness={0.2} transmission={0.35} transparent opacity={0.9} />
        </mesh>
        <mesh position={[0, 1.09, 0]} castShadow>
          <cylinderGeometry args={[0.022, 0.015, 0.58, 20]} />
          <meshPhysicalMaterial color="#ffffff" roughness={0.18} transmission={0.45} transparent opacity={0.88} />
        </mesh>
        <mesh position={[0, 1.4, 0]} castShadow>
          <cylinderGeometry args={[0.095, 0.022, 0.08, 24]} />
          <meshPhysicalMaterial color="#ffffff" roughness={0.2} transmission={0.4} transparent opacity={0.9} />
        </mesh>
        <group position={[0, 1.58, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.17, 20, 20]} />
            <meshStandardMaterial color="#f6f5f2" roughness={0.75} />
          </mesh>
          {petalPositions.map((p, i) => (
            <mesh key={i} position={p.pos} rotation={p.rot} scale={[p.s, p.s * 0.35, p.s * 1.15]} castShadow>
              <sphereGeometry args={[0.068, 12, 10]} />
              <meshStandardMaterial color={i % 3 === 0 ? flowerTone : '#ffffff'} roughness={0.55} />
            </mesh>
          ))}
        </group>
      </group>
    );
  }

  if (style === 'couronne_basse') {
    return (
      <group position={[x, 0, z]}>
        {/* Couronne de feuillage et fleurs basses */}
        <mesh position={[0, 0.8, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.22, 0.045, 12, 32]} />
          <meshStandardMaterial color="#688868" roughness={0.85} />
        </mesh>
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return (
            <Flower
              key={i}
              position={[Math.cos(a) * 0.22, 0.84, Math.sin(a) * 0.22]}
              color={i % 2 === 0 ? flowerTone : '#ffffff'}
              size={0.75}
              tilt={0.25}
            />
          );
        })}
        {/* Trio de bougies au centre */}
        {[
          [0, 0.14],
          [-0.08, 0.1],
          [0.08, 0.12],
        ].map(([cx, h], i) => (
          <mesh key={i} position={[cx, 0.78 + h / 2, i === 0 ? -0.03 : 0.04]} castShadow>
            <cylinderGeometry args={[0.028, 0.028, h, 14]} />
            <meshStandardMaterial color="#fff8e8" emissive="#ffd995" emissiveIntensity={0.35} />
          </mesh>
        ))}
      </group>
    );
  }

  if (style === 'eucalyptus') {
    return (
      <group position={[x, 0, z]}>
        <mesh position={[0, 0.82, 0]} castShadow>
          <cylinderGeometry args={[0.09, 0.07, 0.1, 18]} />
          <meshStandardMaterial color="#c9a96e" metalness={0.65} roughness={0.35} />
        </mesh>
        {Array.from({ length: 14 }, (_, i) => {
          const a = (i / 14) * Math.PI * 2;
          const r = 0.08 + (i % 3) * 0.07;
          return (
            <mesh key={i} position={[Math.cos(a) * r, 0.89 + (i % 2) * 0.04, Math.sin(a) * r]} rotation={[0.6, a, 0]} castShadow>
              <sphereGeometry args={[0.045, 10, 8]} />
              <meshStandardMaterial color={i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? flowerTone : '#6e8c72'} roughness={0.8} />
            </mesh>
          );
        })}
      </group>
    );
  }

  if (style === 'bougeoirs') {
    return (
      <group position={[x, 0, z]}>
        {[
          [-0.14, -0.06, 0.28],
          [0, 0.06, 0.38],
          [0.14, -0.04, 0.22],
        ].map(([bx, bz, bh], i) => (
          <group key={i} position={[bx, 0.78, bz]}>
            <mesh position={[0, 0.01, 0]}>
              <cylinderGeometry args={[0.045, 0.05, 0.02, 16]} />
              <meshStandardMaterial color={C.gold} metalness={0.85} roughness={0.2} />
            </mesh>
            <mesh position={[0, bh / 2, 0]}>
              <cylinderGeometry args={[0.008, 0.012, bh, 12]} />
              <meshStandardMaterial color={C.gold} metalness={0.85} roughness={0.2} />
            </mesh>
            <mesh position={[0, bh + 0.06, 0]}>
              <cylinderGeometry args={[0.016, 0.016, 0.12, 12]} />
              <meshStandardMaterial color="#fff8e7" emissive="#ffdd99" emissiveIntensity={0.4} />
            </mesh>
          </group>
        ))}
      </group>
    );
  }

  // Mode par défaut = candélabre doré + bouquet lys & roses historique
  const FLOWERS: { pos: [number, number, number]; col: string; s: number; tilt: number }[] = [
    { pos: [0, 1.5, 0], col: flowerTone, s: 1.3, tilt: 0.15 },
    { pos: [0.14, 1.44, 0.06], col: C.rose, s: 1, tilt: 0.5 },
    { pos: [-0.13, 1.46, -0.05], col: '#fff', s: 1.05, tilt: 0.4 },
    { pos: [0.06, 1.43, -0.13], col: flowerTone, s: 0.9, tilt: 0.55 },
    { pos: [-0.06, 1.45, 0.12], col: '#f6d9e0', s: 0.95, tilt: 0.5 },
    { pos: [0.11, 1.5, -0.09], col: C.rose, s: 0.8, tilt: 0.35 },
    { pos: [-0.11, 1.49, 0.08], col: flowerTone, s: 0.85, tilt: 0.45 },
  ];
  return (
    <group position={[x, 0, z]}>
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
      <DecorModel
        decor="flower"
        position={[0, 1.3, 0]}
        fallback={
          <group>
            {FLOWERS.map((f, i) => (
              <Flower key={i} position={[f.pos[0], f.pos[1] - 1.3, f.pos[2]]} color={f.col} size={f.s} tilt={f.tilt} />
            ))}
            {[0.4, 1.6, 2.8, 4.0, 5.2].map((a, i) => (
              <mesh key={i} position={[Math.cos(a) * 0.19, 0.02, Math.sin(a) * 0.19]} rotation={[0.85, a, 0]} castShadow>
                <boxGeometry args={[0.022, 0.24, 0.006]} />
                <meshStandardMaterial color="#5f8a5f" roughness={0.9} />
              </mesh>
            ))}
          </group>
        }
      />
    </group>
  );
}

/* ---------- Chaise : Napoléon (défaut), Chiavari bois/or/noire, Médaillon Louis XVI, Ghost ---------- */
function Chair({ accent, kind }: { accent: string; kind: SeatKind }) {
  const decor = useContext(DecorContext);
  const chairStyle: ChairStyle = decor.chairStyle || 'napoleon';

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
        {[[-0.13, -0.13], [0.13, -0.13], [-0.13, 0.13], [0.13, 0.13]].map(([lx, lz], i) => (
          <mesh key={i} position={[lx, 0.24, lz]} castShadow>
            <cylinderGeometry args={[0.02, 0.02, 0.48, 8]} />
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

  // Style par défaut = Napoléon historique
  if (chairStyle === 'napoleon') {
    const frame = kind === 'vip' ? C.gold : '#f0ece4';
    return (
      <group>
        <mesh position={[0, 0.45, 0]} castShadow>
          <cylinderGeometry args={[0.24, 0.2, 0.06, 24]} />
          <meshStandardMaterial color="#faf6ef" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.92, -0.2]} castShadow>
          <boxGeometry args={[0.42, 0.05, 0.045]} />
          <meshStandardMaterial color={frame} roughness={0.5} />
        </mesh>
        {[-0.16, -0.05, 0.05, 0.16].map((bx, i) => (
          <mesh key={i} position={[bx, 0.68, -0.2]} castShadow>
            <cylinderGeometry args={[0.015, 0.015, 0.46, 8]} />
            <meshStandardMaterial color={frame} roughness={0.5} />
          </mesh>
        ))}
        {[[-0.16, -0.16], [0.16, -0.16], [-0.16, 0.16], [0.16, 0.16]].map(([lx, lz], i) => (
          <mesh key={i} position={[lx, 0.22, lz]} castShadow>
            <cylinderGeometry args={[0.022, 0.018, 0.44, 8]} />
            <meshStandardMaterial color={frame} roughness={0.5} />
          </mesh>
        ))}
      </group>
    );
  }

  // Style Ghost transparente
  if (chairStyle === 'ghost') {
    return (
      <group>
        <mesh position={[0, 0.45, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.2, 0.035, 24]} />
          <meshPhysicalMaterial color="#eef6fa" roughness={0.05} transmission={0.85} thickness={0.04} transparent opacity={0.55} />
        </mesh>
        <mesh position={[0, 0.74, -0.19]} scale={[1, 1.25, 0.2]} castShadow>
          <sphereGeometry args={[0.2, 20, 16]} />
          <meshPhysicalMaterial color="#eef6fa" roughness={0.05} transmission={0.85} thickness={0.04} transparent opacity={0.55} />
        </mesh>
        {[[-0.16, -0.16], [0.16, -0.16], [-0.16, 0.16], [0.16, 0.16]].map(([lx, lz], i) => (
          <mesh key={i} position={[lx, 0.22, lz]} castShadow>
            <cylinderGeometry args={[0.018, 0.014, 0.44, 10]} />
            <meshPhysicalMaterial color="#eef6fa" roughness={0.08} transmission={0.8} transparent opacity={0.6} />
          </mesh>
        ))}
      </group>
    );
  }

  // Style Louis XVI Médaillon
  if (chairStyle === 'medaillon') {
    return (
      <group>
        <mesh position={[0, 0.45, 0]} castShadow>
          <cylinderGeometry args={[0.23, 0.21, 0.06, 24]} />
          <meshStandardMaterial color="#f5efe4" roughness={0.65} />
        </mesh>
        {/* Cadre ovale du médaillon */}
        <mesh position={[0, 0.76, -0.19]} scale={[1, 1.25, 0.28]} castShadow>
          <torusGeometry args={[0.17, 0.024, 12, 28]} />
          <meshStandardMaterial color="#b99b72" roughness={0.45} />
        </mesh>
        {/* Tissu capitonné du médaillon */}
        <mesh position={[0, 0.76, -0.19]} scale={[0.92, 1.15, 0.18]} castShadow>
          <sphereGeometry args={[0.16, 18, 14]} />
          <meshStandardMaterial color="#faf6ee" roughness={0.75} />
        </mesh>
        {[[-0.16, -0.16], [0.16, -0.16], [-0.16, 0.16], [0.16, 0.16]].map(([lx, lz], i) => (
          <mesh key={i} position={[lx, 0.22, lz]} castShadow>
            <cylinderGeometry args={[0.02, 0.014, 0.44, 10]} />
            <meshStandardMaterial color="#b99b72" roughness={0.45} />
          </mesh>
        ))}
      </group>
    );
  }

  // Styles Chiavari (chiavari_bois, chiavari_or, chiavari_noire)
  const woodColor =
    kind === 'vip'
      ? '#d4af37'
      : chairStyle === 'chiavari_or'
      ? '#d6b46c'
      : chairStyle === 'chiavari_noire'
      ? '#232028'
      : '#be8a47';
  const metalness = chairStyle === 'chiavari_or' ? 0.65 : 0.08;
  const roughness = chairStyle === 'chiavari_or' ? 0.24 : 0.32;

  return (
    <group>
      <mesh position={[0, 0.435, 0]} castShadow>
        <boxGeometry args={[0.42, 0.032, 0.41]} />
        <meshStandardMaterial color={woodColor} roughness={roughness} metalness={metalness} />
      </mesh>
      <mesh position={[0, 0.468, 0.005]} castShadow receiveShadow>
        <boxGeometry args={[0.39, 0.038, 0.38]} />
        <meshStandardMaterial color="#fbfaf7" roughness={0.65} />
      </mesh>
      {[
        [-0.185, -0.18],
        [0.185, -0.18],
        [-0.185, 0.18],
        [0.185, 0.18],
      ].map(([lx, lz], i) => (
        <mesh key={`leg-${i}`} position={[lx, 0.22, lz]} castShadow>
          <cylinderGeometry args={[0.018, 0.014, 0.44, 12]} />
          <meshStandardMaterial color={woodColor} roughness={roughness} metalness={metalness} />
        </mesh>
      ))}
      {[-0.185, 0.185].map((lx, i) => (
        <mesh key={`side-str-${i}`} position={[lx, 0.16, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.01, 0.01, 0.36, 8]} />
          <meshStandardMaterial color={woodColor} roughness={roughness} metalness={metalness} />
        </mesh>
      ))}
      {[-0.18, 0.18].map((lz, i) => (
        <mesh key={`front-str-${i}`} position={[0, 0.18, lz]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.01, 0.01, 0.37, 8]} />
          <meshStandardMaterial color={woodColor} roughness={roughness} metalness={metalness} />
        </mesh>
      ))}
      {[-0.185, 0.185].map((bx, i) => (
        <group key={`post-${i}`} position={[bx, 0, -0.18]}>
          <mesh position={[0, 0.72, 0]} castShadow>
            <cylinderGeometry args={[0.018, 0.018, 0.56, 12]} />
            <meshStandardMaterial color={woodColor} roughness={roughness} metalness={metalness} />
          </mesh>
          {[0.56, 0.70, 0.84].map((ry, j) => (
            <mesh key={j} position={[0, ry, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.02, 0.005, 8, 16]} />
              <meshStandardMaterial color={woodColor} roughness={roughness} metalness={metalness} />
            </mesh>
          ))}
          <mesh position={[0, 1.015, 0]} castShadow>
            <sphereGeometry args={[0.026, 14, 14]} />
            <meshStandardMaterial color={woodColor} roughness={roughness} metalness={metalness} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.955, -0.18]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.016, 0.016, 0.37, 12]} />
        <meshStandardMaterial color={woodColor} roughness={roughness} metalness={metalness} />
      </mesh>
      <mesh position={[0, 0.87, -0.18]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.011, 0.011, 0.36, 10]} />
        <meshStandardMaterial color={woodColor} roughness={roughness} metalness={metalness} />
      </mesh>
      <mesh position={[0, 0.50, -0.18]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, 0.36, 10]} />
        <meshStandardMaterial color={woodColor} roughness={roughness} metalness={metalness} />
      </mesh>
      {[-0.115, -0.038, 0.038, 0.115].map((bx, i) => (
        <group key={`spindle-${i}`} position={[bx, 0, -0.18]}>
          <mesh position={[0, 0.685, 0]} castShadow>
            <cylinderGeometry args={[0.01, 0.01, 0.37, 10]} />
            <meshStandardMaterial color={woodColor} roughness={roughness} metalness={metalness} />
          </mesh>
          {[0.57, 0.65, 0.73, 0.80].map((ry, j) => (
            <mesh key={j} position={[0, ry, 0]} scale={[1, 0.65, 1]}>
              <sphereGeometry args={[0.015, 10, 8]} />
              <meshStandardMaterial color={woodColor} roughness={roughness} metalness={metalness} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
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
  photobooth360: { label: 'Photobooth 360°', color: '#7c6f9b', w: 1.7, d: 1.7, h: 1.4 },
  candy_bar: { label: 'Candy bar', color: '#d98fa0', w: 1.6, d: 0.9, h: 1.0 },
  estrade: { label: 'Estrade + cœurs', color: '#8a6fb8', w: 4.6, d: 2.6, h: 0.45 },
  allee: { label: 'Allée tapis blanc', color: '#f2eee8', w: 1.8, d: 5.0, h: 0.02 },
};

/* ---------- Photobooth 360° : vrai modèle GLB (CGTrader) ---------- */
// GLB unique avec textures embarquées : converti depuis obj.obj + texture.zip
// dans /public/photoboot 360/ via obj2gltf.
const PB360_URL = '/models/table-plan/photobooth360.glb';

function Photobooth360Model() {
  const { scene } = useGLTF(PB360_URL);
  const model = useMemo(() => {
    const inst = scene.clone(true);
    inst.traverse((c: any) => {
      if (!c.isMesh) return;
      c.castShadow = c.receiveShadow = true;
      // Leds/écrans : rendre les matériaux émissifs légèrement lumineux.
      const m = c.material;
      if (m?.name && /led|flash|tela|vidro/i.test(m.name)) {
        m.emissive = new THREE.Color('#ffffff');
        m.emissiveIntensity = 0.6;
      }
    });
    // Échelle : côté le plus large ramené à ~1.6 m, posé au sol, centré.
    const box = new THREE.Box3().setFromObject(inst);
    const size = box.getSize(new THREE.Vector3());
    const s = 1.6 / (Math.max(size.x, size.z) || 1);
    inst.scale.setScalar(s);
    const b2 = new THREE.Box3().setFromObject(inst);
    inst.position.set(-(b2.min.x + b2.max.x) / 2, -b2.min.y, -(b2.min.z + b2.max.z) / 2);
    return inst;
  }, [scene]);
  return <primitive object={model} />;
}

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
  // Photobooth 360° : vrai modèle CGTrader (OBJ + textures 4K), fallback procédural simple
  photobooth360: () => (
    <Suspense fallback={
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.7, 0.7, 1.4, 24]} />
        <meshStandardMaterial color="#7c6f9b" roughness={0.6} />
      </mesh>
    }>
      <Photobooth360Model />
    </Suspense>
  ),
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
  onRotate,
}: {
  obj: SceneObject;
  selected: boolean;
  onSelect: () => void;
  onDragStart: () => void;
  onMove: (x: number, z: number) => void;
  onDragEnd: () => void;
  onRotate?: (rotation: number) => void;
}) {
  const def = OBJECT_DEFS[obj.kind];
  const drag = useFloorDrag((x, z) => onMove(x, z), onDragEnd, onDragStart, obj.id, obj);
  const startRotateDrag = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!onRotate) return;
    const startX = e.clientX;
    const startRot = obj.rotation || 0;
    const move = (ev: PointerEvent) => {
      const delta = Math.round((ev.clientX - startX) * 0.8);
      onRotate(((startRot + delta) % 360 + 360) % 360);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
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
      <Html zIndexRange={[50, 0]} center position={[0, def.h + 0.55, 0]} distanceFactor={9} className="select-none">
        <div className="flex flex-col items-center gap-1.5">
          {selected && onRotate && (
            <div
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="pointer-events-auto flex items-center gap-1 rounded-full bg-[#4B4456]/95 text-white px-2 py-1 shadow-lg border border-white/20"
            >
              <button
                type="button"
                onClick={() => onRotate(((obj.rotation - 45) % 360 + 360) % 360)}
                title="Tourner de -45°"
                className="w-6 h-6 rounded-full bg-white/15 hover:bg-brand-turquoise text-[11px] font-bold flex items-center justify-center transition-colors"
              >
                ↺
              </button>
              <button
                type="button"
                onClick={() => onRotate(((obj.rotation - 15) % 360 + 360) % 360)}
                title="Tourner de -15°"
                className="px-1.5 h-6 rounded-full bg-white/10 hover:bg-white/25 text-[10px] font-semibold flex items-center justify-center transition-colors"
              >
                -15°
              </button>
              <span
                onPointerDown={startRotateDrag}
                title="Glissez horizontalement pour tourner librement"
                className="px-2 h-6 rounded-full bg-brand-turquoise text-white text-[10.5px] font-bold flex items-center justify-center cursor-ew-resize"
              >
                ⟳ {Math.round(obj.rotation || 0)}°
              </span>
              <button
                type="button"
                onClick={() => onRotate(((obj.rotation + 15) % 360 + 360) % 360)}
                title="Tourner de +15°"
                className="px-1.5 h-6 rounded-full bg-white/10 hover:bg-white/25 text-[10px] font-semibold flex items-center justify-center transition-colors"
              >
                +15°
              </button>
              <button
                type="button"
                onClick={() => onRotate(((obj.rotation + 45) % 360 + 360) % 360)}
                title="Tourner de +45°"
                className="w-6 h-6 rounded-full bg-white/15 hover:bg-brand-turquoise text-[11px] font-bold flex items-center justify-center transition-colors"
              >
                ↻
              </button>
            </div>
          )}
          <div className="pointer-events-none px-2.5 py-0.5 rounded-full bg-white/90 text-[11px] font-semibold text-[#4B4456] shadow whitespace-nowrap">
            {obj.label}
          </div>
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

/* ---------- Pied de table tourné (blanc, bois ou doré selon le style) ---------- */
function TurnedTableLeg({ x, z, color = '#f5f4f0', metalness = 0 }: { x: number; z: number; color?: string; metalness?: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.65, 0]} castShadow>
        <boxGeometry args={[0.095, 0.14, 0.095]} />
        <meshStandardMaterial color={color} roughness={0.38} metalness={metalness} />
      </mesh>
      <mesh position={[0, 0.54, 0]} scale={[1, 0.68, 1]} castShadow>
        <sphereGeometry args={[0.055, 16, 12]} />
        <meshStandardMaterial color={color} roughness={0.36} metalness={metalness} />
      </mesh>
      <mesh position={[0, 0.47, 0]} scale={[1, 0.75, 1]} castShadow>
        <sphereGeometry args={[0.05, 16, 12]} />
        <meshStandardMaterial color={color} roughness={0.36} metalness={metalness} />
      </mesh>
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.042, 0.032, 0.42, 16]} />
        <meshStandardMaterial color={color} roughness={0.38} metalness={metalness} />
      </mesh>
      <mesh position={[0, 0.05, 0]} scale={[1, 0.6, 1]}>
        <sphereGeometry args={[0.04, 14, 10]} />
        <meshStandardMaterial color={color} roughness={0.38} metalness={metalness} />
      </mesh>
    </group>
  );
}

function WoodTableSurface({ shape }: { shape: TableShape }) {
  const decor = useContext(DecorContext);
  const tableStyle: TableSurfaceStyle = decor.tableStyle || 'nappe';
  const clothColor = decor.clothColor || C.cloth;
  const woodTex = useMemo(() => getWoodTableTexture(), []);

  // Mode par défaut = Nappe longue drapée historique
  if (tableStyle === 'nappe') {
    if (shape === 'ronde') {
      return (
        <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.05, 1.1, 0.74, 48]} />
          <meshStandardMaterial color={clothColor} roughness={0.85} />
        </mesh>
      );
    }
    if (shape === 'carree') {
      return (
        <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.5, 0.74, 1.5]} />
          <meshStandardMaterial color={clothColor} roughness={0.85} />
        </mesh>
      );
    }
    if (shape === 'rectangle') {
      return (
        <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.7, 0.74, 1.15]} />
          <meshStandardMaterial color={clothColor} roughness={0.85} />
        </mesh>
      );
    }
    return (
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow scale={[1.45, 1, 0.75]}>
        <cylinderGeometry args={[1.05, 1.1, 0.74, 48]} />
        <meshStandardMaterial color={clothColor} roughness={0.85} />
      </mesh>
    );
  }

  // Variantes plateau apparent : bois_verni (photo), bois_chene, bois_noyer, marbre_or
  const topColor =
    tableStyle === 'bois_chene'
      ? '#d4ad7a'
      : tableStyle === 'bois_noyer'
      ? '#6b4429'
      : tableStyle === 'marbre_or'
      ? '#f7f6f4'
      : '#c46d38';
  const legColor =
    tableStyle === 'bois_chene'
      ? '#c59d68'
      : tableStyle === 'bois_noyer'
      ? '#242024'
      : tableStyle === 'marbre_or'
      ? '#d4af37'
      : '#f5f4f0';
  const legMetal = tableStyle === 'marbre_or' ? 0.75 : 0;

  const topMat = (
    <meshPhysicalMaterial
      map={tableStyle === 'marbre_or' ? undefined : woodTex || undefined}
      color={topColor}
      roughness={tableStyle === 'marbre_or' ? 0.12 : 0.22}
      metalness={tableStyle === 'marbre_or' ? 0.08 : 0.04}
      clearcoat={0.85}
      clearcoatRoughness={0.14}
    />
  );

  if (shape === 'ronde') {
    return (
      <group>
        <mesh position={[0, 0.76, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.12, 1.12, 0.042, 64]} />
          {topMat}
        </mesh>
        <mesh position={[0, 0.76, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[1.12, 0.022, 16, 64]} />
          {topMat}
        </mesh>
        <mesh position={[0, 0.782, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.055, 1.072, 64]} />
          <meshStandardMaterial color={tableStyle === 'marbre_or' ? '#d4af37' : '#7c3e18'} roughness={0.4} metalness={legMetal} />
        </mesh>
        <mesh position={[0, 0.705, 0]} castShadow>
          <cylinderGeometry args={[0.88, 0.88, 0.07, 40]} />
          <meshStandardMaterial color={legColor} roughness={0.4} metalness={legMetal} />
        </mesh>
        {[
          [-0.58, -0.58],
          [0.58, -0.58],
          [-0.58, 0.58],
          [0.58, 0.58],
        ].map(([lx, lz], i) => (
          <TurnedTableLeg key={i} x={lx} z={lz} color={legColor} metalness={legMetal} />
        ))}
      </group>
    );
  }

  if (shape === 'ovale') {
    return (
      <group>
        <group scale={[1.42, 1, 0.78]}>
          <mesh position={[0, 0.76, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[1.12, 1.12, 0.042, 64]} />
            {topMat}
          </mesh>
          <mesh position={[0, 0.76, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <torusGeometry args={[1.12, 0.022, 16, 64]} />
            {topMat}
          </mesh>
          <mesh position={[0, 0.705, 0]} castShadow>
            <cylinderGeometry args={[0.88, 0.88, 0.07, 40]} />
            <meshStandardMaterial color={legColor} roughness={0.4} metalness={legMetal} />
          </mesh>
        </group>
        {[
          [-0.85, -0.45],
          [0.85, -0.45],
          [-0.85, 0.45],
          [0.85, 0.45],
        ].map(([lx, lz], i) => (
          <TurnedTableLeg key={i} x={lx} z={lz} color={legColor} metalness={legMetal} />
        ))}
      </group>
    );
  }

  const w = shape === 'carree' ? 1.55 : 2.75;
  const d = shape === 'carree' ? 1.55 : 1.22;
  return (
    <group>
      <mesh position={[0, 0.76, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, 0.045, d]} />
        {topMat}
      </mesh>
      <mesh position={[0, 0.76, 0]} castShadow>
        <boxGeometry args={[w + 0.03, 0.026, d + 0.03]} />
        {topMat}
      </mesh>
      <mesh position={[0, 0.705, 0]} castShadow>
        <boxGeometry args={[w - 0.28, 0.07, d - 0.28]} />
        <meshStandardMaterial color={legColor} roughness={0.4} metalness={legMetal} />
      </mesh>
      {[
        [-(w / 2 - 0.22), -(d / 2 - 0.22)],
        [w / 2 - 0.22, -(d / 2 - 0.22)],
        [-(w / 2 - 0.22), d / 2 - 0.22],
        [w / 2 - 0.22, d / 2 - 0.22],
      ].map(([lx, lz], i) => (
        <TurnedTableLeg key={i} x={lx} z={lz} color={legColor} metalness={legMetal} />
      ))}
    </group>
  );
}

export const TABLE_SHAPES: Record<TableShape, ShapeDef> = {
  ronde: {
    label: 'Ronde',
    top: () => <WoodTableSurface shape="ronde" />,
    seats: (n) => ellipseSeats(1.62, 1.62)(n),
    placeOffset: 0.78,
    seatDist: 1.62,
  },
  carree: {
    label: 'Carrée',
    top: () => <WoodTableSurface shape="carree" />,
    seats: (n) => rectSeats(1.95, 1.95)(n),
    placeOffset: 0.56,
    seatDist: 1.0,
  },
  rectangle: {
    label: 'Rectangle',
    top: () => <WoodTableSurface shape="rectangle" />,
    seats: (n) => rectSeats(3.3, 1.85)(n),
    placeOffset: 0.85,
    seatDist: 1.0,
  },
  ovale: {
    label: 'Ovale',
    top: () => <WoodTableSurface shape="ovale" />,
    seats: (n) => ellipseSeats(2.05, 1.15)(n),
    placeOffset: 0.72,
    seatDist: 1.5,
  },
};

/* ---------- Table complète : draggable, sièges cliquables ---------- */
function Table3D({
  table,
  selected,
  assignTarget,
  guestName,
  childGuestIds = [],
  onSelect,
  onSeatClick,
  onDragStart,
  onMove,
  onDragEnd,
  onRotate,
}: {
  table: PlanTable;
  selected: boolean;
  /** Siège en cours d'assignation (anneau visible). */
  assignTarget: { tableId: string; seatIndex: number } | null;
  /** Résout guest_id → nom affiché. */
  guestName: (id: string) => string | undefined;
  childGuestIds?: string[];
  onSelect: (id: string) => void;
  onSeatClick: (tableId: string, seatIndex: number) => void;
  onDragStart: () => void;
  onMove: (id: string, x: number, z: number) => void;
  onDragEnd: () => void;
  onRotate?: (id: string, rotation: number) => void;
}) {
  const def = TABLE_SHAPES[table.shape];
  const seats = def.seats(table.seatCount);
  // Drag : pointerdown sur la table → suit le sol, lève le drag à pointerup.
  const drag = useFloorDrag((x, z) => onMove(table.id, x, z), onDragEnd, onDragStart, table.id, table);
  const startRotateDrag = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!onRotate) return;
    const startX = e.clientX;
    const startRot = table.rotation || 0;
    const move = (ev: PointerEvent) => {
      const delta = Math.round((ev.clientX - startX) * 0.8);
      onRotate(table.id, ((startRot + delta) % 360 + 360) % 360);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

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
            <Html zIndexRange={[40, 0]} center position={[0, 1.15, 0]} distanceFactor={10} className="pointer-events-none select-none">
              {name ? (
                <div className="px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-sm text-[10px] font-medium text-[#4B4456] shadow-sm whitespace-nowrap">
                  {seat?.guest_id && childGuestIds.includes(seat.guest_id) && (
                    <span title="Enfant" aria-label="Enfant" className="inline-flex align-middle mr-1">
                      <PersonStanding size={16} color="#ea580c" strokeWidth={2.5} aria-hidden="true" />
                    </span>
                  )}
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

      <Html zIndexRange={[50, 0]} center position={[0, 2.05, 0]} distanceFactor={9} className="select-none">
        <div className="flex flex-col items-center gap-1.5">
          {selected && onRotate && (
            <div
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="pointer-events-auto flex items-center gap-1 rounded-full bg-[#4B4456]/95 text-white px-2 py-1 shadow-lg border border-white/20"
            >
              <button
                type="button"
                onClick={() => onRotate(table.id, ((table.rotation - 45) % 360 + 360) % 360)}
                title="Tourner de -45°"
                className="w-6 h-6 rounded-full bg-white/15 hover:bg-brand-turquoise text-[11px] font-bold flex items-center justify-center transition-colors"
              >
                ↺
              </button>
              <button
                type="button"
                onClick={() => onRotate(table.id, ((table.rotation - 15) % 360 + 360) % 360)}
                title="Tourner de -15°"
                className="px-1.5 h-6 rounded-full bg-white/10 hover:bg-white/25 text-[10px] font-semibold flex items-center justify-center transition-colors"
              >
                -15°
              </button>
              <span
                onPointerDown={startRotateDrag}
                title="Glissez horizontalement pour tourner librement"
                className="px-2 h-6 rounded-full bg-brand-turquoise text-white text-[10.5px] font-bold flex items-center justify-center cursor-ew-resize"
              >
                ⟳ {Math.round(table.rotation || 0)}°
              </span>
              <button
                type="button"
                onClick={() => onRotate(table.id, ((table.rotation + 15) % 360 + 360) % 360)}
                title="Tourner de +15°"
                className="px-1.5 h-6 rounded-full bg-white/10 hover:bg-white/25 text-[10px] font-semibold flex items-center justify-center transition-colors"
              >
                +15°
              </button>
              <button
                type="button"
                onClick={() => onRotate(table.id, ((table.rotation + 45) % 360 + 360) % 360)}
                title="Tourner de +45°"
                className="w-6 h-6 rounded-full bg-white/15 hover:bg-brand-turquoise text-[11px] font-bold flex items-center justify-center transition-colors"
              >
                ↻
              </button>
            </div>
          )}
          <div
            className="pointer-events-none px-3 py-1 rounded-full text-[12px] font-semibold text-white shadow-md whitespace-nowrap"
            style={{ background: table.accent }}
          >
            {table.name} · {table.seats.filter((s) => s.guest_id).length}/{table.seatCount}
          </div>
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
  childGuestIds = [],
  onSelectTable,
  onSeatClick,
  onMoveTable,
  onMoveObject,
  onRotateTable,
  onRotateObject,
  walkMode,
  tour,
  onTourEnd,
  flyTo,
  camRef,
  room,
  decor,
  captureNonce,
  onCaptureViews,
  mood,
}: {
  tables: PlanTable[];
  objects: SceneObject[];
  selectedId: string | null;
  assignTarget: { tableId: string; seatIndex: number } | null;
  guestName: (id: string) => string | undefined;
  childGuestIds?: string[];
  onSelectTable: (id: string | null) => void;
  onSeatClick: (tableId: string, seatIndex: number) => void;
  onMoveTable: (id: string, x: number, z: number) => void;
  onMoveObject: (id: string, x: number, z: number) => void;
  onRotateTable?: (id: string, rotation: number) => void;
  onRotateObject?: (id: string, rotation: number) => void;
  walkMode?: boolean;
  tour?: boolean;
  onTourEnd?: () => void;
  flyTo?: { pos: [number, number, number]; look: [number, number, number] } | null;
  camRef?: React.MutableRefObject<{ x: number; z: number; dir: number } | null>;
  room?: { width: number; length: number };
  decor?: DecorConfig;
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
      <DecorContext.Provider value={decor || DEFAULT_DECOR}>
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
            onRotate={onRotateObject ? (rot) => onRotateObject(o.id, rot) : undefined}
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
            childGuestIds={childGuestIds}
            onSelect={onSelectTable}
            onSeatClick={onSeatClick}
            onDragStart={() => setDragging(true)}
            onMove={onMoveTable}
            onDragEnd={() => setDragging(false)}
            onRotate={onRotateTable}
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
      </DecorContext.Provider>
    </div>
  );
}
