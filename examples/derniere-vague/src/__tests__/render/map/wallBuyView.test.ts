import * as THREE from "three";
import { STATION_LAYOUT, WALL_BUYS } from "@/config/mapConfig";
import { WEAPONS } from "@/config/weaponConfig";
import type { WeaponId } from "@/config/weaponConfig";
import { TEXTS } from "@/ui/texts";

export {};

const VIEW_MODULE = "@/render/map/wallBuyView";
const SILHOUETTE_MODULE = "@/render/models/weaponSilhouette";
const LABEL_MODULE = "@/render/textures/priceLabel";
const VISUAL_MODULE = "@/config/visualConfig";
const MAX_TEXTURE_PX = 512;
const SPOT_RADIUS_M = 1;
const LABEL_SPOT_RADIUS_M = 0.5;
const LABEL_PRICE = 1234;
const FORMER_LABEL_WIDTH_M = 0.9;
const FORMER_LABEL_HEIGHT_M = 0.225;
const FORMER_LABEL_FONT_PX = 72;
const WEAPON_IDS: readonly WeaponId[] = ["pistol", "smg", "carbine", "shotgun"];
const NAMED_PARTS = ["wallBuyPlates", "wallBuySilhouettes", "wallBuyLabels"];

type ViewHandle = { dispose: () => void };

const loadView = async () => {
  const viewModule = await import(/* @vite-ignore */ VIEW_MODULE);
  const visualModule = await import(/* @vite-ignore */ VISUAL_MODULE);
  const scene = new THREE.Scene();
  const handle: ViewHandle = viewModule.createWallBuyView(scene);
  return { scene, handle, create: viewModule.createWallBuyView as (target: THREE.Scene) => ViewHandle, visual: visualModule.VISUAL_CONFIG };
};

const named = (scene: THREE.Scene, name: string): THREE.Object3D => {
  const found = scene.getObjectByName(name);
  if (!found) throw new Error(`${name} missing`);
  return found;
};

const labelsOf = (scene: THREE.Scene): THREE.Mesh[] => named(scene, "wallBuyLabels").children.filter((child): child is THREE.Mesh => child instanceof THREE.Mesh);

const countMeshes = (scene: THREE.Scene): number => {
  let count = 0;
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh) count++;
  });
  return count;
};

const verticesOf = (mesh: THREE.Mesh): THREE.Vector3[] => {
  const position = mesh.geometry.getAttribute("position");
  return Array.from({ length: position.count }, (_, index) => new THREE.Vector3().fromBufferAttribute(position, index));
};

const hasVertexNear = (mesh: THREE.Mesh, x: number, z: number, radiusM: number): boolean => verticesOf(mesh).some((vertex) => Math.hypot(vertex.x - x, vertex.z - z) <= radiusM);

const recordingContext = (calls: unknown[][]): CanvasRenderingContext2D =>
  new Proxy({} as Record<string, unknown>, {
    get: (target, key: string) => {
      if (key in target) return target[key];
      if (key === "measureText") return () => ({ width: 1 });
      return (...args: unknown[]) => calls.push([key, ...args]);
    },
    set: (target, key: string, value) => {
      target[key] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;

describe("wallBuyView", () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("adds one merged plate mesh, one merged silhouette mesh and one label group", async () => {
    const { scene } = await loadView();
    for (const name of NAMED_PARTS) expect(scene.getObjectByName(name)).toBeDefined();
    expect(named(scene, "wallBuyPlates")).toBeInstanceOf(THREE.Mesh);
    expect(named(scene, "wallBuySilhouettes")).toBeInstanceOf(THREE.Mesh);
    expect(scene.children.filter((child) => child.name === "wallBuyPlates")).toHaveLength(1);
    expect(scene.children.filter((child) => child.name === "wallBuySilhouettes")).toHaveLength(1);
  });

  it("keeps the draw calls to two merged meshes plus one label per wall spot", async () => {
    const { scene } = await loadView();
    expect(countMeshes(scene)).toBe(2 + WALL_BUYS.length);
  });

  it("places a silhouette and a plate at every wall spot", async () => {
    const { scene } = await loadView();
    for (const name of ["wallBuyPlates", "wallBuySilhouettes"]) {
      const mesh = named(scene, name) as THREE.Mesh;
      for (const buy of WALL_BUYS) expect(hasVertexNear(mesh, buy.x, buy.z, SPOT_RADIUS_M)).toBe(true);
    }
  });

  it("keeps every silhouette vertex inside the station", async () => {
    const { scene } = await loadView();
    for (const vertex of verticesOf(named(scene, "wallBuySilhouettes") as THREE.Mesh)) {
      expect(Math.abs(vertex.x)).toBeLessThan(STATION_LAYOUT.HALF_WIDTH_M);
      expect(Math.abs(vertex.z)).toBeLessThan(STATION_LAYOUT.HALF_DEPTH_M);
      expect(vertex.y).toBeGreaterThan(0);
      expect(vertex.y).toBeLessThan(STATION_LAYOUT.WALL_HEIGHT_M);
    }
  });

  it("puts one label per wall spot facing into the room below the silhouette", async () => {
    const { scene, visual } = await loadView();
    const labels = labelsOf(scene);
    expect(labels).toHaveLength(WALL_BUYS.length);
    WALL_BUYS.forEach((buy, index) => {
      const label = labels[index];
      expect(Math.hypot((label?.position.x ?? 99) - buy.x, (label?.position.z ?? 99) - buy.z)).toBeLessThan(LABEL_SPOT_RADIUS_M);
      expect(label?.rotation.y).toBeCloseTo(buy.facing, 6);
      expect(label?.position.y).toBeLessThan(visual.WALL_BUY.PLATE.CENTER_Y_M);
    });
  });

  it("draws the price label larger than before while the canvas stays within 512px", async () => {
    const { scene, visual } = await loadView();
    const label = visual.WALL_BUY.LABEL;
    const plate = visual.WALL_BUY.PLATE;
    const fontPx = Number(/(\d+)px/.exec(label.FONT)?.[1]);
    expect(label.WIDTH_M).toBeGreaterThan(FORMER_LABEL_WIDTH_M);
    expect(label.HEIGHT_M).toBeGreaterThan(FORMER_LABEL_HEIGHT_M);
    expect(fontPx).toBeGreaterThan(FORMER_LABEL_FONT_PX);
    expect(fontPx).toBeLessThanOrEqual(label.CANVAS_HEIGHT_PX - label.BORDER_PX * 2);
    expect(label.CANVAS_WIDTH_PX).toBeLessThanOrEqual(MAX_TEXTURE_PX);
    expect(label.CANVAS_HEIGHT_PX).toBeLessThanOrEqual(MAX_TEXTURE_PX);
    expect(label.WIDTH_M / label.HEIGHT_M).toBeCloseTo(label.CANVAS_WIDTH_PX / label.CANVAS_HEIGHT_PX, 6);
    expect(label.WIDTH_M).toBeLessThan(plate.WIDTH_M);
    expect(label.CENTER_Y_M + label.HEIGHT_M / 2).toBeLessThan(plate.CENTER_Y_M - plate.HEIGHT_M / 2);
    expect(label.CENTER_Y_M - label.HEIGHT_M / 2).toBeGreaterThan(0);
    for (const mesh of labelsOf(scene)) {
      const geometry = mesh.geometry as THREE.PlaneGeometry;
      expect(geometry.parameters.width).toBe(label.WIDTH_M);
      expect(geometry.parameters.height).toBe(label.HEIGHT_M);
    }
  });

  it("textures each label with a cached canvas of 512px or less and mipmaps", async () => {
    const { scene } = await loadView();
    for (const label of labelsOf(scene)) {
      const material = label.material as THREE.MeshBasicMaterial;
      const image = material.map?.image as HTMLCanvasElement;
      expect(image.width).toBeLessThanOrEqual(MAX_TEXTURE_PX);
      expect(image.height).toBeLessThanOrEqual(MAX_TEXTURE_PX);
      expect(material.map?.generateMipmaps).toBe(true);
    }
  });

  it("reuses the label texture of a price across two views and distinguishes prices", async () => {
    const { scene, create } = await loadView();
    const second = new THREE.Scene();
    create(second);
    const textures = (target: THREE.Scene): (THREE.Texture | null | undefined)[] => labelsOf(target).map((label) => (label.material as THREE.MeshBasicMaterial).map);
    expect(textures(second)).toEqual(textures(scene));
    expect(new Set(textures(scene)).size).toBe(new Set(WALL_BUYS.map((buy) => WEAPONS[buy.weaponId].WALL_PRICE_POINTS)).size);
  });

  it("removes everything it added on dispose", async () => {
    const { scene, handle } = await loadView();
    handle.dispose();
    for (const name of NAMED_PARTS) expect(scene.getObjectByName(name)).toBeUndefined();
    expect(countMeshes(scene)).toBe(0);
  });
});

describe("weaponSilhouette", () => {
  it("defines parts for every weapon in the visual config", async () => {
    const visual = (await import(/* @vite-ignore */ VISUAL_MODULE)).VISUAL_CONFIG;
    for (const weaponId of WEAPON_IDS) expect(visual.WALL_BUY.SILHOUETTES[weaponId].length).toBeGreaterThan(0);
  });

  it("builds one non empty geometry per weapon that fits on the plate and differs between weapons", async () => {
    const { createWeaponSilhouette } = await import(/* @vite-ignore */ SILHOUETTE_MODULE);
    const visual = (await import(/* @vite-ignore */ VISUAL_MODULE)).VISUAL_CONFIG;
    const signatures = new Set<string>();
    for (const weaponId of WEAPON_IDS) {
      const geometry = createWeaponSilhouette(weaponId) as THREE.BufferGeometry;
      expect(geometry.getAttribute("position").count).toBeGreaterThan(0);
      geometry.computeBoundingBox();
      const size = geometry.boundingBox?.getSize(new THREE.Vector3()) ?? new THREE.Vector3();
      expect(size.x).toBeLessThanOrEqual(visual.WALL_BUY.PLATE.WIDTH_M);
      expect(size.y).toBeLessThanOrEqual(visual.WALL_BUY.PLATE.HEIGHT_M);
      signatures.add(`${size.x.toFixed(3)}:${size.y.toFixed(3)}:${geometry.getAttribute("position").count}`);
    }
    expect(signatures.size).toBe(WEAPON_IDS.length);
  });

  it("builds one primitive per configured part", async () => {
    const { createWeaponSilhouette } = await import(/* @vite-ignore */ SILHOUETTE_MODULE);
    const visual = (await import(/* @vite-ignore */ VISUAL_MODULE)).VISUAL_CONFIG;
    const geometry = createWeaponSilhouette("smg") as THREE.BufferGeometry;
    const parts = visual.WALL_BUY.SILHOUETTES.smg as readonly { shape: string }[];
    const boxVertices = new THREE.BoxGeometry().getAttribute("position").count;
    const boxCount = parts.filter((part) => part.shape === "box").length;
    expect(geometry.getAttribute("position").count).toBeGreaterThanOrEqual(boxCount * boxVertices);
  });
});

describe("priceLabel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes the price as points text on the label canvas", async () => {
    const calls: unknown[][] = [];
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(recordingContext(calls) as never);
    const { priceLabelTexture } = await import(/* @vite-ignore */ LABEL_MODULE);
    priceLabelTexture(LABEL_PRICE);
    const texts = calls.filter((call) => call[0] === "fillText").map((call) => call[1]);
    expect(texts).toContain(TEXTS.points(LABEL_PRICE));
  });

  it("returns the same texture for the same price and another for another price", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const { priceLabelTexture } = await import(/* @vite-ignore */ LABEL_MODULE);
    const first = priceLabelTexture(LABEL_PRICE + 1);
    expect(priceLabelTexture(LABEL_PRICE + 1)).toBe(first);
    expect(priceLabelTexture(LABEL_PRICE + 2)).not.toBe(first);
  });
});
