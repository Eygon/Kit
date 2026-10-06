import * as THREE from "three";
import { STATION_LAYOUT } from "@/config/mapConfig";
import { createStationLayout } from "@/logic/map/stationLayout";
import type { GameEvent } from "@/logic/game/gameEvents";
import type { Horde } from "@/logic/zombies/zombieHorde";

const DECALS_MODULE = "@/render/effects/bloodDecals";
const VISUAL_MODULE = "@/config/visualConfig";
const HORDE_MODULE = "@/logic/zombies/zombieHorde";
const MAX_TEXTURE_PX = 512;
const POSITION_TOLERANCE_M = 1e-6;
const WALL_SURFACE_TOLERANCE_M = 0.05;
const CLEAR_ROOM_M = 1.3;
const NEAR_WALL_M = 0.5;
const ZOMBIE_ID = 2;

const hit = (id: number): GameEvent => ({ kind: "zombieHit", id, damage: 20, head: false, knife: false });

const mount = async () => {
  const decalsModule = await import(/* @vite-ignore */ DECALS_MODULE);
  const visual = (await import(/* @vite-ignore */ VISUAL_MODULE)).VISUAL_CONFIG.BLOOD_DECAL;
  const hordeModule = await import(/* @vite-ignore */ HORDE_MODULE);
  const layout = createStationLayout();
  const scene = new THREE.Scene();
  const decals = decalsModule.createBloodDecals(scene, layout);
  const horde: Horde = hordeModule.createHorde();
  const group = scene.getObjectByName("bloodDecals") as THREE.Object3D;
  return { scene, layout, decals, horde, group, visual };
};

const distanceToSegment = (px: number, pz: number, segment: { ax: number; az: number; bx: number; bz: number }): number => {
  const dx = segment.bx - segment.ax;
  const dz = segment.bz - segment.az;
  const t = Math.max(0, Math.min(1, ((px - segment.ax) * dx + (pz - segment.az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(px - (segment.ax + dx * t), pz - (segment.az + dz * t));
};

const wallDistance = (layout: ReturnType<typeof createStationLayout>, x: number, z: number): number => Math.min(...layout.segments.map((segment) => distanceToSegment(x, z, segment)));

const placeZombie = (horde: Horde, id: number, x: number, z: number): void => {
  const zombie = horde.zombies[id];
  if (!zombie) throw new Error("zombie slot missing");
  zombie.alive = true;
  zombie.x = x;
  zombie.z = z;
};

const visibleDecals = (group: THREE.Object3D): THREE.Object3D[] => group.children.filter((child) => child.visible);

const clearRoomSpot = (layout: ReturnType<typeof createStationLayout>): { x: number; z: number } => {
  for (let x = -6; x <= 6; x += 0.5) {
    for (let z = -6; z <= 6; z += 0.5) if (wallDistance(layout, x, z) > CLEAR_ROOM_M) return { x, z };
  }
  throw new Error("no clear spot");
};

describe("createBloodDecals", () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("builds the whole pool once, hidden, sharing one geometry and one material on a texture of 512px or less", async () => {
    const { group, visual } = await mount();
    expect(group.children).toHaveLength(visual.POOL_SIZE);
    expect(visual.POOL_SIZE).toBe(24);
    expect(visual.WALL_RANGE_M).toBe(1.2);
    expect(visibleDecals(group)).toHaveLength(0);
    const meshes = group.children as THREE.Mesh[];
    const first = meshes[0] as THREE.Mesh;
    for (const mesh of meshes) {
      expect(mesh.geometry).toBe(first.geometry);
      expect(mesh.material).toBe(first.material);
    }
    const material = first.material as THREE.MeshStandardMaterial;
    expect(material.transparent).toBe(true);
    expect(material.depthWrite).toBe(false);
    if (material.map) expect((material.map.image as HTMLCanvasElement).width).toBeLessThanOrEqual(MAX_TEXTURE_PX);
  });

  it("places a flat decal on the floor under a hit zombie standing far from any wall", async () => {
    const { layout, decals, horde, group } = await mount();
    const spot = clearRoomSpot(layout);
    placeZombie(horde, ZOMBIE_ID, spot.x, spot.z);
    decals.update([hit(ZOMBIE_ID)], horde);
    const shown = visibleDecals(group);
    expect(shown).toHaveLength(1);
    const decal = shown[0] as THREE.Object3D;
    expect(decal.position.x).toBeCloseTo(spot.x, 6);
    expect(decal.position.z).toBeCloseTo(spot.z, 6);
    expect(decal.position.y).toBeGreaterThan(0);
    expect(decal.position.y).toBeLessThan(0.1);
    expect(decal.rotation.x).toBeCloseTo(-Math.PI / 2, 6);
  });

  it("adds a second decal on the nearest wall when the zombie is within the wall range", async () => {
    const { layout, decals, horde, group, visual } = await mount();
    const segment = layout.segments[0];
    if (!segment) throw new Error("no segment");
    const midX = (segment.ax + segment.bx) / 2;
    const midZ = (segment.az + segment.bz) / 2;
    const length = Math.hypot(segment.bx - segment.ax, segment.bz - segment.az);
    const normals = [
      { x: -(segment.bz - segment.az) / length, z: (segment.bx - segment.ax) / length },
      { x: (segment.bz - segment.az) / length, z: -(segment.bx - segment.ax) / length },
    ];
    const best = normals
      .map((normal) => ({ normal, x: midX + normal.x * NEAR_WALL_M, z: midZ + normal.z * NEAR_WALL_M }))
      .sort((left, right) => wallDistance(layout, right.x, right.z) - wallDistance(layout, left.x, left.z))[0];
    if (!best) throw new Error("no spot");
    placeZombie(horde, ZOMBIE_ID, best.x, best.z);
    expect(wallDistance(layout, best.x, best.z)).toBeLessThanOrEqual(visual.WALL_RANGE_M);
    decals.update([hit(ZOMBIE_ID)], horde);
    const shown = visibleDecals(group);
    expect(shown).toHaveLength(2);
    const floor = shown.find((decal) => Math.abs(decal.rotation.x + Math.PI / 2) < 1e-6) as THREE.Object3D;
    const wall = shown.find((decal) => decal !== floor) as THREE.Object3D;
    expect(floor.position.x).toBeCloseTo(best.x, 6);
    expect(floor.position.z).toBeCloseTo(best.z, 6);
    const surfaceM = distanceToSegment(wall.position.x, wall.position.z, segment);
    expect(surfaceM).toBeGreaterThanOrEqual(STATION_LAYOUT.WALL_THICKNESS_M / 2);
    expect(surfaceM).toBeLessThanOrEqual(STATION_LAYOUT.WALL_THICKNESS_M / 2 + WALL_SURFACE_TOLERANCE_M);
    expect(wall.position.y).toBeGreaterThan(floor.position.y);
    const facing = new THREE.Vector3(0, 0, 1).applyEuler(wall.rotation);
    expect(facing.x * (best.x - wall.position.x) + facing.z * (best.z - wall.position.z)).toBeGreaterThan(0);
  });

  it("puts no wall decal when every wall is beyond the wall range", async () => {
    const { layout, decals, horde, group } = await mount();
    const spot = clearRoomSpot(layout);
    placeZombie(horde, ZOMBIE_ID, spot.x, spot.z);
    decals.update([hit(ZOMBIE_ID), hit(ZOMBIE_ID)], horde);
    expect(visibleDecals(group)).toHaveLength(2);
  });

  it("reuses the oldest decal once the pool is full without creating anything", async () => {
    const { layout, decals, horde, group, visual } = await mount();
    const spot = clearRoomSpot(layout);
    const meshes = [...group.children];
    const total = visual.POOL_SIZE + 1;
    for (let index = 0; index < total; index++) {
      placeZombie(horde, ZOMBIE_ID, spot.x, spot.z + index * POSITION_TOLERANCE_M * 1e5);
      decals.update([hit(ZOMBIE_ID)], horde);
    }
    expect(group.children).toHaveLength(visual.POOL_SIZE);
    expect(group.children.every((child, index) => child === meshes[index])).toBe(true);
    expect(visibleDecals(group)).toHaveLength(visual.POOL_SIZE);
    const oldest = group.children[0] as THREE.Object3D;
    expect(oldest.position.z).toBeCloseTo(spot.z + visual.POOL_SIZE * POSITION_TOLERANCE_M * 1e5, 6);
    const second = group.children[1] as THREE.Object3D;
    expect(second.position.z).toBeCloseTo(spot.z + POSITION_TOLERANCE_M * 1e5, 6);
  });

  it("ignores other events, missing zombies and zombies that are gone", async () => {
    const { decals, horde, group } = await mount();
    decals.update([{ kind: "roundStarted", round: 1 } as GameEvent, hit(horde.zombies.length + 5)], horde);
    expect(visibleDecals(group)).toHaveLength(0);
  });

  it("removes the group on dispose", async () => {
    const { scene, decals } = await mount();
    decals.dispose();
    expect(scene.getObjectByName("bloodDecals")).toBeUndefined();
  });
});
