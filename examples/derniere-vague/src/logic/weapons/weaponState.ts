import { KNIFE, WEAPONS } from "@/config/weaponConfig";
import type { WeaponId, WeaponSpec } from "@/config/weaponConfig";
import { GAME_EVENTS } from "@/logic/game/gameEvents";
import type { GameEvent } from "@/logic/game/gameEvents";
import type { InputState } from "@/logic/input/inputState";

export type WeaponState = {
  weaponId: WeaponId;
  mag: number;
  reserve: number;
  cooldownS: number;
  reloadRemainingS: number;
  knifeCooldownS: number;
};

export const createWeapon = (weaponId: WeaponId = "pistol"): WeaponState => {
  const spec = WEAPONS[weaponId];
  return { weaponId, mag: spec.MAG_SIZE, reserve: spec.RESERVE_AMMO, cooldownS: 0, reloadRemainingS: 0, knifeCooldownS: 0 };
};

export const shotDamage = (weaponId: WeaponId, head: boolean): number => {
  const spec = WEAPONS[weaponId];
  return head ? spec.DAMAGE * spec.HEAD_MULTIPLIER : spec.DAMAGE;
};

const canReload = (weapon: WeaponState, spec: WeaponSpec): boolean => weapon.reloadRemainingS <= 0 && weapon.mag < spec.MAG_SIZE && weapon.reserve > 0;

const startReload = (weapon: WeaponState, spec: WeaponSpec, events: GameEvent[]): void => {
  weapon.reloadRemainingS = spec.RELOAD_S;
  events.push(GAME_EVENTS.reloadStarted);
};

const finishReload = (weapon: WeaponState, spec: WeaponSpec, events: GameEvent[]): void => {
  const moved = Math.min(spec.MAG_SIZE - weapon.mag, weapon.reserve);
  weapon.mag += moved;
  weapon.reserve -= moved;
  weapon.reloadRemainingS = 0;
  events.push(GAME_EVENTS.reloadDone);
};

const tickTimers = (weapon: WeaponState, spec: WeaponSpec, stepS: number, events: GameEvent[]): void => {
  weapon.cooldownS = Math.max(0, weapon.cooldownS - stepS);
  weapon.knifeCooldownS = Math.max(0, weapon.knifeCooldownS - stepS);
  if (weapon.reloadRemainingS <= 0) return;
  weapon.reloadRemainingS -= stepS;
  if (weapon.reloadRemainingS <= 0) finishReload(weapon, spec, events);
};

const dryFire = (weapon: WeaponState, spec: WeaponSpec, events: GameEvent[]): void => {
  weapon.cooldownS = spec.FIRE_INTERVAL_S;
  events.push(GAME_EVENTS.dryFired);
};

const tryFire = (weapon: WeaponState, spec: WeaponSpec, events: GameEvent[]): void => {
  if (weapon.reloadRemainingS > 0 || weapon.cooldownS > 0) return;
  if (weapon.mag <= 0) {
    if (canReload(weapon, spec)) startReload(weapon, spec, events);
    else dryFire(weapon, spec, events);
    return;
  }
  weapon.mag -= 1;
  weapon.cooldownS = spec.FIRE_INTERVAL_S;
  events.push(GAME_EVENTS.shotFired);
  if (weapon.mag <= 0 && canReload(weapon, spec)) startReload(weapon, spec, events);
};

const tryKnife = (weapon: WeaponState, events: GameEvent[]): void => {
  if (weapon.knifeCooldownS > 0) return;
  weapon.knifeCooldownS = KNIFE.COOLDOWN_S;
  events.push(GAME_EVENTS.knifeSwung);
};

export const updateWeapon = (weapon: WeaponState, input: InputState, stepS: number, events: GameEvent[]): void => {
  const spec = WEAPONS[weapon.weaponId];
  tickTimers(weapon, spec, stepS, events);
  if (input.reload && canReload(weapon, spec)) startReload(weapon, spec, events);
  if (input.fire) tryFire(weapon, spec, events);
  if (input.knife) tryKnife(weapon, events);
};
