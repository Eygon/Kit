import * as THREE from "three";

const POOL_MODULE = "@/render/weapon/casingPool";
const VISUAL_MODULE = "@/config/visualConfig";
const FRAME_S = 1 / 60;
const EPSILON = 1e-9;

type Pool = { eject: (x: number, y: number, z: number) => void; update: (frameS: number) => void };

const load = async () => {
  const poolModule = await import(/* @vite-ignore */ POOL_MODULE);
  const visualModule = await import(/* @vite-ignore */ VISUAL_MODULE);
  const parent = new THREE.Group();
  const pool: Pool = poolModule.createCasingPool(parent);
  const casing = visualModule.VISUAL_CONFIG.VIEW_MODEL.CASING;
  const meshes = (): THREE.Mesh[] => parent.children.filter((child): child is THREE.Mesh => child instanceof THREE.Mesh);
  const visible = (): THREE.Mesh[] => meshes().filter((mesh) => mesh.visible);
  const run = (seconds: number): void => {
    for (let elapsed = 0; elapsed < seconds; elapsed += FRAME_S) pool.update(FRAME_S);
  };
  return { parent, pool, casing, meshes, visible, run };
};

describe("createCasingPool", () => {
  it("creates POOL_SIZE hidden meshes once, under the parent", async () => {
    const { casing, meshes, visible, pool } = await load();
    expect(casing.POOL_SIZE).toBe(8);
    expect(meshes()).toHaveLength(casing.POOL_SIZE);
    expect(visible()).toHaveLength(0);
    pool.eject(0, 0, 0);
    pool.update(FRAME_S);
    expect(meshes()).toHaveLength(casing.POOL_SIZE);
  });

  it("shows a casing at the eject position", async () => {
    const { pool, visible } = await load();
    pool.eject(0.1, 0.2, 0.3);
    const shown = visible();
    expect(shown).toHaveLength(1);
    expect(shown[0]?.position.x).toBeCloseTo(0.1, 6);
    expect(shown[0]?.position.y).toBeCloseTo(0.2, 6);
    expect(shown[0]?.position.z).toBeCloseTo(0.3, 6);
  });

  it("moves the casing away from the port and makes it fall under gravity", async () => {
    const { pool, visible, run, casing } = await load();
    pool.eject(0, 0, 0);
    const mesh = visible()[0];
    pool.update(FRAME_S);
    const earlyY = mesh?.position.y ?? 0;
    const earlyX = mesh?.position.x ?? 0;
    expect(earlyX).toBeGreaterThan(0);
    expect(earlyY).toBeGreaterThan(0);
    run(casing.LIFETIME_S * 0.8);
    expect(mesh?.position.y ?? 0).toBeLessThan(earlyY);
    expect(mesh?.position.x ?? 0).toBeGreaterThan(earlyX);
  });

  it("speeds up downward with GRAVITY_MPS2", async () => {
    const { pool, visible, casing } = await load();
    pool.eject(0, 0, 0);
    const mesh = visible()[0];
    const ys: number[] = [];
    for (let index = 0; index < 4; index++) {
      pool.update(FRAME_S);
      ys.push(mesh?.position.y ?? 0);
    }
    const firstStep = (ys[1] ?? 0) - (ys[0] ?? 0);
    const lastStep = (ys[3] ?? 0) - (ys[2] ?? 0);
    expect(firstStep - lastStep).toBeCloseTo(casing.GRAVITY_MPS2 * FRAME_S * FRAME_S * 2, 5);
  });

  it("hides the casing at the end of its life", async () => {
    const { pool, visible, run, casing } = await load();
    pool.eject(0, 0, 0);
    run(casing.LIFETIME_S * 0.5);
    expect(visible()).toHaveLength(1);
    run(casing.LIFETIME_S);
    expect(visible()).toHaveLength(0);
  });

  it("reuses the oldest mesh once the pool is full, without creating any", async () => {
    const { pool, meshes, visible, casing } = await load();
    for (let index = 0; index < casing.POOL_SIZE; index++) pool.eject(index, 0, 0);
    const oldest = meshes()[0];
    expect(oldest?.position.x).toBeCloseTo(0, 6);
    pool.eject(99, 0, 0);
    expect(meshes()).toHaveLength(casing.POOL_SIZE);
    expect(visible()).toHaveLength(casing.POOL_SIZE);
    expect(oldest?.position.x).toBeCloseTo(99, 6);
    expect(Math.abs((meshes()[1]?.position.x ?? 0) - 1)).toBeLessThan(EPSILON + 1e-6);
  });

  it("restarts the life of a reused casing", async () => {
    const { pool, visible, run, casing } = await load();
    for (let index = 0; index < casing.POOL_SIZE; index++) pool.eject(index, 0, 0);
    run(casing.LIFETIME_S * 0.9);
    pool.eject(50, 0, 0);
    run(casing.LIFETIME_S * 0.3);
    expect(visible().some((mesh) => mesh.position.x > 40)).toBe(true);
  });
});
