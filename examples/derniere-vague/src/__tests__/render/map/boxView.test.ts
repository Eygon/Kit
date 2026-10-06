import * as THREE from "three";
import { BOX_MOVE_S, BOX_OFFER_S, BOX_POOL, BOX_ROLL_S, BOX_SPOTS } from "@/config/boxConfig";
import type { WeaponId } from "@/config/weaponConfig";

export {};

const VIEW_MODULE = "@/render/map/boxView";
const VISUAL_MODULE = "@/config/visualConfig";
const FRAME_S = 1 / 60;
const POSITION_TOLERANCE_M = 1e-6;
const OPEN_ENOUGH_RAD = 1;
const CLOSED_TOLERANCE_RAD = 0.02;
const SETTLE_FRAMES = 120;
const LIFT_TOLERANCE_M = 0.05;
const MIN_PARTS = 4;

type BoxState =
  | { kind: "idle" }
  | { kind: "rolling"; remainingS: number }
  | { kind: "offering"; weaponId: WeaponId; remainingS: number }
  | { kind: "moving"; remainingS: number };
type FakeBox = { state: BoxState; spot: number; rolls: number };
type BoxViewHandle = { update: (box: FakeBox, frameS: number) => void; dispose: () => void };

const makeBox = (state: BoxState = { kind: "idle" }, spot = 0): FakeBox => ({ state, spot, rolls: 0 });

const loadView = async () => {
  const viewModule = await import(/* @vite-ignore */ VIEW_MODULE);
  const visualModule = await import(/* @vite-ignore */ VISUAL_MODULE);
  const scene = new THREE.Scene();
  const view: BoxViewHandle = viewModule.createBoxView(scene);
  const frames = (box: FakeBox, count: number): void => {
    for (let index = 0; index < count; index++) view.update(box, FRAME_S);
  };
  return { scene, view, frames, visual: visualModule.VISUAL_CONFIG };
};

const named = (scene: THREE.Scene, name: string): THREE.Object3D => {
  const found = scene.getObjectByName(name);
  if (!found) throw new Error(`${name} missing`);
  return found;
};

const shown = (object: THREE.Object3D): boolean => {
  for (let current: THREE.Object3D | null = object; current; current = current.parent) if (!current.visible) return false;
  return true;
};

const visibleSilhouettes = (scene: THREE.Scene): string[] => named(scene, "boxSilhouettes").children.filter(shown).map((child) => child.name);

const worldOf = (scene: THREE.Scene, name: string): THREE.Vector3 => {
  scene.updateMatrixWorld(true);
  return named(scene, name).getWorldPosition(new THREE.Vector3());
};

const rolling = (): BoxState => ({ kind: "rolling", remainingS: BOX_ROLL_S });

describe("boxView", () => {
  it("stands the chest and its signal beam at the spot of an idle box", async () => {
    const { scene, view } = await loadView();
    view.update(makeBox(), FRAME_S);
    const spot = BOX_SPOTS[0];
    if (!spot) throw new Error("no spot");
    const root = named(scene, "mysteryBox");
    expect(root.position.x).toBeCloseTo(spot.x, 6);
    expect(root.position.z).toBeCloseTo(spot.z, 6);
    expect(root.rotation.y).toBeCloseTo(spot.facing, 6);
    expect(shown(named(scene, "boxChest"))).toBe(true);
    expect(shown(named(scene, "boxBeam"))).toBe(true);
    const beam = worldOf(scene, "boxBeam");
    expect(Math.abs(beam.x - spot.x)).toBeLessThan(POSITION_TOLERANCE_M);
    expect(Math.abs(beam.z - spot.z)).toBeLessThan(POSITION_TOLERANCE_M);
    expect(beam.y).toBeGreaterThan(0);
  });

  it("builds the chest from unlit-free primitives: an additive emissive beam and no dynamic light", async () => {
    const { scene } = await loadView();
    const beam = named(scene, "boxBeam") as THREE.Mesh;
    expect(beam.material).toBeInstanceOf(THREE.MeshBasicMaterial);
    expect((beam.material as THREE.MeshBasicMaterial).blending).toBe(THREE.AdditiveBlending);
    expect((beam.material as THREE.MeshBasicMaterial).transparent).toBe(true);
    expect((beam.material as THREE.MeshBasicMaterial).depthWrite).toBe(false);
    let lights = 0;
    let meshes = 0;
    scene.traverse((object) => {
      if (object instanceof THREE.Light) lights++;
      if (object instanceof THREE.Mesh) meshes++;
    });
    expect(lights).toBe(0);
    expect(meshes).toBeGreaterThanOrEqual(MIN_PARTS);
  });

  it("keeps the lid closed and every silhouette hidden while the box is idle", async () => {
    const { scene, view, frames } = await loadView();
    const box = makeBox();
    view.update(box, FRAME_S);
    frames(box, SETTLE_FRAMES);
    expect(Math.abs(named(scene, "boxLid").rotation.x)).toBeLessThan(CLOSED_TOLERANCE_RAD);
    expect(visibleSilhouettes(scene)).toEqual([]);
  });

  it("opens the lid gradually while rolling instead of snapping it", async () => {
    const { scene, view, frames } = await loadView();
    const box = makeBox(rolling());
    view.update(box, FRAME_S);
    const lid = named(scene, "boxLid");
    const first = Math.abs(lid.rotation.x);
    expect(first).toBeLessThan(OPEN_ENOUGH_RAD);
    frames(box, SETTLE_FRAMES / 2);
    expect(Math.abs(lid.rotation.x)).toBeGreaterThan(OPEN_ENOUGH_RAD);
    expect(Math.abs(lid.rotation.x)).toBeGreaterThan(first);
  });

  it("cycles silhouettes over time while rolling, one at a time", async () => {
    const { scene, view } = await loadView();
    const box = makeBox(rolling());
    const seen = new Set<string>();
    for (let index = 0; index < Math.floor(BOX_ROLL_S / FRAME_S) - 1; index++) {
      view.update(box, FRAME_S);
      if (box.state.kind === "rolling") box.state.remainingS -= FRAME_S;
      const visible = visibleSilhouettes(scene);
      expect(visible).toHaveLength(1);
      seen.add(visible[0] ?? "");
    }
    expect(seen.size).toBeGreaterThanOrEqual(BOX_POOL.length);
    for (const entry of BOX_POOL) expect(seen.has(`boxSilhouette-${entry.weaponId}`)).toBe(true);
  });

  it("shows only the offered weapon silhouette with the lid open while offering", async () => {
    const { scene, view, frames } = await loadView();
    const box = makeBox({ kind: "offering", weaponId: "shotgun", remainingS: BOX_OFFER_S });
    view.update(box, FRAME_S);
    frames(box, SETTLE_FRAMES);
    expect(visibleSilhouettes(scene)).toEqual(["boxSilhouette-shotgun"]);
    expect(Math.abs(named(scene, "boxLid").rotation.x)).toBeGreaterThan(OPEN_ENOUGH_RAD);
    box.state = { kind: "offering", weaponId: "rayGun", remainingS: BOX_OFFER_S };
    frames(box, 1);
    expect(visibleSilhouettes(scene)).toEqual(["boxSilhouette-rayGun"]);
  });

  it("owns one silhouette per weapon of the pool, built at creation", async () => {
    const { scene } = await loadView();
    const names = named(scene, "boxSilhouettes").children.map((child) => child.name);
    for (const entry of BOX_POOL) expect(names).toContain(`boxSilhouette-${entry.weaponId}`);
  });

  it("closes the lid and hides the silhouette once the offer is gone", async () => {
    const { scene, view, frames } = await loadView();
    const box = makeBox({ kind: "offering", weaponId: "smg", remainingS: BOX_OFFER_S });
    view.update(box, FRAME_S);
    frames(box, SETTLE_FRAMES);
    box.state = { kind: "idle" };
    frames(box, SETTLE_FRAMES);
    expect(Math.abs(named(scene, "boxLid").rotation.x)).toBeLessThan(CLOSED_TOLERANCE_RAD);
    expect(visibleSilhouettes(scene)).toEqual([]);
  });

  it("lifts the chest and drops the beam while the box moves, then stands both at the new spot", async () => {
    const { scene, view, frames } = await loadView();
    const box = makeBox({ kind: "moving", remainingS: BOX_MOVE_S / 2 });
    view.update(box, FRAME_S);
    frames(box, SETTLE_FRAMES / 4);
    expect(named(scene, "boxChest").position.y).toBeGreaterThan(LIFT_TOLERANCE_M);
    expect(shown(named(scene, "boxBeam"))).toBe(false);
    box.state = { kind: "idle" };
    box.spot = 1;
    frames(box, 1);
    const spot = BOX_SPOTS[1];
    if (!spot) throw new Error("no second spot");
    const root = named(scene, "mysteryBox");
    expect(root.position.x).toBeCloseTo(spot.x, 6);
    expect(root.position.z).toBeCloseTo(spot.z, 6);
    expect(root.rotation.y).toBeCloseTo(spot.facing, 6);
    expect(named(scene, "boxChest").position.y).toBeCloseTo(0, 6);
    expect(shown(named(scene, "boxBeam"))).toBe(true);
    const beam = worldOf(scene, "boxBeam");
    expect(Math.abs(beam.x - spot.x)).toBeLessThan(POSITION_TOLERANCE_M);
    expect(Math.abs(beam.z - spot.z)).toBeLessThan(POSITION_TOLERANCE_M);
  });

  it("pulses the beam opacity over time", async () => {
    const { scene, view } = await loadView();
    const box = makeBox();
    const material = (named(scene, "boxBeam") as THREE.Mesh).material as THREE.MeshBasicMaterial;
    let min = Infinity;
    let max = -Infinity;
    for (let index = 0; index < SETTLE_FRAMES; index++) {
      view.update(box, FRAME_S);
      min = Math.min(min, material.opacity);
      max = Math.max(max, material.opacity);
    }
    expect(max - min).toBeGreaterThan(0.02);
    expect(min).toBeGreaterThan(0);
  });

  it("removes everything from the scene on dispose", async () => {
    const { scene, view } = await loadView();
    expect(scene.getObjectByName("mysteryBox")).toBeDefined();
    view.dispose();
    expect(scene.getObjectByName("mysteryBox")).toBeUndefined();
  });
});
