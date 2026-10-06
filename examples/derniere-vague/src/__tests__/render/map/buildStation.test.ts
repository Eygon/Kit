import * as THREE from "three";
import { STATION_LAYOUT, ZONES, ZONE_IDS } from "@/config/mapConfig";
import { createStationLayout } from "@/logic/map/stationLayout";
import { createRandom } from "@/logic/random";

const BUILD_MODULE = "@/render/map/buildStation";
const VISUAL_MODULE = "@/config/visualConfig";
const MAX_DYNAMIC_LIGHTS = 4;
const MAX_TEXTURE_PX = 512;
const NIGHT_SKY_MODULE = "@/render/textures/nightSkyTexture";
const PREVIOUS_FOG_DENSITY = 0.07;
const VERTICES_PER_BOX = 24;
const CUTOUT_FRAME_TOLERANCE = 2;
const CUTOUT_SPAN_FRAMES = 3600;
const MAX_STATIC_MESHES = 12;
const FRAME_S = 1 / 60;
const FLICKER_FRAMES = 240;
const WINDOW_FRAME_REACH_M = 1;
const CORNER_TOLERANCE_M = 0.01;

type StationHandle = { update: (frameS: number) => void };

const buildScene = async () => {
  const buildModule = await import(/* @vite-ignore */ BUILD_MODULE);
  const visualModule = await import(/* @vite-ignore */ VISUAL_MODULE);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  const layout = createStationLayout();
  const station: StationHandle = buildModule.buildStation(scene, camera, layout);
  return { scene, camera, layout, station, visual: visualModule.VISUAL_CONFIG };
};

const collectMeshes = (scene: THREE.Scene): THREE.Mesh[] => {
  const meshes: THREE.Mesh[] = [];
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh) meshes.push(object);
  });
  return meshes;
};

const collectDynamicLights = (scene: THREE.Scene): THREE.Light[] => {
  const lights: THREE.Light[] = [];
  scene.traverse((object) => {
    if (object instanceof THREE.PointLight || object instanceof THREE.SpotLight || object instanceof THREE.DirectionalLight) lights.push(object);
  });
  return lights;
};

const hasVertexNear = (mesh: THREE.Mesh, x: number, z: number, radiusM: number): boolean => {
  const position = mesh.geometry.getAttribute("position");
  for (let index = 0; index < position.count; index++) {
    if (Math.hypot(position.getX(index) - x, position.getZ(index) - z) <= radiusM) return true;
  }
  return false;
};

const findMesh = (scene: THREE.Scene, name: string): THREE.Mesh => {
  const mesh = collectMeshes(scene).find((candidate) => candidate.name === name);
  if (!mesh) throw new Error(`mesh ${name} missing`);
  return mesh;
};

describe("buildStation", () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("limits the view with exponential fog", async () => {
    const { scene } = await buildScene();
    expect(scene.fog).toBeInstanceOf(THREE.FogExp2);
    expect((scene.fog as THREE.FogExp2).density).toBeGreaterThan(0);
  });

  it("never activates more than 4 dynamic lights, three lamps plus the camera flashlight", async () => {
    const { scene, camera } = await buildScene();
    expect(collectDynamicLights(scene).length).toBeLessThanOrEqual(MAX_DYNAMIC_LIGHTS);
    const pointLights = collectDynamicLights(scene).filter((light) => light instanceof THREE.PointLight);
    expect(pointLights).toHaveLength(STATION_LAYOUT.LAMPS.length);
    const flashlight = camera.children.find((child) => child instanceof THREE.SpotLight);
    expect(flashlight).toBeInstanceOf(THREE.SpotLight);
    expect(camera.parent).toBe(scene);
  });

  it("flickers every lamp over time while staying within its base intensity", async () => {
    const { scene, station, visual } = await buildScene();
    const pointLights = collectDynamicLights(scene).filter((light): light is THREE.PointLight => light instanceof THREE.PointLight);
    const seen = pointLights.map(() => new Set<number>());
    for (let frame = 0; frame < FLICKER_FRAMES; frame++) {
      station.update(FRAME_S);
      pointLights.forEach((light, index) => {
        seen[index]?.add(light.intensity);
        expect(light.intensity).toBeGreaterThanOrEqual(0);
        expect(light.intensity).toBeLessThanOrEqual(visual.LAMP_BASE_INTENSITY + 1e-9);
      });
    }
    for (const intensities of seen) expect(intensities.size).toBeGreaterThan(1);
  });

  it("leaves the entrance blockers to the door views", async () => {
    const { scene } = await buildScene();
    expect(collectMeshes(scene).some((mesh) => mesh.name === "entranceBlockers")).toBe(false);
  });

  it("frames every window of the full window list, zone windows included", async () => {
    const { scene, layout } = await buildScene();
    const frames = findMesh(scene, "windowFrames");
    const zoneWindowCount = ZONE_IDS.reduce((total, zoneId) => total + ZONES[zoneId].WINDOWS.length, 0);
    expect(layout.windows).toHaveLength(STATION_LAYOUT.WINDOWS.length + zoneWindowCount);
    expect(layout.spawnPoints.length).toBeLessThan(layout.windows.length);
    for (const windowSpec of layout.windows) {
      const wallX = windowSpec.x + Math.sin(windowSpec.facing) * STATION_LAYOUT.WINDOW_SPAWN_OUTSET_M;
      const wallZ = windowSpec.z + Math.cos(windowSpec.facing) * STATION_LAYOUT.WINDOW_SPAWN_OUTSET_M;
      expect(hasVertexNear(frames, wallX, wallZ, WINDOW_FRAME_REACH_M)).toBe(true);
    }
  });

  it("gives every zone its walls, a floor and a ceiling matching the room walls", async () => {
    const { scene } = await buildScene();
    const walls = findMesh(scene, "walls");
    const floors = findMesh(scene, "zoneFloors");
    const ceilings = findMesh(scene, "zoneCeilings");
    expect(ceilings.position.y).toBeCloseTo(STATION_LAYOUT.WALL_HEIGHT_M, 6);
    expect(floors.position.y).toBeLessThan(ceilings.position.y);
    for (const zoneId of ZONE_IDS) {
      const spec = ZONES[zoneId];
      const xs = spec.WALLS.flatMap((wall) => [wall.ax, wall.bx]);
      const zs = spec.WALLS.flatMap((wall) => [wall.az, wall.bz]);
      for (const wall of spec.WALLS) {
        expect(hasVertexNear(walls, wall.ax, wall.az, STATION_LAYOUT.WALL_THICKNESS_M)).toBe(true);
        expect(hasVertexNear(walls, wall.bx, wall.bz, STATION_LAYOUT.WALL_THICKNESS_M)).toBe(true);
      }
      for (const x of [Math.min(...xs), Math.max(...xs)]) {
        for (const z of [Math.min(...zs), Math.max(...zs)]) {
          expect(hasVertexNear(floors, x, z, CORNER_TOLERANCE_M)).toBe(true);
          expect(hasVertexNear(ceilings, x, z, CORNER_TOLERANCE_M)).toBe(true);
        }
      }
    }
  });

  it("reuses the floor texture on the zone floors", async () => {
    const { scene } = await buildScene();
    const floor = findMesh(scene, "floor").material as THREE.MeshStandardMaterial;
    const zoneFloor = findMesh(scene, "zoneFloors").material as THREE.MeshStandardMaterial;
    expect(zoneFloor.map).toBeTruthy();
    expect(zoneFloor.map).toBe(floor.map);
  });

  it("builds walls, floor and ceiling as merged meshes covering the whole room", async () => {
    const { scene } = await buildScene();
    expect(collectMeshes(scene).length).toBeLessThanOrEqual(MAX_STATIC_MESHES);
    const walls = findMesh(scene, "walls");
    walls.geometry.computeBoundingBox();
    const box = walls.geometry.boundingBox as THREE.Box3;
    expect(box.min.x).toBeLessThanOrEqual(-STATION_LAYOUT.HALF_WIDTH_M);
    expect(box.max.x).toBeGreaterThanOrEqual(STATION_LAYOUT.HALF_WIDTH_M);
    expect(box.max.y).toBeCloseTo(STATION_LAYOUT.WALL_HEIGHT_M, 3);
    expect(findMesh(scene, "floor").position.y).toBeLessThan(findMesh(scene, "ceiling").position.y);
  });

  it("keeps canvas textures at 512px or less and reuses them by key across builds", async () => {
    const first = await buildScene();
    const second = await buildScene();
    const firstWalls = findMesh(first.scene, "walls").material as THREE.MeshStandardMaterial;
    const secondWalls = findMesh(second.scene, "walls").material as THREE.MeshStandardMaterial;
    expect(firstWalls.map).toBeTruthy();
    expect(firstWalls.map).toBe(secondWalls.map);
    for (const mesh of collectMeshes(first.scene)) {
      const material = mesh.material as THREE.MeshStandardMaterial;
      if (!material.map) continue;
      const image = material.map.image as HTMLCanvasElement;
      expect(image.width).toBeLessThanOrEqual(MAX_TEXTURE_PX);
      expect(image.height).toBeLessThanOrEqual(MAX_TEXTURE_PX);
      expect(material.map.generateMipmaps).toBe(true);
    }
  });

  it("tolerates a zero-length frame", async () => {
    const { station } = await buildScene();
    expect(() => station.update(0)).not.toThrow();
  });
});

type RecordedCall = { readonly name: string; readonly args: unknown[] };

const recordingContext = (calls: RecordedCall[]): CanvasRenderingContext2D => {
  const target = {};
  return new Proxy(target, {
    get: (_target, name) => (...args: unknown[]) => {
      calls.push({ name: String(name), args });
      return { addColorStop: () => undefined };
    },
    set: () => true,
  }) as CanvasRenderingContext2D;
};

const countCalls = (calls: readonly RecordedCall[], name: string): number => calls.filter((call) => call.name === name).length;

describe("buildStation night sky and lamp cut-outs", () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("paints every window pane with the cached night sky texture on a fog free basic material", async () => {
    const { scene, layout } = await buildScene();
    const { nightSkyTexture } = await import(/* @vite-ignore */ NIGHT_SKY_MODULE);
    const panes = findMesh(scene, "windowPanes");
    const material = panes.material as THREE.MeshBasicMaterial;
    expect(material).toBeInstanceOf(THREE.MeshBasicMaterial);
    expect(material.fog).toBe(false);
    expect(material.map).toBeTruthy();
    expect(material.map).toBe(nightSkyTexture());
    const image = (material.map as THREE.Texture).image as HTMLCanvasElement;
    expect(image.width).toBeLessThanOrEqual(MAX_TEXTURE_PX);
    expect(image.height).toBeLessThanOrEqual(MAX_TEXTURE_PX);
    expect((material.map as THREE.Texture).generateMipmaps).toBe(true);
    const position = panes.geometry.getAttribute("position");
    expect(position.count).toBe(VERTICES_PER_BOX * layout.windows.length);
    const uv = panes.geometry.getAttribute("uv");
    for (let index = 0; index < uv.count; index++) {
      expect(uv.getX(index)).toBeGreaterThanOrEqual(0);
      expect(uv.getX(index)).toBeLessThanOrEqual(1);
      expect(uv.getY(index)).toBeGreaterThanOrEqual(0);
      expect(uv.getY(index)).toBeLessThanOrEqual(1);
    }
  });

  it("adds no dynamic light for the moon and thickens the fog", async () => {
    const { scene, visual } = await buildScene();
    expect(collectDynamicLights(scene)).toHaveLength(STATION_LAYOUT.LAMPS.length + 1);
    expect(visual.FOG_DENSITY).toBeGreaterThan(PREVIOUS_FOG_DENSITY);
    expect((scene.fog as THREE.FogExp2).density).toBe(visual.FOG_DENSITY);
  });

  it("draws the sky gradient, the moon glow, the trees and the mist band once on a canvas of 512px or less", async () => {
    vi.resetModules();
    const calls: RecordedCall[] = [];
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(recordingContext(calls));
    const { nightSkyTexture } = await import(/* @vite-ignore */ NIGHT_SKY_MODULE);
    const visualModule = await import(/* @vite-ignore */ VISUAL_MODULE);
    const sky = visualModule.VISUAL_CONFIG.NIGHT_SKY;
    const texture = nightSkyTexture();
    const painted = calls.length;
    expect(nightSkyTexture()).toBe(texture);
    expect(calls).toHaveLength(painted);
    expect(countCalls(calls, "createLinearGradient")).toBeGreaterThanOrEqual(2);
    expect(countCalls(calls, "createRadialGradient")).toBeGreaterThanOrEqual(1);
    expect(countCalls(calls, "lineTo")).toBeGreaterThanOrEqual(sky.TREES.COUNT);
    expect((texture.image as HTMLCanvasElement).width).toBeLessThanOrEqual(MAX_TEXTURE_PX);
    expect((texture.image as HTMLCanvasElement).height).toBeLessThanOrEqual(MAX_TEXTURE_PX);
  });

  it("cuts every lamp and the bulbs to zero at a seeded moment inside the configured interval, then restores them", async () => {
    const { scene, station, visual } = await buildScene();
    const pointLights = collectDynamicLights(scene).filter((light): light is THREE.PointLight => light instanceof THREE.PointLight);
    const bulbs = findMesh(scene, "lamps").material as THREE.MeshBasicMaterial;
    const cutFrames: number[] = [];
    for (let frame = 1; frame <= CUTOUT_SPAN_FRAMES; frame++) {
      station.update(FRAME_S);
      const lampsOff = pointLights.every((light) => light.intensity === 0);
      const bulbsOff = bulbs.color.r === 0 && bulbs.color.g === 0 && bulbs.color.b === 0;
      expect(lampsOff).toBe(bulbsOff);
      if (lampsOff) cutFrames.push(frame);
    }
    expect(cutFrames.length).toBeGreaterThan(0);
    const expectedStartFrame = createRandom(visual.LAMP_CUTOUT_SEED).range(visual.LAMP_CUTOUT_MIN_S, visual.LAMP_CUTOUT_MAX_S) / FRAME_S;
    expect(Math.abs((cutFrames[0] as number) - expectedStartFrame)).toBeLessThanOrEqual(CUTOUT_FRAME_TOLERANCE);
    let firstRunLength = 1;
    while (cutFrames[firstRunLength] === (cutFrames[0] as number) + firstRunLength) firstRunLength++;
    expect(firstRunLength).toBeGreaterThanOrEqual(Math.floor(visual.LAMP_CUTOUT_S / FRAME_S) - CUTOUT_FRAME_TOLERANCE);
    expect(firstRunLength).toBeLessThanOrEqual(Math.ceil(visual.LAMP_CUTOUT_S / FRAME_S) + CUTOUT_FRAME_TOLERANCE);
    expect(cutFrames.length).toBeLessThan(CUTOUT_SPAN_FRAMES / 2);
  });

  it("never cuts the lamps before the minimum interval and replays the same cut-outs for the same seed", async () => {
    const run = async (): Promise<number[]> => {
      const { scene, station } = await buildScene();
      const pointLights = collectDynamicLights(scene).filter((light): light is THREE.PointLight => light instanceof THREE.PointLight);
      const frames: number[] = [];
      for (let frame = 1; frame <= CUTOUT_SPAN_FRAMES; frame++) {
        station.update(FRAME_S);
        if (pointLights.every((light) => light.intensity === 0)) frames.push(frame);
      }
      return frames;
    };
    const first = await run();
    const second = await run();
    const { LAMP_CUTOUT_MIN_S: minS } = (await import(/* @vite-ignore */ VISUAL_MODULE)).VISUAL_CONFIG;
    expect(first.length).toBeGreaterThan(0);
    expect(second).toEqual(first);
    expect((first[0] as number) * FRAME_S).toBeGreaterThanOrEqual(minS - CUTOUT_FRAME_TOLERANCE * FRAME_S);
  });
});
