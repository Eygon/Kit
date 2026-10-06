import * as THREE from "three";
import { VISUAL_CONFIG } from "@/config/visualConfig";
import { createRandom } from "@/logic/random";

export type DustParticles = {
  update: (cameraPosition: Readonly<THREE.Vector3>, frameS: number) => void;
  dispose: () => void;
};

const DUST = VISUAL_CONFIG.DUST;
const AXES = 3;
const SPRITE_STOPS = { CORE: 0, EDGE: 1 };

const spriteTexture = (): THREE.CanvasTexture => {
  const canvas = document.createElement("canvas");
  canvas.width = DUST.SPRITE_SIZE_PX;
  canvas.height = DUST.SPRITE_SIZE_PX;
  const context = canvas.getContext("2d");
  if (context) {
    const half = DUST.SPRITE_SIZE_PX / 2;
    const gradient = context.createRadialGradient(half, half, 0, half, half, half);
    gradient.addColorStop(SPRITE_STOPS.CORE, "rgba(255,255,255,1)");
    gradient.addColorStop(SPRITE_STOPS.EDGE, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, DUST.SPRITE_SIZE_PX, DUST.SPRITE_SIZE_PX);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const wrapAround = (value: number, center: number): number => value - DUST.BOX_M * Math.round((value - center) / DUST.BOX_M);

export const createDustParticles = (scene: THREE.Scene): DustParticles => {
  const random = createRandom(DUST.SEED);
  const positions = new Float32Array(DUST.COUNT * AXES);
  const speeds = new Float32Array(DUST.COUNT);
  for (let index = 0; index < DUST.COUNT; index++) {
    for (let axis = 0; axis < AXES; axis++) positions[index * AXES + axis] = random.range(-DUST.BOX_M / 2, DUST.BOX_M / 2);
    speeds[index] = random.range(DUST.SPEED_JITTER_MIN, DUST.SPEED_JITTER_MAX);
  }
  const geometry = new THREE.BufferGeometry();
  const attribute = new THREE.BufferAttribute(positions, AXES);
  attribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("position", attribute);
  const map = spriteTexture();
  const material = new THREE.PointsMaterial({ color: DUST.COLOR, size: DUST.SIZE_M, map, transparent: true, opacity: DUST.OPACITY, depthWrite: false, sizeAttenuation: true });
  const points = new THREE.Points(geometry, material);
  points.name = "dust";
  points.frustumCulled = false;
  scene.add(points);

  const update: DustParticles["update"] = (cameraPosition, frameS) => {
    const stepS = Math.max(0, frameS);
    for (let index = 0; index < DUST.COUNT; index++) {
      const speed = (speeds[index] as number) * stepS;
      const base = index * AXES;
      positions[base] = wrapAround((positions[base] as number) + DUST.DRIFT_MPS.x * speed, cameraPosition.x);
      positions[base + 1] = wrapAround((positions[base + 1] as number) + DUST.DRIFT_MPS.y * speed, cameraPosition.y);
      positions[base + 2] = wrapAround((positions[base + 2] as number) + DUST.DRIFT_MPS.z * speed, cameraPosition.z);
    }
    attribute.needsUpdate = true;
  };

  const dispose = (): void => {
    scene.remove(points);
    geometry.dispose();
    material.dispose();
    map.dispose();
  };

  return { update, dispose };
};
