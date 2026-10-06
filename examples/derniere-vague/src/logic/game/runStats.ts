import type { GameEvent } from "@/logic/game/gameEvents";

export type RunStats = {
  kills: number;
  headshots: number;
  pointsEarned: number;
};

export const createRunStats = (): RunStats => ({ kills: 0, headshots: 0, pointsEarned: 0 });

export const recordRunEvent = (stats: RunStats, event: GameEvent): void => {
  if (event.kind !== "zombieKilled") return;
  stats.kills += 1;
  if (event.headshot) stats.headshots += 1;
};

export const recordPointsGain = (stats: RunStats, delta: number): void => {
  if (delta > 0) stats.pointsEarned += delta;
};
