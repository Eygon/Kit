import * as THREE from "three";
import { DOOR_VISUAL, VISUAL_CONFIG } from "@/config/visualConfig";
import { tiledBoxGeometry } from "@/render/map/buildStation";
import { STATION_LAYOUT } from "@/config/mapConfig";
import { surfaceTexture } from "@/render/textures/surfaceTexture";

export type DoorParts = {
  readonly debrisMaterial: THREE.MeshStandardMaterial;
  readonly slabMaterial: THREE.MeshStandardMaterial;
  readonly barMaterial: THREE.MeshStandardMaterial;
  readonly materials: readonly THREE.Material[];
  readonly track: (geometry: THREE.BufferGeometry) => THREE.BufferGeometry;
  readonly dispose: () => void;
};

export type DebrisPile = {
  readonly group: THREE.Group;
  readonly pieces: readonly { readonly mesh: THREE.Mesh; readonly index: number }[];
};

export type SlidingDoor = {
  readonly group: THREE.Group;
  readonly slab: THREE.Mesh;
  readonly slideM: number;
};

const DEBRIS = DOOR_VISUAL.DEBRIS;
const SLIDING = DOOR_VISUAL.SLIDING;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
const mix = (from: number, to: number, ratio: number): number => from + (to - from) * ratio;

export const createDoorParts = (): DoorParts => {
  const wood = surfaceTexture("wood", VISUAL_CONFIG.WOOD_TEXTURE, 1, 1);
  const debrisMaterial = new THREE.MeshStandardMaterial({ color: DEBRIS.TINT, roughness: VISUAL_CONFIG.WOOD_ROUGHNESS, map: wood });
  const slabMaterial = new THREE.MeshStandardMaterial({ color: SLIDING.SLAB_TINT, roughness: VISUAL_CONFIG.WOOD_ROUGHNESS, map: wood });
  const barMaterial = new THREE.MeshStandardMaterial({ color: SLIDING.BAR_TINT, roughness: SLIDING.BAR_ROUGHNESS, metalness: SLIDING.BAR_METALNESS, map: wood });
  const materials = [debrisMaterial, slabMaterial, barMaterial];
  const geometries: THREE.BufferGeometry[] = [];
  const track = (geometry: THREE.BufferGeometry): THREE.BufferGeometry => {
    geometries.push(geometry);
    return geometry;
  };
  const dispose = (): void => {
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
  };
  return { debrisMaterial, slabMaterial, barMaterial, materials, track, dispose };
};

export const buildDebrisPile = (parts: DoorParts): DebrisPile => {
  const group = new THREE.Group();
  const pieces = DEBRIS.PIECES.map((spec, index) => {
    const mesh = new THREE.Mesh(parts.track(tiledBoxGeometry(spec.size.x, spec.size.y, spec.size.z)), parts.debrisMaterial);
    mesh.name = `debris${index}`;
    group.add(mesh);
    return { mesh, index };
  });
  const pile: DebrisPile = { group, pieces };
  poseDebrisPile(pile, 0);
  return pile;
};

export const poseDebrisPile = (pile: DebrisPile, progress: number): void => {
  for (const piece of pile.pieces) {
    const spec = DEBRIS.PIECES[piece.index];
    if (!spec) continue;
    const eased = clamp01((progress - spec.fallDelay) / (1 - spec.fallDelay)) ** DEBRIS.FALL_EASE_POWER;
    piece.mesh.position.set(spec.position.x, mix(spec.position.y, DEBRIS.REST_Y_M, eased), spec.position.z + spec.driftZ * eased);
    piece.mesh.rotation.set(spec.spin.x * eased, spec.spin.y * eased, spec.tiltZ + spec.spin.z * eased);
  }
  pile.group.visible = progress < 1;
};

export const buildSlidingDoor = (parts: DoorParts, passageM: number): SlidingDoor => {
  const widthM = passageM + SLIDING.OVERLAP_M * 2;
  const heightM = STATION_LAYOUT.WALL_HEIGHT_M;
  const slab = new THREE.Mesh(parts.track(tiledBoxGeometry(widthM, heightM, SLIDING.THICKNESS_M)), parts.slabMaterial);
  slab.name = "doorSlab";
  const barGeometry = parts.track(tiledBoxGeometry(widthM, SLIDING.BAR_HEIGHT_M, SLIDING.BAR_DEPTH_M));
  const barZ = (SLIDING.THICKNESS_M + SLIDING.BAR_DEPTH_M) / 2;
  for (const barY of SLIDING.BAR_HEIGHTS_M) {
    const bar = new THREE.Mesh(barGeometry, parts.barMaterial);
    bar.name = "doorBar";
    bar.position.set(0, barY - heightM / 2, barZ);
    slab.add(bar);
  }
  const handle = new THREE.Mesh(parts.track(new THREE.CylinderGeometry(SLIDING.HANDLE_RADIUS_M, SLIDING.HANDLE_RADIUS_M, SLIDING.HANDLE_LENGTH_M, SLIDING.HANDLE_SEGMENTS)), parts.barMaterial);
  handle.name = "doorHandle";
  handle.position.set(SLIDING.HANDLE_X_M, SLIDING.HANDLE_Y_M - heightM / 2, barZ + SLIDING.HANDLE_OUT_M);
  slab.add(handle);
  const group = new THREE.Group();
  group.add(slab);
  const door: SlidingDoor = { group, slab, slideM: passageM + SLIDING.OVERLAP_M + SLIDING.CLEARANCE_M };
  poseSlidingDoor(door, 0);
  return door;
};

export const poseSlidingDoor = (door: SlidingDoor, progress: number): void => {
  const out = clamp01(progress / SLIDING.OUT_RATIO) ** SLIDING.EASE_POWER;
  const slide = clamp01((progress - SLIDING.OUT_RATIO) / (1 - SLIDING.OUT_RATIO)) ** SLIDING.EASE_POWER;
  door.slab.position.set(slide * door.slideM, STATION_LAYOUT.WALL_HEIGHT_M / 2, out * SLIDING.OUT_PUSH_M);
};
