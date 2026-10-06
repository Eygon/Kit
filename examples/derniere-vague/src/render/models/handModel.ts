import * as THREE from "three";
import { VISUAL_CONFIG } from "@/config/visualConfig";
import type { HandPartSpec } from "@/config/visualConfig";

const HAND = VISUAL_CONFIG.VIEW_MODEL.HAND;

const geometryKey = (spec: HandPartSpec): string => `${spec.kind}:${spec.size.x}:${spec.size.y}:${spec.size.z}`;

const buildGeometry = (spec: HandPartSpec): THREE.BufferGeometry =>
  spec.kind === "box"
    ? new THREE.BoxGeometry(spec.size.x, spec.size.y, spec.size.z)
    : new THREE.CapsuleGeometry(spec.size.x, spec.size.y, HAND.CAPSULE_CAP_SEGMENTS, HAND.CAPSULE_RADIAL_SEGMENTS);

export const buildGlovedHand = (): THREE.Group => {
  const group = new THREE.Group();
  group.name = "glovedHand";
  const material = new THREE.MeshStandardMaterial({ color: HAND.GLOVE_COLOR, roughness: HAND.GLOVE_ROUGHNESS });
  const geometries = new Map<string, THREE.BufferGeometry>();
  for (const spec of HAND.PARTS) {
    const key = geometryKey(spec);
    const geometry = geometries.get(key) ?? buildGeometry(spec);
    geometries.set(key, geometry);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = spec.name;
    mesh.position.set(spec.position.x, spec.position.y, spec.position.z);
    mesh.rotation.set(spec.rotation.x, spec.rotation.y, spec.rotation.z);
    group.add(mesh);
  }
  return group;
};
