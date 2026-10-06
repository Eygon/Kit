import * as THREE from "three";
import { DOOR_OPEN_S, STATION_LAYOUT, ZONES, ZONE_IDS } from "@/config/mapConfig";
import type { ZoneId } from "@/config/mapConfig";
import { createStationLayout } from "@/logic/map/stationLayout";
import { createZoneDoors, startOpening, updateZoneDoors } from "@/logic/map/zoneDoors";
import type { GameEvent } from "@/logic/game/gameEvents";

const VIEW_MODULE = "@/render/map/doorView";
const FRAME_S = 1 / 60;
const HALF = 0.5;
const SLAB_NAME = "doorSlab";
const POSITION_TOLERANCE_M = 0.2;
const EPSILON = 1e-6;

const load = async () => {
  const viewModule = await import(/* @vite-ignore */ VIEW_MODULE);
  const scene = new THREE.Scene();
  const layout = createStationLayout();
  const view = viewModule.createDoorView(scene, layout);
  const doors = createZoneDoors();
  const events: GameEvent[] = [];
  const doorGroup = (zoneId: ZoneId): THREE.Object3D => {
    const found = scene.getObjectByName(`door-${zoneId}`);
    if (!found) throw new Error(`door-${zoneId} missing`);
    return found;
  };
  const piecesOf = (zoneId: ZoneId): THREE.Mesh[] => {
    const meshes: THREE.Mesh[] = [];
    doorGroup(zoneId).traverse((object) => {
      if (object instanceof THREE.Mesh) meshes.push(object);
    });
    return meshes;
  };
  const entranceOf = (zoneId: ZoneId) => {
    const entrance = layout.entrances.find((candidate) => candidate.zoneId === zoneId);
    if (!entrance) throw new Error(`entrance ${zoneId} missing`);
    return entrance;
  };
  const setProgress = (zoneId: ZoneId, progress: number): void => {
    doors[zoneId] = progress >= 1 ? { kind: "open" } : { kind: "opening", remainingS: DOOR_OPEN_S * (1 - progress) };
    view.update(doors);
  };
  const open = (zoneId: ZoneId): void => {
    startOpening(doors, zoneId, events);
    for (let frame = 0; frame < Math.ceil(DOOR_OPEN_S / FRAME_S) + 2; frame++) {
      updateZoneDoors(doors, layout, FRAME_S, events);
      view.update(doors);
    }
  };
  return { view, scene, layout, doors, doorGroup, piecesOf, entranceOf, setProgress, open };
};

const zonesOfKind = (kind: string): ZoneId[] => ZONE_IDS.filter((zoneId) => ZONES[zoneId].DOOR_KIND === kind);

const worldPositionOf = (object: THREE.Object3D): THREE.Vector3 => object.getWorldPosition(new THREE.Vector3());

const slabOf = (pieces: THREE.Mesh[]): THREE.Mesh => {
  const slab = pieces.find((piece) => piece.name === SLAB_NAME);
  if (!slab) throw new Error("slab missing");
  return slab;
};

const worldHeights = (pieces: THREE.Mesh[]): number[] => pieces.map((piece) => worldPositionOf(piece).y);

describe("doorView", () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("mounts one door group per closed entrance under a single doors parent", async () => {
    const { scene, doorGroup } = await load();
    const parent = scene.getObjectByName("doors");
    expect(parent?.children).toHaveLength(ZONE_IDS.length);
    for (const zoneId of ZONE_IDS) {
      expect(doorGroup(zoneId).parent).toBe(parent);
      expect(doorGroup(zoneId).visible).toBe(true);
    }
  });

  it("builds a debris pile for the debris zones and a sliding slab for the door zones", async () => {
    const { piecesOf } = await load();
    expect(zonesOfKind("debris").length).toBeGreaterThan(0);
    expect(zonesOfKind("door").length).toBeGreaterThan(0);
    for (const zoneId of zonesOfKind("debris")) {
      expect(piecesOf(zoneId).length).toBeGreaterThanOrEqual(6);
      expect(piecesOf(zoneId).some((piece) => piece.name === SLAB_NAME)).toBe(false);
    }
    for (const zoneId of zonesOfKind("door")) expect(piecesOf(zoneId).some((piece) => piece.name === SLAB_NAME)).toBe(true);
  });

  it("stacks the closed debris across the whole passage up to the ceiling", async () => {
    const { piecesOf, entranceOf } = await load();
    for (const zoneId of zonesOfKind("debris")) {
      const entrance = entranceOf(zoneId);
      const midX = (entrance.ax + entrance.bx) / 2;
      const midZ = (entrance.az + entrance.bz) / 2;
      const heights = worldHeights(piecesOf(zoneId));
      expect(Math.max(...heights)).toBeGreaterThan(STATION_LAYOUT.WALL_HEIGHT_M * 0.8);
      expect(Math.min(...heights)).toBeLessThan(STATION_LAYOUT.WALL_HEIGHT_M * 0.3);
      const halfPassageM = Math.hypot(entrance.bx - entrance.ax, entrance.bz - entrance.az) / 2;
      for (const piece of piecesOf(zoneId)) expect(Math.hypot(worldPositionOf(piece).x - midX, worldPositionOf(piece).z - midZ)).toBeLessThanOrEqual(halfPassageM);
    }
  });

  it("drops the debris pieces while the door opens, then hides the pile once open", async () => {
    const { piecesOf, doorGroup, setProgress } = await load();
    const zoneId = zonesOfKind("debris")[0];
    if (!zoneId) throw new Error("no debris zone");
    const closed = worldHeights(piecesOf(zoneId));
    setProgress(zoneId, HALF);
    const halfway = worldHeights(piecesOf(zoneId));
    expect(doorGroup(zoneId).visible).toBe(true);
    halfway.forEach((height, index) => expect(height).toBeLessThanOrEqual((closed[index] ?? 0) + EPSILON));
    expect(Math.max(...halfway)).toBeLessThan(Math.max(...closed));
    setProgress(zoneId, 0.9);
    const late = worldHeights(piecesOf(zoneId));
    expect(late.reduce((sum, height) => sum + height, 0)).toBeLessThan(halfway.reduce((sum, height) => sum + height, 0));
    setProgress(zoneId, 1);
    expect(doorGroup(zoneId).visible).toBe(false);
  });

  it("slides the east door along its wall until it is fully aside, still visible", async () => {
    const { piecesOf, doorGroup, entranceOf, setProgress } = await load();
    const zoneId = zonesOfKind("door")[0];
    if (!zoneId) throw new Error("no door zone");
    const entrance = entranceOf(zoneId);
    const midX = (entrance.ax + entrance.bx) / 2;
    const midZ = (entrance.az + entrance.bz) / 2;
    const lengthM = Math.hypot(entrance.bx - entrance.ax, entrance.bz - entrance.az);
    const alongX = (entrance.bx - entrance.ax) / lengthM;
    const alongZ = (entrance.bz - entrance.az) / lengthM;
    const slide = (): number => {
      const position = worldPositionOf(slabOf(piecesOf(zoneId)));
      return Math.abs((position.x - midX) * alongX + (position.z - midZ) * alongZ);
    };
    setProgress(zoneId, 0);
    expect(slide()).toBeLessThan(POSITION_TOLERANCE_M);
    setProgress(zoneId, HALF);
    const halfway = slide();
    expect(halfway).toBeGreaterThan(POSITION_TOLERANCE_M);
    setProgress(zoneId, 1);
    expect(slide()).toBeGreaterThanOrEqual(lengthM - EPSILON);
    expect(slide()).toBeGreaterThan(halfway);
    expect(doorGroup(zoneId).visible).toBe(true);
  });

  it("leaves the doorway completely clear once the slab is aside", async () => {
    const { scene, piecesOf, entranceOf, setProgress } = await load();
    const zoneId = zonesOfKind("door")[0];
    if (!zoneId) throw new Error("no door zone");
    const entrance = entranceOf(zoneId);
    const lengthM = Math.hypot(entrance.bx - entrance.ax, entrance.bz - entrance.az);
    const alongX = (entrance.bx - entrance.ax) / lengthM;
    const alongZ = (entrance.bz - entrance.az) / lengthM;
    const midX = (entrance.ax + entrance.bx) / 2;
    const midZ = (entrance.az + entrance.bz) / 2;
    const alongRange = (): { min: number; max: number } => {
      scene.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(slabOf(piecesOf(zoneId)));
      const projections = [box.min.x, box.max.x].flatMap((x) => [box.min.z, box.max.z].map((z) => (x - midX) * alongX + (z - midZ) * alongZ));
      return { min: Math.min(...projections), max: Math.max(...projections) };
    };
    setProgress(zoneId, 0);
    expect(alongRange().min).toBeLessThanOrEqual(-lengthM / 2 + EPSILON);
    expect(alongRange().max).toBeGreaterThanOrEqual(lengthM / 2 - EPSILON);
    setProgress(zoneId, 1);
    const open = alongRange();
    expect(open.min >= lengthM / 2 - EPSILON || open.max <= -lengthM / 2 + EPSILON).toBe(true);
  });

  it("follows the zone door state machine from closed to open", async () => {
    const { open, doorGroup, doors } = await load();
    open("north");
    expect(doors.north.kind).toBe("open");
    expect(doorGroup("north").visible).toBe(false);
    expect(doorGroup("east").visible).toBe(true);
    expect(doorGroup("west").visible).toBe(true);
    open("east");
    expect(doorGroup("east").visible).toBe(true);
  });

  it("builds every piece from the shared wood texture material set", async () => {
    const { piecesOf } = await load();
    const materials = new Set<THREE.Material | THREE.Material[]>();
    for (const zoneId of ZONE_IDS) {
      for (const piece of piecesOf(zoneId)) {
        materials.add(piece.material);
        expect((piece.material as THREE.MeshStandardMaterial).map).toBeTruthy();
      }
    }
    expect(materials.size).toBeLessThanOrEqual(3);
  });

  it("does not add or remove scene objects while updating", async () => {
    const { scene, setProgress } = await load();
    let before = 0;
    scene.traverse(() => before++);
    for (let step = 0; step <= 10; step++) for (const zoneId of ZONE_IDS) setProgress(zoneId, step / 10);
    let after = 0;
    scene.traverse(() => after++);
    expect(after).toBe(before);
  });

  it("removes the doors from the scene on dispose", async () => {
    const { view, scene } = await load();
    view.dispose();
    expect(scene.getObjectByName("doors")).toBeUndefined();
  });
});
