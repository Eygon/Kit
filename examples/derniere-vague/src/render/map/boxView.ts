import * as THREE from "three";
import { BOX_MOVE_S, BOX_POOL, BOX_SPOTS } from "@/config/boxConfig";
import { VISUAL_CONFIG } from "@/config/visualConfig";
import { WEAPONS } from "@/config/weaponConfig";
import type { WeaponId } from "@/config/weaponConfig";
import type { MysteryBox } from "@/logic/economy/mysteryBox";
import { createBoxModel, poseBoxLid } from "@/render/models/boxModel";
import { createWeaponSilhouette } from "@/render/models/weaponSilhouette";

export type BoxView = {
  update: (box: Readonly<MysteryBox>, frameS: number) => void;
  dispose: () => void;
};

type SilhouetteEntry = { readonly weaponId: WeaponId; readonly mesh: THREE.Mesh };

const BOX = VISUAL_CONFIG.BOX;
const HALF = 0.5;
const CYCLE_WEAPON_IDS: readonly WeaponId[] = BOX_POOL.map((entry) => entry.weaponId);
const ALL_WEAPON_IDS = Object.keys(WEAPONS) as WeaponId[];

const approach = (value: number, target: number, rate: number, frameS: number): number => value + (target - value) * Math.min(1, rate * frameS);

const shownWeapon = (state: MysteryBox["state"], rollElapsedS: number): WeaponId | null => {
  if (state.kind === "offering") return state.weaponId;
  if (state.kind !== "rolling") return null;
  return CYCLE_WEAPON_IDS[Math.floor(rollElapsedS / BOX.SILHOUETTE.CYCLE_S) % CYCLE_WEAPON_IDS.length] ?? null;
};

const moveProgress = (state: MysteryBox["state"]): number => (state.kind === "moving" ? Math.min(1, Math.max(0, 1 - state.remainingS / BOX_MOVE_S)) : 0);

export const createBoxView = (scene: THREE.Scene): BoxView => {
  const model = createBoxModel();
  const silhouetteMaterial = new THREE.MeshStandardMaterial({
    color: BOX.SILHOUETTE.COLOR,
    emissive: BOX.SILHOUETTE.EMISSIVE,
    emissiveIntensity: BOX.SILHOUETTE.EMISSIVE_INTENSITY,
    roughness: BOX.SILHOUETTE.ROUGHNESS,
    metalness: BOX.SILHOUETTE.METALNESS,
  });
  const silhouettes = new THREE.Group();
  silhouettes.name = "boxSilhouettes";
  silhouettes.scale.setScalar(BOX.SILHOUETTE.SCALE);
  silhouettes.visible = false;
  const entries: SilhouetteEntry[] = ALL_WEAPON_IDS.map((weaponId) => {
    const mesh = new THREE.Mesh(createWeaponSilhouette(weaponId), silhouetteMaterial);
    mesh.name = `boxSilhouette-${weaponId}`;
    mesh.visible = false;
    silhouettes.add(mesh);
    return { weaponId, mesh };
  });
  model.root.add(silhouettes);
  scene.add(model.root);

  let lidOpen = 0;
  let timeS = 0;
  let rollElapsedS = 0;

  const placeAtSpot = (spotIndex: number): void => {
    const spot = BOX_SPOTS[spotIndex];
    if (!spot) return;
    model.root.position.set(spot.x, 0, spot.z);
    model.root.rotation.y = spot.facing;
  };

  const animateMove = (state: MysteryBox["state"]): void => {
    const progress = moveProgress(state);
    const eased = 1 - Math.pow(1 - progress, BOX.MOVE.EASE_POWER);
    model.chest.position.y = BOX.MOVE.LIFT_M * eased;
    model.chest.rotation.y = progress > 0 ? BOX.MOVE.SPIN_RAD * eased : 0;
    model.beam.visible = state.kind !== "moving";
  };

  const animateSilhouette = (weaponId: WeaponId | null): void => {
    silhouettes.visible = weaponId !== null;
    for (const entry of entries) entry.mesh.visible = entry.weaponId === weaponId;
    silhouettes.position.y = BOX.SILHOUETTE.HEIGHT_M + Math.sin(timeS * BOX.SILHOUETTE.BOB_RAD_S) * BOX.SILHOUETTE.BOB_M;
    silhouettes.rotation.y = Math.sin(timeS * BOX.SILHOUETTE.BOB_RAD_S * HALF) * BOX.SILHOUETTE.TILT_RAD;
  };

  const update: BoxView["update"] = (box, frameS) => {
    const state = box.state;
    timeS += frameS;
    rollElapsedS = state.kind === "rolling" ? rollElapsedS + frameS : 0;
    placeAtSpot(box.spot);
    const isOpen = state.kind === "rolling" || state.kind === "offering";
    lidOpen = approach(lidOpen, isOpen ? 1 : 0, BOX.LID.OPEN_RATE, frameS);
    poseBoxLid(model, lidOpen);
    animateMove(state);
    animateSilhouette(shownWeapon(state, rollElapsedS));
    model.beamMaterial.opacity = BOX.BEAM.OPACITY * (1 - BOX.BEAM.PULSE_DEPTH * (HALF + HALF * Math.sin(timeS * BOX.BEAM.PULSE_RAD_S)));
  };

  const dispose = (): void => {
    scene.remove(model.root);
    entries.forEach((entry) => entry.mesh.geometry.dispose());
    silhouetteMaterial.dispose();
    model.dispose();
  };

  return { update, dispose };
};
