import * as THREE from "three";

const PARTICLES_MODULE = "@/render/effects/bloodParticles";
const VISUAL_MODULE = "@/config/visualConfig";
const FRAME_S = 1 / 60;
const AXES = 3;
const EMIT = { x: 1, y: 1.5, z: 2 };
const SMALL_BURST = 5;
const OVERFLOW_BURST = 400;
const SETTLE_MARGIN_S = 0.2;
const ORIGIN_TOLERANCE_M = 1e-6;

const mount = async () => {
  const particlesModule = await import(/* @vite-ignore */ PARTICLES_MODULE);
  const visual = (await import(/* @vite-ignore */ VISUAL_MODULE)).VISUAL_CONFIG.BLOOD_PARTICLES;
  const scene = new THREE.Scene();
  const particles = particlesModule.createBloodParticles(scene);
  const points = scene.getObjectByName("bloodParticles") as THREE.Points;
  const positions = (): Float32Array => points.geometry.getAttribute("position").array as Float32Array;
  const liveIndexes = (): number[] => {
    const buffer = positions();
    const live: number[] = [];
    for (let index = 0; index < buffer.length / AXES; index++) if (buffer[index * AXES + 1] !== visual.HIDDEN_Y_M) live.push(index);
    return live;
  };
  const run = (seconds: number): void => {
    for (let elapsed = 0; elapsed < seconds; elapsed += FRAME_S) particles.update(FRAME_S);
  };
  return { scene, particles, points, visual, positions, liveIndexes, run };
};

describe("bloodParticles", () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("mounts one Points object over a preallocated buffer with every particle hidden", async () => {
    const { points, visual, liveIndexes } = await mount();
    expect(points).toBeInstanceOf(THREE.Points);
    expect(points.geometry.getAttribute("position").count).toBe(visual.POOL_SIZE);
    expect(liveIndexes()).toHaveLength(0);
  });

  it("emits the requested number of particles at the given point", async () => {
    const { particles, positions, liveIndexes } = await mount();
    particles.emit(EMIT.x, EMIT.y, EMIT.z, SMALL_BURST);
    const live = liveIndexes();
    expect(live).toHaveLength(SMALL_BURST);
    for (const index of live) {
      expect(Math.abs((positions()[index * AXES] as number) - EMIT.x)).toBeLessThan(ORIGIN_TOLERANCE_M);
      expect(Math.abs((positions()[index * AXES + 1] as number) - EMIT.y)).toBeLessThan(ORIGIN_TOLERANCE_M);
      expect(Math.abs((positions()[index * AXES + 2] as number) - EMIT.z)).toBeLessThan(ORIGIN_TOLERANCE_M);
    }
  });

  it("never grows past the pool size and keeps the same buffer when flooded", async () => {
    const { particles, points, positions, liveIndexes, visual } = await mount();
    const buffer = positions();
    particles.emit(EMIT.x, EMIT.y, EMIT.z, OVERFLOW_BURST);
    particles.emit(EMIT.x, EMIT.y, EMIT.z, OVERFLOW_BURST);
    expect(liveIndexes()).toHaveLength(visual.POOL_SIZE);
    expect(points.geometry.getAttribute("position").count).toBe(visual.POOL_SIZE);
    expect(positions()).toBe(buffer);
  });

  it("reuses the oldest particle first when the pool is full", async () => {
    const { particles, positions, visual } = await mount();
    particles.emit(0, EMIT.y, 0, visual.POOL_SIZE);
    particles.emit(9, EMIT.y, 9, 1);
    expect(positions()[0]).toBeCloseTo(9, 5);
    expect(positions()[2]).toBeCloseTo(9, 5);
    expect(positions()[AXES]).toBeCloseTo(0, 5);
  });

  it("pulls particles down with gravity so the vertical climb slows each step", async () => {
    const { particles, positions, liveIndexes, run } = await mount();
    particles.emit(EMIT.x, EMIT.y, EMIT.z, SMALL_BURST);
    const index = liveIndexes()[0] as number;
    const y0 = positions()[index * AXES + 1] as number;
    run(FRAME_S);
    const y1 = positions()[index * AXES + 1] as number;
    run(FRAME_S);
    const y2 = positions()[index * AXES + 1] as number;
    expect(y2 - y1).toBeLessThan(y1 - y0);
  });

  it("hides every particle once the longest lifetime has passed", async () => {
    const { particles, liveIndexes, run, visual } = await mount();
    particles.emit(EMIT.x, EMIT.y, EMIT.z, SMALL_BURST);
    run(visual.LIFETIME_S.MIN / 2);
    expect(liveIndexes().length).toBeGreaterThan(0);
    run(visual.LIFETIME_S.MAX + SETTLE_MARGIN_S);
    expect(liveIndexes()).toHaveLength(0);
  });

  it("hides a particle that reaches the floor before its lifetime ends", async () => {
    const { particles, liveIndexes, run } = await mount();
    particles.emit(EMIT.x, 0.02, EMIT.z, SMALL_BURST);
    run(0.3);
    expect(liveIndexes()).toHaveLength(0);
  });

  it("freezes with a zero frame time", async () => {
    const { particles, positions } = await mount();
    particles.emit(EMIT.x, EMIT.y, EMIT.z, SMALL_BURST);
    const before = Array.from(positions());
    particles.update(0);
    expect(Array.from(positions())).toEqual(before);
  });

  it("scales the emitted count with the density factor", async () => {
    const { particles, liveIndexes, run, visual } = await mount();
    particles.setDensity(0.5);
    particles.emit(EMIT.x, EMIT.y, EMIT.z, 10);
    expect(liveIndexes()).toHaveLength(5);
    run(visual.LIFETIME_S.MAX + SETTLE_MARGIN_S);
    particles.setDensity(0);
    particles.emit(EMIT.x, EMIT.y, EMIT.z, 10);
    expect(liveIndexes()).toHaveLength(0);
  });

  it("removes the points from the scene on dispose", async () => {
    const { particles, scene } = await mount();
    particles.dispose();
    expect(scene.getObjectByName("bloodParticles")).toBeUndefined();
  });
});
