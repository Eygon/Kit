import * as THREE from "three";
import { BARRICADE, STATION_LAYOUT } from "@/config/mapConfig";
import { BARRICADE_VISUAL, VISUAL_CONFIG } from "@/config/visualConfig";
import type { Barricades } from "@/logic/map/barricades";
import type { StationLayout } from "@/logic/map/stationLayout";
import { tiledBoxGeometry } from "@/render/map/buildStation";
import { surfaceTexture } from "@/render/textures/surfaceTexture";

export type BarricadeView = {
  update: (barricades: Readonly<Barricades>) => void;
  dispose: () => void;
};

const createWindowPlanks = (windowSpec: StationLayout["windows"][number], geometry: THREE.BufferGeometry, material: THREE.Material, root: THREE.Group): THREE.Mesh[] => {
  const group = new THREE.Group();
  group.name = `barricade-${windowSpec.id}`;
  group.position.set(
    windowSpec.x + Math.sin(windowSpec.facing) * STATION_LAYOUT.WINDOW_SPAWN_OUTSET_M,
    VISUAL_CONFIG.WINDOW_SILL_M + VISUAL_CONFIG.WINDOW_HEIGHT_M / 2,
    windowSpec.z + Math.cos(windowSpec.facing) * STATION_LAYOUT.WINDOW_SPAWN_OUTSET_M,
  );
  group.rotation.y = windowSpec.facing;
  const planks: THREE.Mesh[] = [];
  for (let index = 0; index < BARRICADE.PLANKS_PER_WINDOW; index++) {
    const slot = BARRICADE_VISUAL.SLOTS[index];
    if (!slot) continue;
    const plank = new THREE.Mesh(geometry, material);
    plank.name = `plank-${windowSpec.id}-${index}`;
    plank.position.set(slot.x, slot.y, BARRICADE_VISUAL.PUSH_M + (index % 2) * BARRICADE_VISUAL.STAGGER_M);
    plank.rotation.z = slot.tiltZ;
    plank.scale.x = slot.scaleX;
    group.add(plank);
    planks.push(plank);
  }
  root.add(group);
  return planks;
};

export const createBarricadeView = (scene: THREE.Scene, layout: StationLayout): BarricadeView => {
  const root = new THREE.Group();
  root.name = "barricades";
  const geometry = tiledBoxGeometry(BARRICADE_VISUAL.PLANK_LENGTH_M, BARRICADE_VISUAL.PLANK_HEIGHT_M, BARRICADE_VISUAL.PLANK_DEPTH_M);
  const material = new THREE.MeshStandardMaterial({ color: BARRICADE_VISUAL.TINT, roughness: VISUAL_CONFIG.WOOD_ROUGHNESS, map: surfaceTexture("wood", VISUAL_CONFIG.WOOD_TEXTURE, 1, 1) });
  const planksByWindow = new Map<string, THREE.Mesh[]>();
  for (const windowSpec of layout.windows) planksByWindow.set(windowSpec.id, createWindowPlanks(windowSpec, geometry, material, root));
  scene.add(root);

  const update: BarricadeView["update"] = (barricades) => {
    for (const barricadeWindow of barricades.windows) {
      const planks = planksByWindow.get(barricadeWindow.id);
      if (!planks) continue;
      for (let index = 0; index < planks.length; index++) {
        const plank = planks[index];
        if (plank) plank.visible = index < barricadeWindow.planks;
      }
    }
  };

  const dispose = (): void => {
    scene.remove(root);
    geometry.dispose();
    material.dispose();
  };

  return { update, dispose };
};
