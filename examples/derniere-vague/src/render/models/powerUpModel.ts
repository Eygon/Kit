import * as THREE from "three";
import { POWER_UP_KINDS } from "@/config/powerUpConfig";
import type { PowerUpKind } from "@/config/powerUpConfig";
import { VISUAL_CONFIG } from "@/config/visualConfig";

export type PowerUpModel = {
  readonly build: (kind: PowerUpKind) => THREE.Group;
  readonly dispose: () => void;
};

type Part = { readonly geometry: THREE.BufferGeometry; readonly x: number; readonly tiltX: number };

const POWER_UP = VISUAL_CONFIG.POWER_UP;

const createMaterial = (kind: PowerUpKind): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({
    color: POWER_UP.COLORS[kind],
    emissive: POWER_UP.COLORS[kind],
    emissiveIntensity: POWER_UP.EMISSIVE_INTENSITY,
    roughness: POWER_UP.ROUGHNESS,
    metalness: POWER_UP.METALNESS,
  });

const createParts = (): Record<PowerUpKind, readonly Part[]> => {
  const { MAX_AMMO, INSTA_KILL, DOUBLE_POINTS, NUKE, SEGMENTS, UPRIGHT_RAD } = POWER_UP;
  const coin = new THREE.CylinderGeometry(DOUBLE_POINTS.RADIUS_M, DOUBLE_POINTS.RADIUS_M, DOUBLE_POINTS.THICKNESS_M, SEGMENTS);
  return {
    maxAmmo: [{ geometry: new THREE.BoxGeometry(MAX_AMMO.WIDTH_M, MAX_AMMO.HEIGHT_M, MAX_AMMO.DEPTH_M), x: 0, tiltX: 0 }],
    instaKill: [{ geometry: new THREE.OctahedronGeometry(INSTA_KILL.RADIUS_M), x: 0, tiltX: 0 }],
    doublePoints: [
      { geometry: coin, x: -DOUBLE_POINTS.OFFSET_X_M, tiltX: UPRIGHT_RAD },
      { geometry: coin, x: DOUBLE_POINTS.OFFSET_X_M, tiltX: UPRIGHT_RAD },
    ],
    nuke: [
      { geometry: new THREE.SphereGeometry(NUKE.RADIUS_M, SEGMENTS, SEGMENTS), x: 0, tiltX: 0 },
      { geometry: new THREE.TorusGeometry(NUKE.RING_RADIUS_M, NUKE.RING_TUBE_M, SEGMENTS, SEGMENTS), x: 0, tiltX: UPRIGHT_RAD },
    ],
  };
};

export const createPowerUpModel = (): PowerUpModel => {
  const parts = createParts();
  const materials = Object.fromEntries(POWER_UP_KINDS.map((kind) => [kind, createMaterial(kind)])) as Record<PowerUpKind, THREE.MeshStandardMaterial>;

  const build = (kind: PowerUpKind): THREE.Group => {
    const token = new THREE.Group();
    token.name = `powerUp-${kind}`;
    for (const part of parts[kind]) {
      const mesh = new THREE.Mesh(part.geometry, materials[kind]);
      mesh.position.x = part.x;
      mesh.rotation.x = part.tiltX;
      token.add(mesh);
    }
    token.scale.setScalar(POWER_UP.SCALE);
    return token;
  };

  const dispose = (): void => {
    new Set(Object.values(parts).flatMap((list) => list.map((part) => part.geometry))).forEach((geometry) => geometry.dispose());
    Object.values(materials).forEach((material) => material.dispose());
  };

  return { build, dispose };
};
