import { ROUND_CONFIG } from "@/config/roundConfig";
import type { ZombieSpeedMode } from "@/config/zombieConfig";
import type { GameEvent } from "@/logic/game/gameEvents";
import type { StationLayout } from "@/logic/map/stationLayout";
import type { Random } from "@/logic/random";
import { requestSpawn } from "@/logic/zombies/zombieHorde";
import type { Horde } from "@/logic/zombies/zombieHorde";

export type RoundPhase =
  | { kind: "active"; remainingSpawns: number; spawnCooldownS: number }
  | { kind: "intermission"; remainingS: number };

export type Rounds = { number: number; phase: RoundPhase };

export const zombieHpForRound = (round: number): number => {
  const linearRounds = Math.min(round, ROUND_CONFIG.ROUND_HP_LINEAR_UNTIL);
  const extraRounds = Math.max(0, round - ROUND_CONFIG.ROUND_HP_LINEAR_UNTIL);
  const linearHp = ROUND_CONFIG.ROUND_BASE_HP + ROUND_CONFIG.ROUND_HP_STEP * (linearRounds - 1);
  return linearHp * ROUND_CONFIG.ROUND_HP_GROWTH ** extraRounds;
};

export const zombieCountForRound = (round: number): number => ROUND_CONFIG.ROUND_BASE_COUNT + ROUND_CONFIG.ROUND_COUNT_STEP * (round - 1);

export const speedModeForRound = (round: number): ZombieSpeedMode => (round >= ROUND_CONFIG.ROUND_RUN_FROM ? "run" : "walk");

const activePhase = (round: number): RoundPhase => ({ kind: "active", remainingSpawns: zombieCountForRound(round), spawnCooldownS: 0 });

export const createRounds = (round = 1): Rounds => ({ number: round, phase: activePhase(round) });

const hasLivingZombie = (horde: Horde): boolean => horde.zombies.some((zombie) => zombie.alive && zombie.state !== "dying");

const updateActive = (rounds: Rounds, phase: Extract<RoundPhase, { kind: "active" }>, horde: Horde, stepS: number, layout: StationLayout, random: Random): void => {
  phase.spawnCooldownS = Math.max(0, phase.spawnCooldownS - stepS);
  if (phase.remainingSpawns > 0) {
    if (phase.spawnCooldownS > 0) return;
    if (!requestSpawn(horde, zombieHpForRound(rounds.number), speedModeForRound(rounds.number), layout, random)) return;
    phase.remainingSpawns--;
    phase.spawnCooldownS = ROUND_CONFIG.ROUND_SPAWN_INTERVAL_S;
    return;
  }
  if (horde.queued > 0 || hasLivingZombie(horde)) return;
  rounds.phase = { kind: "intermission", remainingS: ROUND_CONFIG.ROUND_BREAK_S };
};

const updateIntermission = (rounds: Rounds, phase: Extract<RoundPhase, { kind: "intermission" }>, stepS: number, events: GameEvent[]): void => {
  phase.remainingS -= stepS;
  if (phase.remainingS > 0) return;
  rounds.number++;
  rounds.phase = activePhase(rounds.number);
  events.push({ kind: "roundStarted", round: rounds.number });
};

export const updateRounds = (rounds: Rounds, horde: Horde, stepS: number, layout: StationLayout, random: Random, events: GameEvent[]): void => {
  const phase = rounds.phase;
  if (phase.kind === "active") updateActive(rounds, phase, horde, stepS, layout, random);
  else updateIntermission(rounds, phase, stepS, events);
};
