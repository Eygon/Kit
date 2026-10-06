import * as THREE from "three";
import { STATION_LAYOUT } from "@/config/mapConfig";
import { VISUAL_CONFIG } from "@/config/visualConfig";
import type { GameEvent } from "@/logic/game/gameEvents";
import type { StationLayout } from "@/logic/map/stationLayout";
import { createRandom } from "@/logic/random";
import type { Random } from "@/logic/random";
import type { Horde } from "@/logic/zombies/zombieHorde";
import { segmentFrame } from "@/render/map/buildStation";
import type { SegmentFrame } from "@/render/map/buildStation";

export type BloodDecals = {
  update: (events: readonly GameEvent[], horde: Readonly<Horde>) => void;
  dispose: () => void;
};

const DECAL = VISUAL_CONFIG.BLOOD_DECAL;
const TEXTURE = DECAL.TEXTURE;
const FLAT_ROTATION_X = -Math.PI / 2;
const FULL_TURN_RAD = Math.PI * 2;
const HALF_THICKNESS_M = STATION_LAYOUT.WALL_THICKNESS_M / 2;

const paintBlotch = (context: CanvasRenderingContext2D, random: Random, centerPx: number, color: string, radiusPx: number, reachPx: number): void => {
  const angle = random.range(0, FULL_TURN_RAD);
  const distance = random.range(0, reachPx);
  const x = centerPx + Math.cos(angle) * distance;
  const y = centerPx + Math.sin(angle) * distance;
  const gradient = context.createRadialGradient(x, y, 0, x, y, radiusPx);
  gradient.addColorStop(0, `rgba(${color},0.95)`);
  gradient.addColorStop(1, `rgba(${color},0)`);
  context.fillStyle = gradient;
  context.fillRect(x - radiusPx, y - radiusPx, radiusPx * 2, radiusPx * 2);
};

const paintBlood = (context: CanvasRenderingContext2D): void => {
  const random = createRandom(TEXTURE.SEED);
  const sizePx = TEXTURE.SIZE_PX;
  const centerPx = sizePx / 2;
  for (let index = 0; index < TEXTURE.BLOTCH_COUNT; index++) {
    const color = index % 2 === 0 ? TEXTURE.DARK_COLOR : TEXTURE.LIGHT_COLOR;
    paintBlotch(context, random, centerPx, color, sizePx * TEXTURE.CORE_RADIUS_RATIO, sizePx * TEXTURE.SPREAD_RATIO);
  }
  for (let index = 0; index < TEXTURE.SPLATTER_COUNT; index++) {
    paintBlotch(context, random, centerPx, TEXTURE.DARK_COLOR, random.range(1, sizePx * TEXTURE.MAX_SPLATTER_RATIO), sizePx / 2);
  }
};

const bloodTexture = (): THREE.CanvasTexture => {
  const canvas = document.createElement("canvas");
  canvas.width = TEXTURE.SIZE_PX;
  canvas.height = TEXTURE.SIZE_PX;
  const context = canvas.getContext("2d");
  if (context) paintBlood(context);
  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

export const createBloodDecals = (scene: THREE.Scene, layout: StationLayout): BloodDecals => {
  const random = createRandom(DECAL.SEED);
  const frames: SegmentFrame[] = layout.segments.map((segment) => segmentFrame(segment));
  const map = bloodTexture();
  const geometry = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.MeshStandardMaterial({
    map,
    transparent: true,
    opacity: DECAL.OPACITY,
    roughness: DECAL.ROUGHNESS,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const group = new THREE.Group();
  group.name = "bloodDecals";
  const pool: THREE.Mesh[] = [];
  for (let index = 0; index < DECAL.POOL_SIZE; index++) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.visible = false;
    pool.push(mesh);
    group.add(mesh);
  }
  scene.add(group);

  let nextIndex = 0;

  const takeOldest = (): THREE.Mesh => {
    const mesh = pool[nextIndex] as THREE.Mesh;
    nextIndex = (nextIndex + 1) % pool.length;
    const size = random.range(DECAL.MIN_SIZE_M, DECAL.MAX_SIZE_M);
    mesh.scale.set(size, size, 1);
    mesh.visible = true;
    return mesh;
  };

  const placeOnFloor = (x: number, z: number): void => {
    const mesh = takeOldest();
    mesh.position.set(x, DECAL.FLOOR_Y_M, z);
    mesh.rotation.set(FLAT_ROTATION_X, 0, random.range(0, FULL_TURN_RAD), "XYZ");
  };

  const placeOnWall = (x: number, z: number): void => {
    let bestIndex = -1;
    let bestDistanceM: number = DECAL.WALL_RANGE_M;
    let bestX = 0;
    let bestZ = 0;
    let bestSide = 1;
    for (let index = 0; index < frames.length; index++) {
      const frame = frames[index] as SegmentFrame;
      const dirX = Math.cos(frame.rotationY);
      const dirZ = -Math.sin(frame.rotationY);
      const alongM = Math.max(-frame.lengthM / 2, Math.min(frame.lengthM / 2, (x - frame.midX) * dirX + (z - frame.midZ) * dirZ));
      const closestX = frame.midX + dirX * alongM;
      const closestZ = frame.midZ + dirZ * alongM;
      const distanceM = Math.hypot(x - closestX, z - closestZ);
      if (distanceM > bestDistanceM) continue;
      bestIndex = index;
      bestDistanceM = distanceM;
      bestX = closestX;
      bestZ = closestZ;
      bestSide = (x - closestX) * Math.sin(frame.rotationY) + (z - closestZ) * Math.cos(frame.rotationY) < 0 ? -1 : 1;
    }
    const frame = frames[bestIndex];
    if (!frame) return;
    const normalX = Math.sin(frame.rotationY) * bestSide;
    const normalZ = Math.cos(frame.rotationY) * bestSide;
    const mesh = takeOldest();
    const offsetM = HALF_THICKNESS_M + DECAL.WALL_OFFSET_M;
    mesh.position.set(bestX + normalX * offsetM, DECAL.WALL_Y_M + random.range(-DECAL.WALL_Y_JITTER_M, DECAL.WALL_Y_JITTER_M), bestZ + normalZ * offsetM);
    mesh.rotation.set(0, Math.atan2(normalX, normalZ), random.range(0, FULL_TURN_RAD), "XYZ");
  };

  const update: BloodDecals["update"] = (events, horde) => {
    for (const event of events) {
      if (event.kind !== "zombieHit") continue;
      const zombie = horde.zombies[event.id];
      if (!zombie) continue;
      placeOnFloor(zombie.x, zombie.z);
      placeOnWall(zombie.x, zombie.z);
    }
  };

  const dispose = (): void => {
    scene.remove(group);
    geometry.dispose();
    material.dispose();
    map.dispose();
  };

  return { update, dispose };
};
