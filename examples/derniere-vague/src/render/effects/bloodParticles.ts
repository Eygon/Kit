import * as THREE from "three";
import { VISUAL_CONFIG } from "@/config/visualConfig";
import { createRandom } from "@/logic/random";

export type BloodParticles = {
  emit: (x: number, y: number, z: number, count: number) => void;
  update: (frameS: number) => void;
  setDensity: (factor: number) => void;
  dispose: () => void;
};

const BLOOD = VISUAL_CONFIG.BLOOD_PARTICLES;
const AXES = 3;
const FULL_TURN_RAD = Math.PI * 2;
const SPRITE_STOPS = { CORE: 0, EDGE: 1 };

const spriteTexture = (): THREE.CanvasTexture => {
  const canvas = document.createElement("canvas");
  canvas.width = BLOOD.SPRITE_SIZE_PX;
  canvas.height = BLOOD.SPRITE_SIZE_PX;
  const context = canvas.getContext("2d");
  if (context) {
    const half = BLOOD.SPRITE_SIZE_PX / 2;
    const gradient = context.createRadialGradient(half, half, 0, half, half, half);
    gradient.addColorStop(SPRITE_STOPS.CORE, "rgba(255,255,255,1)");
    gradient.addColorStop(SPRITE_STOPS.EDGE, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, BLOOD.SPRITE_SIZE_PX, BLOOD.SPRITE_SIZE_PX);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

export const createBloodParticles = (scene: THREE.Scene): BloodParticles => {
  const random = createRandom(BLOOD.SEED);
  const positions = new Float32Array(BLOOD.POOL_SIZE * AXES);
  const velocities = new Float32Array(BLOOD.POOL_SIZE * AXES);
  const remainingS = new Float32Array(BLOOD.POOL_SIZE);
  for (let index = 0; index < BLOOD.POOL_SIZE; index++) positions[index * AXES + 1] = BLOOD.HIDDEN_Y_M;
  const geometry = new THREE.BufferGeometry();
  const attribute = new THREE.BufferAttribute(positions, AXES);
  attribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("position", attribute);
  const map = spriteTexture();
  const material = new THREE.PointsMaterial({ color: BLOOD.COLOR, size: BLOOD.SIZE_M, map, transparent: true, opacity: BLOOD.OPACITY, depthWrite: false, sizeAttenuation: true });
  const points = new THREE.Points(geometry, material);
  points.name = "bloodParticles";
  points.frustumCulled = false;
  scene.add(points);

  let nextIndex = 0;
  let density = 1;

  const spawn = (x: number, y: number, z: number): void => {
    const base = nextIndex * AXES;
    const angle = random.range(0, FULL_TURN_RAD);
    const speed = random.range(BLOOD.SPEED_MPS.MIN, BLOOD.SPEED_MPS.MAX);
    positions[base] = x;
    positions[base + 1] = y;
    positions[base + 2] = z;
    velocities[base] = Math.cos(angle) * speed;
    velocities[base + 1] = random.range(BLOOD.CLIMB_MPS.MIN, BLOOD.CLIMB_MPS.MAX);
    velocities[base + 2] = Math.sin(angle) * speed;
    remainingS[nextIndex] = random.range(BLOOD.LIFETIME_S.MIN, BLOOD.LIFETIME_S.MAX);
    nextIndex = (nextIndex + 1) % BLOOD.POOL_SIZE;
  };

  const hide = (index: number): void => {
    positions[index * AXES + 1] = BLOOD.HIDDEN_Y_M;
    remainingS[index] = 0;
  };

  const emit: BloodParticles["emit"] = (x, y, z, count) => {
    const total = Math.round(count * density);
    for (let burst = 0; burst < total; burst++) spawn(x, y, z);
    attribute.needsUpdate = true;
  };

  const update: BloodParticles["update"] = (frameS) => {
    const stepS = Math.max(0, frameS);
    if (stepS === 0) return;
    for (let index = 0; index < BLOOD.POOL_SIZE; index++) {
      const left = remainingS[index] as number;
      if (left <= 0) continue;
      const base = index * AXES;
      velocities[base + 1] = (velocities[base + 1] as number) - BLOOD.GRAVITY_MPS2 * stepS;
      positions[base] = (positions[base] as number) + (velocities[base] as number) * stepS;
      positions[base + 1] = (positions[base + 1] as number) + (velocities[base + 1] as number) * stepS;
      positions[base + 2] = (positions[base + 2] as number) + (velocities[base + 2] as number) * stepS;
      remainingS[index] = left - stepS;
      if (left - stepS <= 0 || (positions[base + 1] as number) <= 0) hide(index);
    }
    attribute.needsUpdate = true;
  };

  const setDensity: BloodParticles["setDensity"] = (factor) => {
    density = Math.min(1, Math.max(0, factor));
  };

  const dispose = (): void => {
    scene.remove(points);
    geometry.dispose();
    material.dispose();
    map.dispose();
  };

  return { emit, update, setDensity, dispose };
};
