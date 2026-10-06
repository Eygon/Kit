import { POINTS_CONFIG } from "@/config/pointsConfig";
import type { GameEvent } from "@/logic/game/gameEvents";

export type PointsLedger = { points: number; killedIds: number[]; multiplier: number };

export const createLedger = (startPoints: number): PointsLedger => ({ points: startPoints, killedIds: [], multiplier: 1 });

const applyHit = (ledger: PointsLedger, id: number, knife: boolean): void => {
  if (!ledger.killedIds.includes(id)) {
    ledger.points += POINTS_CONFIG.POINTS_HIT * ledger.multiplier;
    return;
  }
  if (knife) ledger.points += (POINTS_CONFIG.POINTS_KNIFE_KILL - POINTS_CONFIG.POINTS_KILL) * ledger.multiplier;
};

export const applyEvent = (ledger: PointsLedger, event: GameEvent): void => {
  if (event.kind === "zombieKilled") {
    ledger.points += (event.headshot ? POINTS_CONFIG.POINTS_HEADSHOT_KILL : POINTS_CONFIG.POINTS_KILL) * ledger.multiplier;
    ledger.killedIds.push(event.id);
    return;
  }
  if (event.kind === "zombieHit") applyHit(ledger, event.id, event.knife);
};

export const endLedgerStep = (ledger: PointsLedger): void => {
  ledger.killedIds.length = 0;
};

export const trySpend = (ledger: PointsLedger, costPoints: number): boolean => {
  if (ledger.points < costPoints) return false;
  ledger.points -= costPoints;
  return true;
};
