import type { WeaponId } from "@/config/weaponConfig";

export type BoxPoolEntry = { readonly weaponId: WeaponId; readonly weight: number };

export type BoxSpotSpec = { readonly x: number; readonly z: number; readonly facing: number };

export const BOX_COST_POINTS = 950;
export const BOX_ROLL_S = 4;
export const BOX_OFFER_S = 10;
export const BOX_MOVE_S = 3;
export const TEDDY_FROM_ROLL = 4;
export const TEDDY_CHANCE = 0.25;

export const BOX_POOL: readonly BoxPoolEntry[] = [
  { weaponId: "smg", weight: 1 },
  { weaponId: "carbine", weight: 1 },
  { weaponId: "shotgun", weight: 1 },
  { weaponId: "lmg", weight: 1 },
  { weaponId: "rayGun", weight: 0.5 },
];

export const BOX_SPOTS: readonly BoxSpotSpec[] = [
  { x: -7.2, z: -2.6, facing: Math.PI / 2 },
  { x: 7.2, z: 2.6, facing: -Math.PI / 2 },
  { x: 3.5, z: -5.2, facing: 0 },
];

export const BOX_START_SPOT = 0;
