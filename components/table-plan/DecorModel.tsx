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
import * as THREE from 'three';

/** Registry des pièces décoratives → URL publique + réglages.
 * `fit` = taille cible (m) du plus grand côté : normalise tout modèle
 * téléchargé quelles que soient ses unités d'origine. */
export const DECOR_MODELS = {
  chair: { url: '/models/table-plan/chair.gltf', scale: 1 },
  flower: { url: '/models/table-plan/flower.glb', scale: 1, fit: 0.42 },
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

function Gltf({ url, scale, fit }: { url: string; scale: number; fit?: number }) {
  const { scene } = useGLTF(url);
  // Clone pour instancer le même modèle plusieurs fois sans conflit,
  // puis normalisation bounding-box si `fit` est défini.
  const cloned = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((m: any) => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; } });
    if (fit) {
      const box = new THREE.Box3().setFromObject(c);
      const size = box.getSize(new THREE.Vector3());
      const k = fit / (Math.max(size.x, size.y, size.z) || 1);
      c.scale.setScalar(k);
      const b2 = new THREE.Box3().setFromObject(c);
      c.position.set(-(b2.min.x + b2.max.x) / 2, -b2.min.y, -(b2.min.z + b2.max.z) / 2);
      const g = new THREE.Group();
      g.add(c);
      return g;
    }
    return c;
  }, [scene, fit]);
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
          <Gltf url={def.url} scale={def.scale * (scale || 1)} fit={'fit' in def ? def.fit : undefined} />
        </Suspense>
      </GltfBoundary>
    </group>
  );
}
