export type WeaponId = "pistol" | "smg" | "carbine" | "shotgun" | "lmg" | "rayGun";

export type PelletOffset = { readonly yaw: number; readonly pitch: number };

export type WeaponSpec = {
  readonly DAMAGE: number;
  readonly HEAD_MULTIPLIER: number;
  readonly MAG_SIZE: number;
  readonly RESERVE_AMMO: number;
  readonly FIRE_INTERVAL_S: number;
  readonly RELOAD_S: number;
  readonly RANGE_M: number;
  readonly PELLETS: number;
  readonly PELLET_OFFSETS_RAD: readonly PelletOffset[];
  readonly WALL_PRICE_POINTS: number;
  readonly AMMO_PRICE_POINTS: number;
};

const CENTERED_PELLET: readonly PelletOffset[] = [{ yaw: 0, pitch: 0 }];

export const WEAPONS: Readonly<Record<WeaponId, WeaponSpec>> = {
  pistol: {
    DAMAGE: 25,
    HEAD_MULTIPLIER: 2,
    MAG_SIZE: 8,
    RESERVE_AMMO: 32,
    FIRE_INTERVAL_S: 0.25,
    RELOAD_S: 1.6,
    RANGE_M: 40,
    PELLETS: 1,
    PELLET_OFFSETS_RAD: CENTERED_PELLET,
    WALL_PRICE_POINTS: 0,
    AMMO_PRICE_POINTS: 0,
  },
  smg: {
    DAMAGE: 20,
    HEAD_MULTIPLIER: 2,
    MAG_SIZE: 30,
    RESERVE_AMMO: 120,
    FIRE_INTERVAL_S: 0.08,
    RELOAD_S: 2,
    RANGE_M: 30,
    PELLETS: 1,
    PELLET_OFFSETS_RAD: CENTERED_PELLET,
    WALL_PRICE_POINTS: 1000,
    AMMO_PRICE_POINTS: 500,
  },
  carbine: {
    DAMAGE: 40,
    HEAD_MULTIPLIER: 2,
    MAG_SIZE: 20,
    RESERVE_AMMO: 100,
    FIRE_INTERVAL_S: 0.14,
    RELOAD_S: 2.2,
    RANGE_M: 50,
    PELLETS: 1,
    PELLET_OFFSETS_RAD: CENTERED_PELLET,
    WALL_PRICE_POINTS: 1200,
    AMMO_PRICE_POINTS: 600,
  },
  shotgun: {
    DAMAGE: 18,
    HEAD_MULTIPLIER: 1.5,
    MAG_SIZE: 6,
    RESERVE_AMMO: 36,
    FIRE_INTERVAL_S: 0.8,
    RELOAD_S: 2.6,
    RANGE_M: 14,
    PELLETS: 8,
    PELLET_OFFSETS_RAD: [
      { yaw: 0, pitch: 0 },
      { yaw: 0.05, pitch: 0.008 },
      { yaw: -0.05, pitch: -0.008 },
      { yaw: 0.025, pitch: -0.014 },
      { yaw: -0.025, pitch: 0.014 },
      { yaw: 0.08, pitch: -0.006 },
      { yaw: -0.08, pitch: 0.006 },
      { yaw: 0, pitch: 0.018 },
    ],
    WALL_PRICE_POINTS: 1500,
    AMMO_PRICE_POINTS: 750,
  },
  lmg: {
    DAMAGE: 30,
    HEAD_MULTIPLIER: 2,
    MAG_SIZE: 100,
    RESERVE_AMMO: 300,
    FIRE_INTERVAL_S: 0.09,
    RELOAD_S: 4.5,
    RANGE_M: 40,
    PELLETS: 1,
    PELLET_OFFSETS_RAD: CENTERED_PELLET,
    WALL_PRICE_POINTS: 0,
    AMMO_PRICE_POINTS: 0,
  },
  rayGun: {
    DAMAGE: 150,
    HEAD_MULTIPLIER: 2,
    MAG_SIZE: 20,
    RESERVE_AMMO: 160,
    FIRE_INTERVAL_S: 0.25,
    RELOAD_S: 3,
    RANGE_M: 60,
    PELLETS: 1,
    PELLET_OFFSETS_RAD: CENTERED_PELLET,
    WALL_PRICE_POINTS: 0,
    AMMO_PRICE_POINTS: 0,
  },
};

export const KNIFE = {
  DAMAGE: 60,
  RANGE_M: 1.5,
  COOLDOWN_S: 0.7,
  ARC_RAD: 1.2,
} as const;

export const AIM_ASSIST_CONE_RAD = 0.07;
export const HEAD_HEIGHT_M = 1.7;
export const HITSCAN_EPSILON = 1e-9;
export const SWAP_PULSE_MS = 120;
export const COARSE_POINTER_QUERY = "(pointer: coarse)";
