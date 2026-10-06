import { BARRICADE } from "@/config/mapConfig";
import { ZOMBIE_CONFIG } from "@/config/zombieConfig";
import type { ZombieSpeedMode } from "@/config/zombieConfig";
import type { HitTarget } from "@/logic/combat/hitscan";
import type { GameEvent } from "@/logic/game/gameEvents";
import { planksOf, tearPlank } from "@/logic/map/barricades";
import type { Barricades } from "@/logic/map/barricades";
import { resolveMovement } from "@/logic/map/stationLayout";
import type { SpawnPoint, StationLayout, Vec2 } from "@/logic/map/stationLayout";
import type { Random } from "@/logic/random";

export type ZombieState = "breaching" | "spawning" | "chasing" | "attacking" | "dying";

export type Zombie = {
  readonly id: number;
  readonly radiusM: number;
  readonly heightM: number;
  windowId: string;
  alive: boolean;
  state: ZombieState;
  x: number;
  z: number;
  prevX: number;
  prevZ: number;
  yaw: number;
  hp: number;
  speedMps: number;
  stateTimeS: number;
  cooldownS: number;
  attackLanded: boolean;
  climbDirX: number;
  climbDirZ: number;
};

type PendingSpawn = { hp: number; speedMode: ZombieSpeedMode; point: SpawnPoint | null };

export type Horde = {
  readonly zombies: Zombie[];
  readonly queue: PendingSpawn[];
  queueHead: number;
  queued: number;
};

const scratchDelta: Vec2 = { x: 0, z: 0 };
const scratchOut: Vec2 = { x: 0, z: 0 };

const createZombie = (id: number): Zombie => ({
  id,
  radiusM: ZOMBIE_CONFIG.ZOMBIE_RADIUS_M,
  heightM: ZOMBIE_CONFIG.ZOMBIE_HEIGHT_M,
  windowId: "",
  alive: false,
  state: "spawning",
  x: 0,
  z: 0,
  prevX: 0,
  prevZ: 0,
  yaw: 0,
  hp: 0,
  speedMps: 0,
  stateTimeS: 0,
  cooldownS: 0,
  attackLanded: false,
  climbDirX: 0,
  climbDirZ: 0,
});

export const createHorde = (): Horde => ({
  zombies: Array.from({ length: ZOMBIE_CONFIG.ZOMBIE_MAX_ALIVE }, (_, id) => createZombie(id)),
  queue: Array.from({ length: ZOMBIE_CONFIG.ZOMBIE_SPAWN_QUEUE_MAX }, () => ({ hp: 0, speedMode: "walk", point: null })),
  queueHead: 0,
  queued: 0,
});

const findFreeSlot = (horde: Horde): Zombie | null => {
  for (const zombie of horde.zombies) if (!zombie.alive) return zombie;
  return null;
};

const placeZombie = (zombie: Zombie, hp: number, speedMode: ZombieSpeedMode, point: SpawnPoint): void => {
  zombie.alive = true;
  zombie.state = "breaching";
  zombie.windowId = point.id;
  zombie.x = point.x;
  zombie.z = point.z;
  zombie.prevX = point.x;
  zombie.prevZ = point.z;
  zombie.yaw = point.facing + Math.PI;
  zombie.hp = hp;
  zombie.speedMps = ZOMBIE_CONFIG.ZOMBIE_SPEEDS_MPS[speedMode];
  zombie.stateTimeS = 0;
  zombie.cooldownS = 0;
  zombie.attackLanded = false;
  zombie.climbDirX = Math.sin(point.facing);
  zombie.climbDirZ = Math.cos(point.facing);
};

export const requestSpawn = (horde: Horde, hp: number, speedMode: ZombieSpeedMode, layout: StationLayout, random: Random): boolean => {
  if (layout.spawnPoints.length === 0) return false;
  const point = random.pick(layout.spawnPoints);
  const slot = horde.queued === 0 ? findFreeSlot(horde) : null;
  if (slot) {
    placeZombie(slot, hp, speedMode, point);
    return true;
  }
  if (horde.queued >= horde.queue.length) return false;
  const pending = horde.queue[(horde.queueHead + horde.queued) % horde.queue.length];
  if (!pending) return false;
  pending.hp = hp;
  pending.speedMode = speedMode;
  pending.point = point;
  horde.queued++;
  return true;
};

const drainQueue = (horde: Horde): void => {
  while (horde.queued > 0) {
    const slot = findFreeSlot(horde);
    const pending = horde.queue[horde.queueHead];
    if (!slot || !pending?.point) return;
    placeZombie(slot, pending.hp, pending.speedMode, pending.point);
    pending.point = null;
    horde.queueHead = (horde.queueHead + 1) % horde.queue.length;
    horde.queued--;
  }
};

const faceAndMeasure = (zombie: Zombie, player: Readonly<Vec2>): number => {
  const dx = player.x - zombie.x;
  const dz = player.z - zombie.z;
  zombie.yaw = Math.atan2(-dx, -dz);
  return Math.hypot(dx, dz);
};

const startClimbing = (zombie: Zombie): void => {
  zombie.state = "spawning";
  zombie.stateTimeS = 0;
};

const updateBreaching = (zombie: Zombie, stepS: number, barricades: Barricades | undefined, events: GameEvent[]): void => {
  if (!barricades || planksOf(barricades, zombie.windowId) === 0) {
    startClimbing(zombie);
    return;
  }
  zombie.stateTimeS += stepS;
  if (zombie.stateTimeS < BARRICADE.TEAR_INTERVAL_S) return;
  zombie.stateTimeS -= BARRICADE.TEAR_INTERVAL_S;
  tearPlank(barricades, zombie.windowId, events);
  if (planksOf(barricades, zombie.windowId) === 0) startClimbing(zombie);
};

const updateSpawning = (zombie: Zombie, stepS: number): void => {
  const climbStepM = (ZOMBIE_CONFIG.ZOMBIE_SPAWN_CLIMB_M / ZOMBIE_CONFIG.ZOMBIE_SPAWN_S) * stepS;
  zombie.x += zombie.climbDirX * climbStepM;
  zombie.z += zombie.climbDirZ * climbStepM;
  zombie.stateTimeS += stepS;
  if (zombie.stateTimeS < ZOMBIE_CONFIG.ZOMBIE_SPAWN_S) return;
  zombie.state = "chasing";
  zombie.stateTimeS = 0;
};

const updateChasing = (zombie: Zombie, player: Readonly<Vec2>, stepS: number, layout: StationLayout): void => {
  const distanceM = faceAndMeasure(zombie, player);
  zombie.cooldownS = Math.max(0, zombie.cooldownS - stepS);
  if (distanceM <= ZOMBIE_CONFIG.ZOMBIE_ATTACK_RANGE_M && zombie.cooldownS === 0) {
    zombie.state = "attacking";
    zombie.stateTimeS = 0;
    zombie.attackLanded = false;
    return;
  }
  if (distanceM <= ZOMBIE_CONFIG.ZOMBIE_STOP_DISTANCE_M) return;
  const scale = (zombie.speedMps * stepS) / distanceM;
  scratchDelta.x = (player.x - zombie.x) * scale;
  scratchDelta.z = (player.z - zombie.z) * scale;
  resolveMovement(layout, zombie, scratchDelta, zombie.radiusM, scratchOut);
  zombie.x = scratchOut.x;
  zombie.z = scratchOut.z;
};

const updateAttacking = (zombie: Zombie, player: Readonly<Vec2>, stepS: number, events: GameEvent[]): void => {
  const distanceM = faceAndMeasure(zombie, player);
  zombie.stateTimeS += stepS;
  if (!zombie.attackLanded && zombie.stateTimeS >= ZOMBIE_CONFIG.ZOMBIE_ATTACK_WINDUP_S) {
    zombie.attackLanded = true;
    if (distanceM <= ZOMBIE_CONFIG.ZOMBIE_ATTACK_RANGE_M) events.push({ kind: "playerHit", damage: ZOMBIE_CONFIG.ZOMBIE_ATTACK_DAMAGE, x: zombie.x, z: zombie.z });
  }
  if (zombie.stateTimeS < ZOMBIE_CONFIG.ZOMBIE_ATTACK_DURATION_S) return;
  zombie.state = "chasing";
  zombie.stateTimeS = 0;
  zombie.cooldownS = ZOMBIE_CONFIG.ZOMBIE_ATTACK_COOLDOWN_S;
};

const updateDying = (zombie: Zombie, stepS: number): void => {
  zombie.stateTimeS += stepS;
  if (zombie.stateTimeS >= ZOMBIE_CONFIG.ZOMBIE_DEATH_S) zombie.alive = false;
};

export const updateHorde = (horde: Horde, player: Readonly<Vec2>, stepS: number, layout: StationLayout, events: GameEvent[], barricades?: Barricades): void => {
  for (const zombie of horde.zombies) {
    if (!zombie.alive) continue;
    zombie.prevX = zombie.x;
    zombie.prevZ = zombie.z;
    if (zombie.state === "breaching") updateBreaching(zombie, stepS, barricades, events);
    else if (zombie.state === "spawning") updateSpawning(zombie, stepS);
    else if (zombie.state === "chasing") updateChasing(zombie, player, stepS, layout);
    else if (zombie.state === "attacking") updateAttacking(zombie, player, stepS, events);
    else updateDying(zombie, stepS);
  }
  drainQueue(horde);
};

export const damageZombie = (horde: Horde, id: number, amount: number, head: boolean, knife: boolean, events: GameEvent[]): boolean => {
  const zombie = horde.zombies[id];
  if (!zombie || !zombie.alive || zombie.state === "dying") return false;
  zombie.hp = Math.max(0, zombie.hp - amount);
  events.push({ kind: "zombieHit", id, damage: amount, head, knife });
  if (zombie.hp > 0) return true;
  zombie.state = "dying";
  zombie.stateTimeS = 0;
  events.push({ kind: "zombieKilled", id, headshot: head });
  return true;
};

export const killAllZombies = (horde: Horde): number => {
  let killed = 0;
  for (const zombie of horde.zombies) {
    if (!zombie.alive || zombie.state === "dying") continue;
    zombie.state = "dying";
    zombie.stateTimeS = 0;
    killed++;
  }
  return killed;
};

export const collectTargets = (horde: Horde, out: HitTarget[]): void => {
  out.length = 0;
  for (const zombie of horde.zombies) if (zombie.alive && zombie.state !== "dying") out.push(zombie);
};
