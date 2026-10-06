import * as THREE from "three";
import { BARRICADE, STATION_LAYOUT } from "@/config/mapConfig";
import { createStationLayout } from "@/logic/map/stationLayout";
import { createBarricades, planksOf, tearPlank } from "@/logic/map/barricades";
import type { GameEvent } from "@/logic/game/gameEvents";

const VIEW_MODULE = "@/render/map/barricadeView";
const PLANK_REACH_M = 0.8;

const load = async () => {
  const viewModule = await import(/* @vite-ignore */ VIEW_MODULE);
  const scene = new THREE.Scene();
  const layout = createStationLayout();
  const view = viewModule.createBarricadeView(scene, layout);
  const barricades = createBarricades(layout.windows);
  const events: GameEvent[] = [];
  const windowGroup = (windowId: string): THREE.Object3D => {
    const found = scene.getObjectByName(`barricade-${windowId}`);
    if (!found) throw new Error(`barricade-${windowId} missing`);
    return found;
  };
  const visiblePlanks = (windowId: string): THREE.Object3D[] => windowGroup(windowId).children.filter((plank) => plank.visible);
  return { view, scene, layout, barricades, events, windowGroup, visiblePlanks };
};

describe("barricadeView", () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates PLANKS_PER_WINDOW plank meshes for each of the full window list at load", async () => {
    const { scene, layout, windowGroup } = await load();
    expect(scene.getObjectByName("barricades")?.children).toHaveLength(layout.windows.length);
    for (const windowSpec of layout.windows) {
      const planks = windowGroup(windowSpec.id).children;
      expect(planks).toHaveLength(BARRICADE.PLANKS_PER_WINDOW);
      expect(planks.every((plank) => plank instanceof THREE.Mesh)).toBe(true);
    }
  });

  it("shares one geometry and one material between every plank", async () => {
    const { scene } = await load();
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material | THREE.Material[]>();
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      geometries.add(object.geometry);
      materials.add(object.material);
    });
    expect(geometries.size).toBe(1);
    expect(materials.size).toBe(1);
    expect((([...materials][0]) as THREE.MeshStandardMaterial).map).toBeTruthy();
  });

  it("shows every plank of a fresh barricade set", async () => {
    const { view, barricades, layout, visiblePlanks } = await load();
    view.update(barricades);
    for (const windowSpec of layout.windows) expect(visiblePlanks(windowSpec.id)).toHaveLength(BARRICADE.PLANKS_PER_WINDOW);
  });

  it("shows exactly planksOf(windowId) planks for every window", async () => {
    const { view, barricades, layout, visiblePlanks } = await load();
    barricades.windows.forEach((barricadeWindow, index) => {
      barricadeWindow.planks = index % (BARRICADE.PLANKS_PER_WINDOW + 1);
    });
    view.update(barricades);
    for (const windowSpec of layout.windows) expect(visiblePlanks(windowSpec.id)).toHaveLength(planksOf(barricades, windowSpec.id));
  });

  it("follows the logic as a zombie tears the planks one by one", async () => {
    const { view, barricades, events, visiblePlanks } = await load();
    const windowId = barricades.windows[0]?.id ?? "";
    for (let torn = 1; torn <= BARRICADE.PLANKS_PER_WINDOW; torn++) {
      tearPlank(barricades, windowId, events);
      view.update(barricades);
      expect(visiblePlanks(windowId)).toHaveLength(BARRICADE.PLANKS_PER_WINDOW - torn);
    }
    const other = barricades.windows[1]?.id ?? "";
    expect(visiblePlanks(other)).toHaveLength(BARRICADE.PLANKS_PER_WINDOW);
    const barricadeWindow = barricades.windows[0];
    if (barricadeWindow) barricadeWindow.planks = 2;
    view.update(barricades);
    expect(visiblePlanks(windowId)).toHaveLength(2);
  });

  it("nails the planks on the room side of their own window", async () => {
    const { layout, windowGroup } = await load();
    for (const windowSpec of layout.windows) {
      const wallX = windowSpec.x + Math.sin(windowSpec.facing) * STATION_LAYOUT.WINDOW_SPAWN_OUTSET_M;
      const wallZ = windowSpec.z + Math.cos(windowSpec.facing) * STATION_LAYOUT.WINDOW_SPAWN_OUTSET_M;
      for (const plank of windowGroup(windowSpec.id).children) {
        const position = plank.getWorldPosition(new THREE.Vector3());
        const inward = (position.x - wallX) * Math.sin(windowSpec.facing) + (position.z - wallZ) * Math.cos(windowSpec.facing);
        expect(inward).toBeGreaterThan(0);
        expect(Math.hypot(position.x - wallX, position.z - wallZ)).toBeLessThan(PLANK_REACH_M);
      }
    }
  });

  it("ignores a window the view does not know", async () => {
    const { view, barricades } = await load();
    const unknown = createBarricades([{ id: "nowhere", x: 0, z: 0 }]);
    expect(() => view.update(unknown)).not.toThrow();
    expect(() => view.update(barricades)).not.toThrow();
  });

  it("does not add or remove scene objects while updating", async () => {
    const { view, barricades, scene } = await load();
    let before = 0;
    scene.traverse(() => before++);
    for (let planks = BARRICADE.PLANKS_PER_WINDOW; planks >= 0; planks--) {
      for (const barricadeWindow of barricades.windows) barricadeWindow.planks = planks;
      view.update(barricades);
    }
    let after = 0;
    scene.traverse(() => after++);
    expect(after).toBe(before);
  });

  it("removes the barricades from the scene on dispose", async () => {
    const { view, scene } = await load();
    view.dispose();
    expect(scene.getObjectByName("barricades")).toBeUndefined();
  });
});
