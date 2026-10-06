import { DROP_CHANCE, DROP_LIFETIME_S, MAX_DROPS_PER_ROUND, PICKUP_RADIUS_M, POWER_UP_KINDS, TIMED_DURATION_S } from "@/config/powerUpConfig";
import type { PowerUpKind, TimedPowerUpKind } from "@/config/powerUpConfig";
import type { GameEvent } from "@/logic/game/gameEvents";
import type { Random } from "@/logic/random";

export type PowerUpDrop = {
  active: boolean;
  kind: PowerUpKind;
  x: number;
  z: number;
  remainingS: number;
};

export type PowerUps = {
  readonly drops: PowerUpDrop[];
  readonly timers: Record<TimedPowerUpKind, number>;
  dropsThisRound: number;
};

type Point = { readonly x: number; readonly z: number };

const createDrop = (): PowerUpDrop => ({ active: false, kind: "maxAmmo", x: 0, z: 0, remainingS: 0 });

export const createPowerUps = (): PowerUps => ({
  drops: Array.from({ length: MAX_DROPS_PER_ROUND }, createDrop),
  timers: { instaKill: 0, doublePoints: 0 },
  dropsThisRound: 0,
});

const isTimed = (kind: PowerUpKind): kind is TimedPowerUpKind => kind === "instaKill" || kind === "doublePoints";

export const isPowerUpActive = (state: PowerUps, kind: PowerUpKind): boolean => isTimed(kind) && state.timers[kind] > 0;

export const resetRoundDrops = (state: PowerUps): void => {
  state.dropsThisRound = 0;
};

const findFreeSlot = (state: PowerUps): number => {
  for (let slot = 0; slot < state.drops.length; slot++) if (!state.drops[slot]?.active) return slot;
  return -1;
};

export const rollDrop = (state: PowerUps, x: number, z: number, random: Random, events: GameEvent[]): boolean => {
  if (state.dropsThisRound >= MAX_DROPS_PER_ROUND) return false;
  if (random.next() >= DROP_CHANCE) return false;
  const slot = findFreeSlot(state);
  const drop = state.drops[slot];
  if (slot < 0 || !drop) return false;
  drop.active = true;
  drop.kind = random.pick(POWER_UP_KINDS);
  drop.x = x;
  drop.z = z;
  drop.remainingS = DROP_LIFETIME_S;
  state.dropsThisRound++;
  events.push({ kind: "powerUpDropped", slot, powerUpKind: drop.kind, x, z });
  return true;
};

const ageTimers = (state: PowerUps, stepS: number): void => {
  state.timers.instaKill = Math.max(0, state.timers.instaKill - stepS);
  state.timers.doublePoints = Math.max(0, state.timers.doublePoints - stepS);
};

const isWithinPickup = (drop: PowerUpDrop, player: Point): boolean => Math.hypot(drop.x - player.x, drop.z - player.z) <= PICKUP_RADIUS_M;

const take = (state: PowerUps, drop: PowerUpDrop, events: GameEvent[]): void => {
  drop.active = false;
  if (isTimed(drop.kind)) state.timers[drop.kind] = TIMED_DURATION_S;
  events.push({ kind: "powerUpTaken", powerUpKind: drop.kind });
};

export const updatePowerUps = (state: PowerUps, player: Point, stepS: number, events: GameEvent[]): PowerUpKind | null => {
  ageTimers(state, stepS);
  let taken: PowerUpKind | null = null;
  for (let slot = 0; slot < state.drops.length; slot++) {
    const drop = state.drops[slot];
    if (!drop?.active) continue;
    drop.remainingS -= stepS;
    if (drop.remainingS <= 0) {
      drop.active = false;
      events.push({ kind: "powerUpExpired", slot });
    } else if (taken === null && isWithinPickup(drop, player)) {
      taken = drop.kind;
      take(state, drop, events);
    }
  }
  return taken;
};
