import * as THREE from "three";
import { PLAYER_CONFIG } from "@/config/playerConfig";
import { VISUAL_CONFIG } from "@/config/visualConfig";
import type { ViewPartSpec } from "@/config/visualConfig";
import { WEAPONS } from "@/config/weaponConfig";
import type { WeaponId } from "@/config/weaponConfig";
import { buildGlovedHand } from "@/render/models/handModel";
import { buildWeaponModel } from "@/render/models/weaponModel";
import { createCasingPool } from "@/render/weapon/casingPool";
import type { GameEvent } from "@/logic/game/gameEvents";
import type { InputState } from "@/logic/input/inputState";
import type { PlayerState } from "@/logic/player/playerMotion";
import type { WeaponState } from "@/logic/weapons/weaponState";

export type ViewModel = {
  group: THREE.Group;
  update: (frameS: number, player: Readonly<PlayerState>, weapon: Readonly<WeaponState>, events: readonly GameEvent[], input: Readonly<InputState>) => void;
  dispose: () => void;
};

type SlidePart = { mesh: THREE.Mesh; baseZ: number };
type MagazinePart = { mesh: THREE.Mesh; baseY: number };
type WeaponModel = {
  readonly weaponId: WeaponId;
  readonly group: THREE.Group;
  readonly emissive: THREE.MeshStandardMaterial;
  readonly slideParts: readonly SlidePart[];
  readonly magazine: MagazinePart | undefined;
};

const VIEW = VISUAL_CONFIG.VIEW_MODEL;
const BOB_DOUBLE = 2;
const MAGAZINE_PART = "magazine";
const WEAPON_IDS = Object.keys(VIEW.WEAPON_MODELS) as WeaponId[];

const buildPart = (spec: ViewPartSpec): THREE.Mesh => {
  const geometry = new THREE.BoxGeometry(spec.size.x, spec.size.y, spec.size.z);
  const material = new THREE.MeshStandardMaterial({ color: spec.color, metalness: spec.metalness, roughness: spec.roughness });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = spec.name;
  mesh.position.set(spec.position.x, spec.position.y, spec.position.z);
  mesh.rotation.x = spec.tiltX;
  return mesh;
};

const assembleWeapon = (weaponId: WeaponId): WeaponModel => {
  const { group, materials } = buildWeaponModel(weaponId);
  const slideParts: SlidePart[] = [];
  let magazine: MagazinePart | undefined;
  for (const spec of VIEW.WEAPON_MODELS[weaponId]) {
    const mesh = group.getObjectByName(spec.name);
    if (!(mesh instanceof THREE.Mesh)) continue;
    if (spec.slide) slideParts.push({ mesh, baseZ: spec.position.z });
    if (spec.name === MAGAZINE_PART) magazine = { mesh, baseY: spec.position.y };
  }
  return { weaponId, group, emissive: materials.emissive, slideParts, magazine };
};

const disposeTree = (root: THREE.Object3D): void => {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    if (object.material instanceof THREE.Material) object.material.dispose();
  });
};

const approach = (value: number, target: number, rate: number, frameS: number): number => value + (target - value) * Math.min(1, rate * frameS);

export const createViewModel = (camera: THREE.Camera): ViewModel => {
  const group = new THREE.Group();
  group.name = "viewModel";
  group.position.set(VIEW.REST_POSITION.x, VIEW.REST_POSITION.y, VIEW.REST_POSITION.z);

  const held = new THREE.Group();
  held.name = "heldWeapons";
  const models = WEAPON_IDS.map(assembleWeapon);
  for (const model of models) held.add(model.group);

  const hand = buildGlovedHand();
  hand.position.set(VIEW.HAND_POSITION.x, VIEW.HAND_POSITION.y, VIEW.HAND_POSITION.z);
  held.add(hand);
  const casings = createCasingPool(held);

  const flash = new THREE.Mesh(
    new THREE.ConeGeometry(VIEW.FLASH_RADIUS_M, VIEW.FLASH_LENGTH_M, VIEW.FLASH_RADIAL_SEGMENTS).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: VIEW.FLASH_COLOR, transparent: true, opacity: VIEW.FLASH_OPACITY, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  flash.name = "muzzleFlash";
  flash.position.set(VIEW.FLASH_X_M, VIEW.MUZZLE_Y_M.pistol, VIEW.MUZZLE_Z_M.pistol);
  flash.visible = false;
  held.add(flash);

  const knifePivot = new THREE.Group();
  knifePivot.name = "knifePivot";
  knifePivot.position.set(VIEW.SLASH_PIVOT.x - VIEW.REST_POSITION.x, VIEW.SLASH_PIVOT.y - VIEW.REST_POSITION.y, VIEW.SLASH_PIVOT.z - VIEW.REST_POSITION.z);
  knifePivot.rotation.x = VIEW.SLASH_TILT_X_RAD;
  const knife = new THREE.Group();
  knife.name = "knife";
  knife.visible = false;
  for (const spec of VIEW.KNIFE_PARTS) knife.add(buildPart(spec));
  knifePivot.add(knife);

  group.add(held, knifePivot);
  camera.add(group);

  let hasPrevious = false;
  let previousX = 0;
  let previousZ = 0;
  let bobBlend = 0;
  let bobPhase = 0;
  let aimBlend = 0;
  let kick = 0;
  let flashRemainingS = 0;
  let dipRemainingS = 0;
  let dipDurationS = 1;
  let slashRemainingS = 0;
  let energyPhase = 0;
  let active: WeaponModel | undefined = models[0];

  const consume = (events: readonly GameEvent[], weapon: Readonly<WeaponState>): void => {
    for (const event of events) {
      if (event.kind === "shotFired") {
        kick = 1;
        flashRemainingS = VIEW.FLASH_S;
        const port = VIEW.EJECT_PORT[weapon.weaponId];
        if (VIEW.EJECTS_CASING[weapon.weaponId]) casings.eject(port.x, port.y, port.z);
      } else if (event.kind === "reloadStarted") {
        dipDurationS = WEAPONS[weapon.weaponId].RELOAD_S;
        dipRemainingS = dipDurationS;
      } else if (event.kind === "knifeSwung") {
        slashRemainingS = VIEW.SLASH_S;
      }
    }
  };

  const walkBlend = (player: Readonly<PlayerState>, frameS: number): void => {
    if (!hasPrevious) {
      previousX = player.x;
      previousZ = player.z;
      hasPrevious = true;
    }
    const speed = frameS > 0 ? Math.hypot(player.x - previousX, player.z - previousZ) / frameS : 0;
    previousX = player.x;
    previousZ = player.z;
    bobBlend = approach(bobBlend, Math.min(1, speed / PLAYER_CONFIG.PLAYER_WALK_SPEED_MPS), VIEW.BOB_BLEND_RATE, frameS);
    bobPhase += speed * frameS * VIEW.BOB_RAD_PER_M;
  };

  const selectWeapon = (weaponId: WeaponId, shown: boolean): void => {
    for (const model of models) {
      model.group.visible = shown && model.weaponId === weaponId;
      if (model.weaponId === weaponId) active = model;
    }
    flash.position.y = VIEW.MUZZLE_Y_M[weaponId];
    flash.position.z = VIEW.MUZZLE_Z_M[weaponId];
  };

  const update: ViewModel["update"] = (frameS, player, weapon, events, input) => {
    consume(events, weapon);
    walkBlend(player, frameS);
    aimBlend = approach(aimBlend, input.aim ? 1 : 0, VIEW.AIM_BLEND_RATE, frameS);
    kick *= Math.exp(-VIEW.KICK_RECOVER_RATE * frameS);
    flashRemainingS = Math.max(0, flashRemainingS - frameS);
    dipRemainingS = Math.max(0, dipRemainingS - frameS);
    slashRemainingS = Math.max(0, slashRemainingS - frameS);
    energyPhase += VIEW.ENERGY_PULSE_RAD_PER_S * frameS;
    const energy = VIEW.ENERGY_EMISSIVE_MIN + (VIEW.ENERGY_EMISSIVE_MAX - VIEW.ENERGY_EMISSIVE_MIN) * ((1 + Math.sin(energyPhase)) / BOB_DOUBLE);
    for (const model of models) model.emissive.emissiveIntensity = energy;

    const dip = dipRemainingS > 0 ? Math.sin(Math.PI * (1 - dipRemainingS / dipDurationS)) : 0;
    const bobX = Math.sin(bobPhase) * VIEW.BOB_X_M * bobBlend;
    const bobY = Math.sin(bobPhase * BOB_DOUBLE) * VIEW.BOB_Y_M * bobBlend;
    group.position.x = VIEW.REST_POSITION.x + (VIEW.AIM_POSITION.x - VIEW.REST_POSITION.x) * aimBlend + bobX;
    group.position.y = VIEW.REST_POSITION.y + (VIEW.AIM_POSITION.y - VIEW.REST_POSITION.y) * aimBlend + bobY - dip * VIEW.DIP_Y_M;
    group.position.z = VIEW.REST_POSITION.z + (VIEW.AIM_POSITION.z - VIEW.REST_POSITION.z) * aimBlend + kick * VIEW.KICK_Z_M;
    group.rotation.x = kick * VIEW.KICK_PITCH_RAD + dip * VIEW.DIP_PITCH_RAD;
    group.rotation.z = dip * VIEW.DIP_ROLL_RAD;

    const slashing = slashRemainingS > 0;
    selectWeapon(weapon.weaponId, !slashing);
    hand.visible = !slashing;
    casings.update(frameS);
    const reloadProgress = dipRemainingS > 0 ? 1 - dipRemainingS / dipDurationS : 0;
    const magazineOut = 1 - Math.abs(reloadProgress * 2 - 1);
    for (const model of models) {
      if (model.magazine) model.magazine.mesh.position.y = model.magazine.baseY - (model === active ? magazineOut * VIEW.MAG_DROP_M : 0);
    }
    const slideOffset = (weapon.mag <= 0 ? VIEW.SLIDE_LOCK_BACK_M : 0) + kick * VIEW.SLIDE_KICK_M;
    if (active) for (const part of active.slideParts) part.mesh.position.z = part.baseZ + slideOffset;
    flash.visible = flashRemainingS > 0 && !slashing;

    const progress = 1 - slashRemainingS / VIEW.SLASH_S;
    const eased = 1 - Math.pow(1 - progress, VIEW.SLASH_EASE_POWER);
    knifePivot.rotation.z = slashing ? VIEW.SLASH_FROM_RAD + (VIEW.SLASH_TO_RAD - VIEW.SLASH_FROM_RAD) * eased : VIEW.SLASH_FROM_RAD;
    knife.visible = slashing;
  };

  const dispose = (): void => {
    camera.remove(group);
    disposeTree(group);
  };

  return { group, update, dispose };
};
