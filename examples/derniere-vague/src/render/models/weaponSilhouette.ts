import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { WeaponId } from "@/config/weaponConfig";
import { VISUAL_CONFIG } from "@/config/visualConfig";
import type { SilhouettePartSpec } from "@/config/visualConfig";

const QUARTER_TURN = Math.PI / 2;

const partGeometry = (part: SilhouettePartSpec): THREE.BufferGeometry => {
  const { size, position } = part;
  const geometry =
    part.shape === "box" ? new THREE.BoxGeometry(size.x, size.y, size.z) : new THREE.CylinderGeometry(size.y, size.y, size.x, VISUAL_CONFIG.WALL_BUY.SILHOUETTE_SEGMENTS).rotateZ(QUARTER_TURN);
  return geometry.rotateZ(part.tiltZ).translate(position.x, position.y, position.z);
};

export const createWeaponSilhouette = (weaponId: WeaponId): THREE.BufferGeometry => {
  const geometries = VISUAL_CONFIG.WALL_BUY.SILHOUETTES[weaponId].map(partGeometry);
  const merged = mergeGeometries(geometries);
  if (!merged) throw new Error(`cannot merge silhouette ${weaponId}`);
  geometries.forEach((geometry) => geometry.dispose());
  return merged;
};
