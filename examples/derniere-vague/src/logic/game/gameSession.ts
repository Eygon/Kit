import { DOUBLE_POINTS_MULTIPLIER, NUKE_POINTS } from "@/config/powerUpConfig";
import type { PowerUpKind } from "@/config/powerUpConfig";
import { POINTS_CONFIG } from "@/config/pointsConfig";
import { KNIFE, WEAPONS } from "@/config/weaponConfig";
import { resolveKnife, resolveShot } from "@/logic/combat/hitscan";
import type { HitTarget, ShotHit } from "@/logic/combat/hitscan";
import { createInteractions, updateInteractions } from "@/logic/economy/interactions";
import type { Interactions } from "@/logic/economy/interactions";
import { createMysteryBox, updateMysteryBox } from "@/logic/economy/mysteryBox";
import type { MysteryBox } from "@/logic/economy/mysteryBox";
import { applyEvent, createLedger, endLedgerStep } from "@/logic/economy/pointsLedger";
import type { PointsLedger } from "@/logic/economy/pointsLedger";
import type { GameEvent } from "@/logic/game/gameEvents";
import { createRunStats, recordPointsGain, recordRunEvent } from "@/logic/game/runStats";
import type { RunStats } from "@/logic/game/runStats";
import { clearLatches, createInputState, mergeLatches } from "@/logic/input/inputState";
import type { InputState } from "@/logic/input/inputState";
import { createBarricades, resetRoundRepairs } from "@/logic/map/barricades";
import type { Barricades } from "@/logic/map/barricades";
import { createStationLayout } from "@/logic/map/stationLayout";
import type { StationLayout } from "@/logic/map/stationLayout";
import { createZoneDoors, updateZoneDoors } from "@/logic/map/zoneDoors";
import type { ZoneDoors } from "@/logic/map/zoneDoors";
import { createPowerUps, isPowerUpActive, resetRoundDrops, rollDrop, updatePowerUps } from "@/logic/powerUps/powerUps";
import type { PowerUps } from "@/logic/powerUps/powerUps";
import { createPlayer, updatePlayerMotion } from "@/logic/player/playerMotion";
import type { PlayerState } from "@/logic/player/playerMotion";
import { applyPlayerHit, createHealth, updateHealth } from "@/logic/player/playerHealth";
import type { PlayerHealth } from "@/logic/player/playerHealth";
import { createRandom } from "@/logic/random";
import type { Random } from "@/logic/random";
import { createRounds, updateRounds } from "@/logic/rounds/roundDirector";
import type { Rounds } from "@/logic/rounds/roundDirector";
import { activeWeapon, createLoadout, refillAllAmmo, swapWeapon } from "@/logic/weapons/loadout";
import type { Loadout } from "@/logic/weapons/loadout";
import { shotDamage, updateWeapon } from "@/logic/weapons/weaponState";
import type { WeaponState } from "@/logic/weapons/weaponState";
import { collectTargets, createHorde, damageZombie, killAllZombies, updateHorde } from "@/logic/zombies/zombieHorde";
import type { Horde } from "@/logic/zombies/zombieHorde";

export type GamePhase = { kind: "playing" } | { kind: "over"; roundReached: number };

export type GameSession = {
  readonly layout: StationLayout;
  readonly player: PlayerState;
  readonly loadout: Loadout;
  readonly interactions: Interactions;
  readonly doors: ZoneDoors;
  readonly barricades: Barricades;
  readonly box: MysteryBox;
  readonly powerUps: PowerUps;
  readonly horde: Horde;
  readonly rounds: Rounds;
  readonly ledger: PointsLedger;
  readonly stats: RunStats;
  readonly events: GameEvent[];
  readonly random: Random;
  readonly targets: HitTarget[];
  readonly shotHit: ShotHit;
  readonly stepInput: InputState;
  weapon: WeaponState;
  swapHeld: boolean;
  health: PlayerHealth;
  phase: GamePhase;
};

export const createGameSession = (seed: number): GameSession => {
  const layout = createStationLayout();
  const rounds = createRounds();
  const loadout = createLoadout();
  return {
    layout,
    player: createPlayer(layout.playerStart),
    loadout,
    interactions: createInteractions(),
    doors: createZoneDoors(),
    barricades: createBarricades(layout.windows),
    box: createMysteryBox(),
    powerUps: createPowerUps(),
    weapon: activeWeapon(loadout),
    swapHeld: false,
    horde: createHorde(),
    rounds,
    ledger: createLedger(POINTS_CONFIG.START_POINTS),
    stats: createRunStats(),
    events: [{ kind: "roundStarted", round: rounds.number }],
    random: createRandom(seed),
    targets: [],
    shotHit: { targetId: 0, head: false },
    stepInput: createInputState(),
    health: createHealth(),
    phase: { kind: "playing" },
  };
};

const hitDamage = (session: GameSession, targetId: number, normalDamage: number): number => {
  if (!isPowerUpActive(session.powerUps, "instaKill")) return normalDamage;
  return Math.max(normalDamage, session.horde.zombies[targetId]?.hp ?? normalDamage);
};

const resolvePellet = (session: GameSession, yawOffsetRad: number, pitchOffsetRad: number, assistRad: number): void => {
  const { player, weapon, horde, targets, events } = session;
  const hit = resolveShot(player, player.yaw + yawOffsetRad, player.pitch + pitchOffsetRad, targets, WEAPONS[weapon.weaponId].RANGE_M, assistRad, session.shotHit, session.layout);
  if (!hit) return;
  const damage = hitDamage(session, hit.targetId, shotDamage(weapon.weaponId, hit.head));
  events.push({ kind: "targetHit", targetId: hit.targetId, damage, head: hit.head, knife: false });
  damageZombie(horde, hit.targetId, damage, hit.head, false, events);
};

const resolveAttack = (session: GameSession, kind: GameEvent["kind"], assistRad: number): void => {
  const { player, weapon, horde, targets, events } = session;
  if (kind === "shotFired") {
    for (const offset of WEAPONS[weapon.weaponId].PELLET_OFFSETS_RAD) resolvePellet(session, offset.yaw, offset.pitch, assistRad);
    return;
  }
  if (kind !== "knifeSwung") return;
  const knifeTargetId = resolveKnife(player, player.yaw, targets, KNIFE.RANGE_M, session.layout);
  if (knifeTargetId === null) return;
  const knifeDamage = hitDamage(session, knifeTargetId, KNIFE.DAMAGE);
  events.push({ kind: "targetHit", targetId: knifeTargetId, damage: knifeDamage, head: false, knife: true });
  damageZombie(horde, knifeTargetId, knifeDamage, false, true, events);
};

const stepSwap = (session: GameSession, input: InputState): void => {
  if (input.swap && !session.swapHeld) {
    swapWeapon(session.loadout);
    session.weapon = activeWeapon(session.loadout);
  }
  session.swapHeld = input.swap;
};

const stepInteractions = (session: GameSession, input: InputState, stepS: number): void => {
  const repairPointsBefore = session.barricades.repairPointsEarned;
  updateInteractions(session.interactions, session.player, session.loadout, session.ledger, input, session.doors, session.events, stepS, session.layout, session.barricades, session.box);
  recordPointsGain(session.stats, session.barricades.repairPointsEarned - repairPointsBefore);
  session.weapon = activeWeapon(session.loadout);
};

const stepWeapon = (session: GameSession, input: InputState, stepS: number, assistRad: number): void => {
  const firstNew = session.events.length;
  updateWeapon(session.weapon, input, stepS, session.events);
  const lastNew = session.events.length;
  for (let index = firstNew; index < lastNew; index++) {
    const event = session.events[index];
    if (event) resolveAttack(session, event.kind, assistRad);
  }
};

const applyHealth = (session: GameSession, stepS: number, firstNew: number): void => {
  for (let index = firstNew; index < session.events.length; index++) {
    if (session.events[index]?.kind === "playerHit") session.health = applyPlayerHit(session.health);
  }
  session.health = updateHealth(session.health, stepS);
  if (session.health.status === "dead") session.phase = { kind: "over", roundReached: session.rounds.number };
};

const resetRepairsOnNewRound = (session: GameSession, firstNew: number): void => {
  for (let index = firstNew; index < session.events.length; index++) {
    if (session.events[index]?.kind !== "roundStarted") continue;
    resetRoundRepairs(session.barricades);
    resetRoundDrops(session.powerUps);
  }
};

const applyLedger = (session: GameSession, firstNew: number): void => {
  const pointsBefore = session.ledger.points;
  session.ledger.multiplier = isPowerUpActive(session.powerUps, "doublePoints") ? DOUBLE_POINTS_MULTIPLIER : 1;
  for (let index = firstNew; index < session.events.length; index++) {
    const event = session.events[index];
    if (event?.kind === "zombieKilled") applyEvent(session.ledger, event);
  }
  for (let index = firstNew; index < session.events.length; index++) {
    const event = session.events[index];
    if (event?.kind === "zombieHit") applyEvent(session.ledger, event);
  }
  endLedgerStep(session.ledger);
  recordPointsGain(session.stats, session.ledger.points - pointsBefore);
};

const recordStats = (session: GameSession, firstNew: number): void => {
  for (let index = firstNew; index < session.events.length; index++) {
    const event = session.events[index];
    if (event) recordRunEvent(session.stats, event);
  }
};

const rollDropsForKills = (session: GameSession, firstNew: number): void => {
  const { horde, powerUps, random, events } = session;
  for (let index = firstNew; index < events.length; index++) {
    const event = events[index];
    if (event?.kind !== "zombieKilled") continue;
    const zombie = horde.zombies[event.id];
    if (zombie) rollDrop(powerUps, zombie.x, zombie.z, random, events);
  }
};

const applyTakenPowerUp = (session: GameSession, taken: PowerUpKind | null): void => {
  if (taken === "maxAmmo") refillAllAmmo(session.loadout);
  if (taken !== "nuke") return;
  killAllZombies(session.horde);
  session.ledger.points += NUKE_POINTS;
  recordPointsGain(session.stats, NUKE_POINTS);
  session.events.push({ kind: "nukeDetonated" });
};

const stepPowerUps = (session: GameSession, firstNew: number, stepS: number): void => {
  rollDropsForKills(session, firstNew);
  applyTakenPowerUp(session, updatePowerUps(session.powerUps, session.player, stepS, session.events));
};

const stepSystems = (session: GameSession, input: InputState, stepS: number, assistRad: number): void => {
  const firstNew = session.events.length;
  updatePlayerMotion(session.player, input, stepS, session.layout);
  collectTargets(session.horde, session.targets);
  stepSwap(session, input);
  stepWeapon(session, input, stepS, assistRad);
  updateHorde(session.horde, session.player, stepS, session.layout, session.events, session.barricades);
  updateZoneDoors(session.doors, session.layout, stepS, session.events);
  updateRounds(session.rounds, session.horde, stepS, session.layout, session.random, session.events);
  resetRepairsOnNewRound(session, firstNew);
  applyHealth(session, stepS, firstNew);
  applyLedger(session, firstNew);
  recordStats(session, firstNew);
  stepPowerUps(session, firstNew, stepS);
  updateMysteryBox(session.box, stepS, session.random, session.ledger, session.events);
  stepInteractions(session, input, stepS);
};

export const stepGameSession = (session: GameSession, input: InputState, stepS: number, assistRad: number): void => {
  if (session.phase.kind !== "over") {
    mergeLatches(input, session.stepInput);
    stepSystems(session, session.stepInput, stepS, assistRad);
  }
  clearLatches(input);
};
