'use client';

/**
 * DecorModel — charge un modèle GLTF depuis /public/models/table-plan/.
 * Si le fichier n'existe pas ou échoue, on retombe sur le rendu
 * procédural passé en `fallback` (jamais d'écran cassé).
 *
 * Convention : /public/models/table-plan/{key}.glb
 * Ex. : chair.glb, flower.glb, chandelier.glb
 */

import { Component, Suspense, useMemo, type ReactNode } from 'react';
import { useGLTF, Clone } from '@react-three/drei';

/** Registry des pièces décoratives → URL publique + réglages. */
export const DECOR_MODELS = {
  chair: { url: '/models/table-plan/chair.glb', scale: 1 },
  flower: { url: '/models/table-plan/flower.glb', scale: 1 },
  chandelier: { url: '/models/table-plan/chandelier.glb', scale: 1 },
} as const;

export type DecorKey = keyof typeof DECOR_MODELS;

/** Boundary : échec de load GLB → rendu procédural. */
class GltfBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function Gltf({ url, scale }: { url: string; scale: number }) {
  const { scene } = useGLTF(url);
  // Clone pour instancer le même modèle plusieurs fois sans conflit.
  const cloned = useMemo(() => scene.clone(true), [scene]);
  return <Clone object={cloned} scale={scale} castShadow receiveShadow />;
}

export function DecorModel({
  decor,
  fallback,
  position,
  rotation,
  scale,
}: {
  decor: DecorKey;
  fallback: ReactNode;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}) {
  const def = DECOR_MODELS[decor];
  return (
    <group position={position} rotation={rotation}>
      <GltfBoundary fallback={fallback}>
        <Suspense fallback={fallback}>
          <Gltf url={def.url} scale={def.scale * (scale || 1)} />
        </Suspense>
      </GltfBoundary>
    </group>
  );
}
