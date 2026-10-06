import type { WeaponId } from "@/config/weaponConfig";
import { WEAPONS } from "@/config/weaponConfig";
import { createWeapon } from "@/logic/weapons/weaponState";
import type { WeaponState } from "@/logic/weapons/weaponState";

export type SlotIndex = 0 | 1;

export type Loadout = {
  readonly slots: [WeaponState, WeaponState | null];
  active: SlotIndex;
};

export const createLoadout = (): Loadout => ({ slots: [createWeapon("pistol"), null], active: 0 });

export const activeWeapon = (loadout: Loadout): WeaponState => {
  const second = loadout.slots[1];
  return loadout.active === 1 && second ? second : loadout.slots[0];
};

export const swapWeapon = (loadout: Loadout): void => {
  if (loadout.slots[1]) loadout.active = loadout.active === 0 ? 1 : 0;
};

export const giveWeapon = (loadout: Loadout, weaponId: WeaponId): void => {
  if (!loadout.slots[1]) {
    loadout.slots[1] = createWeapon(weaponId);
    loadout.active = 1;
    return;
  }
  loadout.slots[loadout.active] = createWeapon(weaponId);
};

const findOwned = (loadout: Loadout, weaponId: WeaponId): WeaponState | null => {
  const [first, second] = loadout.slots;
  if (first.weaponId === weaponId) return first;
  return second && second.weaponId === weaponId ? second : null;
};

export const needsAmmo = (loadout: Loadout, weaponId: WeaponId): boolean => {
  const weapon = findOwned(loadout, weaponId);
  if (!weapon) return false;
  const spec = WEAPONS[weaponId];
  return weapon.mag < spec.MAG_SIZE || weapon.reserve < spec.RESERVE_AMMO;
};

export const refillAmmo = (loadout: Loadout, weaponId: WeaponId): boolean => {
  const weapon = findOwned(loadout, weaponId);
  if (!weapon || !needsAmmo(loadout, weaponId)) return false;
  const spec = WEAPONS[weaponId];
  weapon.mag = spec.MAG_SIZE;
  weapon.reserve = spec.RESERVE_AMMO;
  weapon.reloadRemainingS = 0;
  return true;
};

export const refillAllAmmo = (loadout: Loadout): void => {
  for (const weapon of loadout.slots) {
    if (!weapon) continue;
    const spec = WEAPONS[weapon.weaponId];
    weapon.mag = spec.MAG_SIZE;
    weapon.reserve = spec.RESERVE_AMMO;
    weapon.reloadRemainingS = 0;
  }
};
