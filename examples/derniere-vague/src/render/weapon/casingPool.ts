import * as THREE from "three";
import { VISUAL_CONFIG } from "@/config/visualConfig";

export type CasingPool = {
  eject: (x: number, y: number, z: number) => void;
  update: (frameS: number) => void;
};

const CASING = VISUAL_CONFIG.VIEW_MODEL.CASING;

export const createCasingPool = (parent: THREE.Object3D): CasingPool => {
  const geometry = new THREE.CylinderGeometry(CASING.RADIUS_M, CASING.RADIUS_M, CASING.LENGTH_M, CASING.RADIAL_SEGMENTS);
  const material = new THREE.MeshStandardMaterial({ color: CASING.COLOR, metalness: CASING.METALNESS, roughness: CASING.ROUGHNESS });
  const meshes: THREE.Mesh[] = [];
  const velocityX = new Float32Array(CASING.POOL_SIZE);
  const velocityY = new Float32Array(CASING.POOL_SIZE);
  const velocityZ = new Float32Array(CASING.POOL_SIZE);
  const ageS = new Float32Array(CASING.POOL_SIZE);
  for (let index = 0; index < CASING.POOL_SIZE; index++) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = "casing";
    mesh.visible = false;
    meshes.push(mesh);
    parent.add(mesh);
  }
  let cursor = 0;

  const eject: CasingPool["eject"] = (x, y, z) => {
    const mesh = meshes[cursor];
    if (!mesh) return;
    mesh.position.set(x, y, z);
    mesh.rotation.set(0, 0, 0);
    mesh.visible = true;
    velocityX[cursor] = CASING.EJECT_DIRECTION.x * CASING.EJECT_SPEED_MPS;
    velocityY[cursor] = CASING.EJECT_DIRECTION.y * CASING.EJECT_SPEED_MPS;
    velocityZ[cursor] = CASING.EJECT_DIRECTION.z * CASING.EJECT_SPEED_MPS;
    ageS[cursor] = 0;
    cursor = (cursor + 1) % CASING.POOL_SIZE;
  };

  const update: CasingPool["update"] = (frameS) => {
    for (let index = 0; index < meshes.length; index++) {
      const mesh = meshes[index];
      if (!mesh || !mesh.visible) continue;
      ageS[index] = (ageS[index] ?? 0) + frameS;
      if ((ageS[index] ?? 0) >= CASING.LIFETIME_S) {
        mesh.visible = false;
        continue;
      }
      velocityY[index] = (velocityY[index] ?? 0) - CASING.GRAVITY_MPS2 * frameS;
      mesh.position.x += (velocityX[index] ?? 0) * frameS;
      mesh.position.y += (velocityY[index] ?? 0) * frameS;
      mesh.position.z += (velocityZ[index] ?? 0) * frameS;
      mesh.rotation.x += CASING.SPIN_RAD_S * frameS;
    }
  };

  return { eject, update };
};
