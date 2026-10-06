import * as THREE from "three";

const DUST_MODULE = "@/render/effects/dustParticles";
const VISUAL_MODULE = "@/config/visualConfig";
const MAX_TEXTURE_PX = 512;
const SMALL_FRAME_S = 0.1;
const NO_WRAP_M = 1;
const FAR_CAMERA = { x: 140, y: 1.7, z: -75 };
const FRAMES = 240;
const FRAME_S = 1 / 60;

const mount = async () => {
  const dustModule = await import(/* @vite-ignore */ DUST_MODULE);
  const visual = (await import(/* @vite-ignore */ VISUAL_MODULE)).VISUAL_CONFIG.DUST;
  const scene = new THREE.Scene();
  const dust = dustModule.createDustParticles(scene);
  const points = scene.getObjectByName("dust") as THREE.Points;
  return { scene, dust, points, visual };
};

const positionsOf = (points: THREE.Points): Float32Array => points.geometry.getAttribute("position").array as Float32Array;

describe("createDustParticles", () => {
  it("adds one Points object with a fixed particle count and a preallocated position buffer", async () => {
    const { scene, points, visual } = await mount();
    expect(points).toBeInstanceOf(THREE.Points);
    expect(scene.children.filter((child) => child instanceof THREE.Points)).toHaveLength(1);
    expect(points.geometry.getAttribute("position").count).toBe(visual.COUNT);
    expect(positionsOf(points)).toHaveLength(visual.COUNT * 3);
    expect(points.frustumCulled).toBe(false);
    const material = points.material as THREE.PointsMaterial;
    expect(material.transparent).toBe(true);
    expect(material.opacity).toBe(visual.OPACITY);
    expect(material.depthWrite).toBe(false);
  });

  it("keeps the count and the same buffer while frames render", async () => {
    const { dust, points, visual } = await mount();
    const buffer = positionsOf(points);
    const attribute = points.geometry.getAttribute("position");
    const camera = new THREE.Vector3(0, 1.7, 0);
    for (let frame = 0; frame < FRAMES; frame++) dust.update(camera, FRAME_S);
    expect(points.geometry.getAttribute("position")).toBe(attribute);
    expect(positionsOf(points)).toBe(buffer);
    expect(attribute.count).toBe(visual.COUNT);
    expect(buffer.every((value) => Number.isFinite(value))).toBe(true);
  });

  it("drifts every particle along the configured drift velocity", async () => {
    const { dust, points, visual } = await mount();
    const camera = new THREE.Vector3(0, 1.7, 0);
    dust.update(camera, 0);
    const before = Float32Array.from(positionsOf(points));
    dust.update(camera, SMALL_FRAME_S);
    const after = positionsOf(points);
    let moved = 0;
    for (let index = 0; index < visual.COUNT; index++) {
      const dx = (after[index * 3] as number) - (before[index * 3] as number);
      const dy = (after[index * 3 + 1] as number) - (before[index * 3 + 1] as number);
      const dz = (after[index * 3 + 2] as number) - (before[index * 3 + 2] as number);
      if (Math.hypot(dx, dy, dz) > NO_WRAP_M) continue;
      moved++;
      expect(dx * visual.DRIFT_MPS.x + dy * visual.DRIFT_MPS.y + dz * visual.DRIFT_MPS.z).toBeGreaterThan(0);
    }
    expect(moved).toBeGreaterThan(visual.COUNT / 2);
  });

  it("holds still when no time passes", async () => {
    const { dust, points } = await mount();
    const camera = new THREE.Vector3(0, 1.7, 0);
    dust.update(camera, 0);
    const before = Float32Array.from(positionsOf(points));
    dust.update(camera, 0);
    expect(Array.from(positionsOf(points))).toEqual(Array.from(before));
  });

  it("wraps every particle inside the box around the camera wherever the camera goes", async () => {
    const { dust, points, visual } = await mount();
    const camera = new THREE.Vector3(FAR_CAMERA.x, FAR_CAMERA.y, FAR_CAMERA.z);
    dust.update(camera, FRAME_S);
    const buffer = positionsOf(points);
    const half = visual.BOX_M / 2;
    for (let index = 0; index < visual.COUNT; index++) {
      expect(Math.abs((buffer[index * 3] as number) - camera.x)).toBeLessThanOrEqual(half + 1e-4);
      expect(Math.abs((buffer[index * 3 + 1] as number) - camera.y)).toBeLessThanOrEqual(half + 1e-4);
      expect(Math.abs((buffer[index * 3 + 2] as number) - camera.z)).toBeLessThanOrEqual(half + 1e-4);
    }
  });

  it("follows the camera as it walks while the particles keep drifting", async () => {
    const { dust, points, visual } = await mount();
    const camera = new THREE.Vector3(0, 1.7, 0);
    for (let frame = 0; frame < FRAMES; frame++) {
      camera.x += 0.05;
      dust.update(camera, FRAME_S);
    }
    const buffer = positionsOf(points);
    let near = 0;
    for (let index = 0; index < visual.COUNT; index++) if (Math.abs((buffer[index * 3] as number) - camera.x) <= visual.BOX_M / 2 + 1e-4) near++;
    expect(near).toBe(visual.COUNT);
  });

  it("draws a soft round sprite on a canvas of 512px or less and removes itself on dispose", async () => {
    const { scene, dust, points } = await mount();
    const material = points.material as THREE.PointsMaterial;
    if (material.map) {
      const image = material.map.image as HTMLCanvasElement;
      expect(image.width).toBeLessThanOrEqual(MAX_TEXTURE_PX);
    }
    dust.dispose();
    expect(scene.getObjectByName("dust")).toBeUndefined();
  });
});
