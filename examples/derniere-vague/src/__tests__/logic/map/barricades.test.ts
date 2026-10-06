import { createLedger } from "@/logic/economy/pointsLedger";
import type { GameEvent } from "@/logic/game/gameEvents";

const BARRICADES_MODULE = "@/logic/map/barricades";
const MAP_MODULE = "@/config/mapConfig";
const POINTS_MODULE = "@/config/pointsConfig";
const STEP_S = 1 / 60;
const WINDOW = { id: "alpha", x: 3, z: -7, facing: 0 };
const OTHER_WINDOW = { id: "beta", x: -3, z: 7, facing: 0 };
const UNKNOWN_ID = "missing";
const INTERVAL_TOLERANCE_STEPS = 2;

const load = async () => {
  const barricadesModule = await import(/* @vite-ignore */ BARRICADES_MODULE);
  const config = (await import(/* @vite-ignore */ MAP_MODULE)).BARRICADE;
  const points = (await import(/* @vite-ignore */ POINTS_MODULE)).POINTS_CONFIG;
  const barricades = barricadesModule.createBarricades([WINDOW, OTHER_WINDOW]);
  const ledger = createLedger(0);
  const events: GameEvent[] = [];
  const tear = (count: number): void => {
    for (let i = 0; i < count; i++) barricadesModule.tearPlank(barricades, WINDOW.id, events);
  };
  const repairFor = (seconds: number): void => {
    for (let i = 0; i < Math.round(seconds / STEP_S); i++) barricadesModule.repairStep(barricades, WINDOW.id, STEP_S, ledger, events);
  };
  const repairOnePlank = (): void => repairFor(config.REPAIR_INTERVAL_S + INTERVAL_TOLERANCE_STEPS * STEP_S);
  const planks = (id = WINDOW.id): number => barricadesModule.planksOf(barricades, id);
  const kinds = (kind: string): GameEvent[] => events.filter((event) => event.kind === kind);
  return { barricadesModule, config, points, barricades, ledger, events, tear, repairFor, repairOnePlank, planks, kinds };
};

describe("barricade config", () => {
  it("holds 6 planks per window, a 1.2 s tear interval and a 0.75 s repair interval", async () => {
    const { config } = await load();
    expect(config.PLANKS_PER_WINDOW).toBe(6);
    expect(config.TEAR_INTERVAL_S).toBe(1.2);
    expect(config.REPAIR_INTERVAL_S).toBe(0.75);
  });

  it("pays 10 points per plank up to 500 points per round", async () => {
    const { points } = await load();
    expect(points.POINTS_REPAIR_PLANK).toBe(10);
    expect(points.REPAIR_CAP_PER_ROUND_POINTS).toBe(500);
  });
});

describe("createBarricades and planksOf", () => {
  it("starts every window fully planked", async () => {
    const { planks, config } = await load();
    expect(planks(WINDOW.id)).toBe(config.PLANKS_PER_WINDOW);
    expect(planks(OTHER_WINDOW.id)).toBe(config.PLANKS_PER_WINDOW);
  });

  it("reports 0 planks for an unknown window", async () => {
    const { planks } = await load();
    expect(planks(UNKNOWN_ID)).toBe(0);
  });
});

describe("tearPlank", () => {
  it("removes one plank, returns true and emits plankTorn with the window position", async () => {
    const { barricadesModule, barricades, events, planks, config } = await load();
    expect(barricadesModule.tearPlank(barricades, WINDOW.id, events)).toBe(true);
    expect(planks()).toBe(config.PLANKS_PER_WINDOW - 1);
    expect(events).toEqual([{ kind: "plankTorn", windowId: WINDOW.id, x: WINDOW.x, z: WINDOW.z }]);
  });

  it("leaves the other windows untouched", async () => {
    const { tear, planks, config } = await load();
    tear(3);
    expect(planks(OTHER_WINDOW.id)).toBe(config.PLANKS_PER_WINDOW);
  });

  it("returns false and emits nothing once the window is bare", async () => {
    const { barricadesModule, barricades, events, tear, planks, config, kinds } = await load();
    tear(config.PLANKS_PER_WINDOW);
    expect(planks()).toBe(0);
    expect(barricadesModule.tearPlank(barricades, WINDOW.id, events)).toBe(false);
    expect(planks()).toBe(0);
    expect(kinds("plankTorn")).toHaveLength(config.PLANKS_PER_WINDOW);
  });

  it("returns false for an unknown window", async () => {
    const { barricadesModule, barricades, events } = await load();
    expect(barricadesModule.tearPlank(barricades, UNKNOWN_ID, events)).toBe(false);
    expect(events).toEqual([]);
  });
});

describe("repairStep", () => {
  it("puts back no plank before one repair interval has elapsed", async () => {
    const { tear, repairFor, planks, config, ledger } = await load();
    tear(4);
    repairFor(config.REPAIR_INTERVAL_S - INTERVAL_TOLERANCE_STEPS * STEP_S);
    expect(planks()).toBe(config.PLANKS_PER_WINDOW - 4);
    expect(ledger.points).toBe(0);
  });

  it("puts back one plank per interval, +10 points and a plankRepaired event each", async () => {
    const { tear, repairOnePlank, planks, config, ledger, events, points } = await load();
    tear(4);
    repairOnePlank();
    expect(planks()).toBe(config.PLANKS_PER_WINDOW - 3);
    expect(ledger.points).toBe(points.POINTS_REPAIR_PLANK);
    expect(events).toContainEqual({ kind: "plankRepaired", windowId: WINDOW.id, x: WINDOW.x, z: WINDOW.z });
  });

  it("repairs a window with 2 planks up to 6 and stops, 40 points in total", async () => {
    const { tear, repairFor, planks, config, ledger, kinds } = await load();
    tear(4);
    repairFor(config.REPAIR_INTERVAL_S * 8);
    expect(planks()).toBe(config.PLANKS_PER_WINDOW);
    expect(ledger.points).toBe(40);
    expect(kinds("plankRepaired")).toHaveLength(4);
  });

  it("does nothing on a full window", async () => {
    const { repairFor, planks, config, ledger, events } = await load();
    repairFor(config.REPAIR_INTERVAL_S * 3);
    expect(planks()).toBe(config.PLANKS_PER_WINDOW);
    expect(ledger.points).toBe(0);
    expect(events).toEqual([]);
  });

  it("ignores an unknown window", async () => {
    const { barricadesModule, barricades, ledger, events } = await load();
    barricadesModule.repairStep(barricades, UNKNOWN_ID, 10, ledger, events);
    expect(ledger.points).toBe(0);
    expect(events).toEqual([]);
  });
});

describe("repair points cap per round", () => {
  const earnToCap = async () => {
    const context = await load();
    const repairsToCap = context.points.REPAIR_CAP_PER_ROUND_POINTS / context.points.POINTS_REPAIR_PLANK;
    for (let i = 0; i < repairsToCap; i++) {
      context.tear(1);
      context.repairOnePlank();
    }
    return context;
  };

  it("pays exactly 500 points over 50 repairs", async () => {
    const { ledger, points } = await earnToCap();
    expect(ledger.points).toBe(points.REPAIR_CAP_PER_ROUND_POINTS);
  });

  it("returns the plank without points once 500 points are earned", async () => {
    const { tear, repairOnePlank, planks, ledger, points, config } = await earnToCap();
    tear(1);
    repairOnePlank();
    expect(planks()).toBe(config.PLANKS_PER_WINDOW);
    expect(ledger.points).toBe(points.REPAIR_CAP_PER_ROUND_POINTS);
  });

  it("pays again after resetRoundRepairs", async () => {
    const { barricadesModule, barricades, tear, repairOnePlank, ledger, points } = await earnToCap();
    barricadesModule.resetRoundRepairs(barricades);
    tear(1);
    repairOnePlank();
    expect(ledger.points).toBe(points.REPAIR_CAP_PER_ROUND_POINTS + points.POINTS_REPAIR_PLANK);
  });
});
