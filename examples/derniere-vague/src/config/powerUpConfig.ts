export type PowerUpKind = "maxAmmo" | "instaKill" | "doublePoints" | "nuke";

export type TimedPowerUpKind = "instaKill" | "doublePoints";

export const POWER_UP_KINDS: readonly PowerUpKind[] = ["maxAmmo", "instaKill", "doublePoints", "nuke"];

export const DROP_CHANCE = 1 / 30;
export const MAX_DROPS_PER_ROUND = 4;
export const DROP_LIFETIME_S = 25;
export const DROP_BLINK_S = 5;
export const PICKUP_RADIUS_M = 1;
export const TIMED_DURATION_S = 30;
export const NUKE_POINTS = 400;
export const DOUBLE_POINTS_MULTIPLIER = 2;
