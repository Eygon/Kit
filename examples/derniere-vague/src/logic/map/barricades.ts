import { BARRICADE } from "@/config/mapConfig";
import { POINTS_CONFIG } from "@/config/pointsConfig";
import type { PointsLedger } from "@/logic/economy/pointsLedger";
import type { GameEvent } from "@/logic/game/gameEvents";

export type BarricadeWindow = {
  readonly id: string;
  readonly x: number;
  readonly z: number;
  planks: number;
  repairProgressS: number;
};

export type Barricades = {
  readonly windows: BarricadeWindow[];
  repairPointsEarned: number;
};

type WindowSite = { readonly id: string; readonly x: number; readonly z: number };

export const createBarricades = (sites: readonly WindowSite[]): Barricades => ({
  windows: sites.map((site) => ({ id: site.id, x: site.x, z: site.z, planks: BARRICADE.PLANKS_PER_WINDOW, repairProgressS: 0 })),
  repairPointsEarned: 0,
});

const findWindow = (barricades: Barricades, windowId: string): BarricadeWindow | null => {
  for (const barricadeWindow of barricades.windows) if (barricadeWindow.id === windowId) return barricadeWindow;
  return null;
};

export const planksOf = (barricades: Barricades, windowId: string): number => findWindow(barricades, windowId)?.planks ?? 0;

export const tearPlank = (barricades: Barricades, windowId: string, events: GameEvent[]): boolean => {
  const barricadeWindow = findWindow(barricades, windowId);
  if (!barricadeWindow || barricadeWindow.planks === 0) return false;
  barricadeWindow.planks--;
  barricadeWindow.repairProgressS = 0;
  events.push({ kind: "plankTorn", windowId, x: barricadeWindow.x, z: barricadeWindow.z });
  return true;
};

const payRepair = (barricades: Barricades, ledger: PointsLedger): void => {
  if (barricades.repairPointsEarned + POINTS_CONFIG.POINTS_REPAIR_PLANK > POINTS_CONFIG.REPAIR_CAP_PER_ROUND_POINTS) return;
  barricades.repairPointsEarned += POINTS_CONFIG.POINTS_REPAIR_PLANK;
  ledger.points += POINTS_CONFIG.POINTS_REPAIR_PLANK;
};

export const repairStep = (barricades: Barricades, windowId: string, stepS: number, ledger: PointsLedger, events: GameEvent[]): void => {
  const barricadeWindow = findWindow(barricades, windowId);
  if (!barricadeWindow) return;
  if (barricadeWindow.planks >= BARRICADE.PLANKS_PER_WINDOW) {
    barricadeWindow.repairProgressS = 0;
    return;
  }
  barricadeWindow.repairProgressS += stepS;
  if (barricadeWindow.repairProgressS < BARRICADE.REPAIR_INTERVAL_S) return;
  barricadeWindow.repairProgressS -= BARRICADE.REPAIR_INTERVAL_S;
  barricadeWindow.planks++;
  payRepair(barricades, ledger);
  events.push({ kind: "plankRepaired", windowId, x: barricadeWindow.x, z: barricadeWindow.z });
};

export const resetRoundRepairs = (barricades: Barricades): void => {
  barricades.repairPointsEarned = 0;
};
