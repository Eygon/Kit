import type { GameEvent } from "@/logic/game/gameEvents";

const POWER_UPS_MODULE = "@/logic/powerUps/powerUps";
const CONFIG_MODULE = "@/config/powerUpConfig";
const RANDOM_MODULE = "@/logic/random";
const SEED = 2024;
const SEEDED_KILLS = 120;
const ALMOST_LIFETIME_S = 24.9;
const OVER_LIFETIME_S = 0.2;
const NEAR_M = 0.99;
const FAR_M = 1.5;
const FAR_PLAYER = { x: 50, z: 50 };
const DROP_X = 3;
const DROP_Z = -4;

type TestDrop = { active: boolean; kind: string; x: number; z: number; remainingS: number };

const load = async () => {
  const powerUps = await import(/* @vite-ignore */ POWER_UPS_MODULE);
  const config = await import(/* @vite-ignore */ CONFIG_MODULE);
  const state = powerUps.createPowerUps();
  const events: GameEvent[] = [];
  const stubRandom = (next: number, kind: string) => ({ next: () => next, range: () => 0, int: () => 0, pick: () => kind });
  const drop = (kind: string, x = DROP_X, z = DROP_Z, next = 0): boolean => powerUps.rollDrop(state, x, z, stubRandom(next, kind), events);
  const kinds = (kind: string): GameEvent[] => events.filter((event) => event.kind === kind);
  const active = (): TestDrop[] => state.drops.filter((entry: TestDrop) => entry.active);
  return { powerUps, config, state, events, drop, kinds, active };
};

describe("powerUpConfig", () => {
  it("holds the tuning of the power-ups", async () => {
    const { config } = await load();
    expect(config.POWER_UP_KINDS).toEqual(["maxAmmo", "instaKill", "doublePoints", "nuke"]);
    expect(config.DROP_CHANCE).toBeCloseTo(1 / 30, 10);
    expect(config.MAX_DROPS_PER_ROUND).toBe(4);
    expect(config.DROP_LIFETIME_S).toBe(25);
    expect(config.DROP_BLINK_S).toBe(5);
    expect(config.PICKUP_RADIUS_M).toBe(1);
    expect(config.TIMED_DURATION_S).toBe(30);
    expect(config.NUKE_POINTS).toBe(400);
  });
});

describe("powerUps creation", () => {
  it("preallocates MAX_DROPS_PER_ROUND inactive slots, zero timers and no drop counted", async () => {
    const { state, config } = await load();
    expect(state.drops).toHaveLength(config.MAX_DROPS_PER_ROUND);
    expect(state.drops.every((entry: TestDrop) => !entry.active)).toBe(true);
    expect(state.timers).toEqual({ instaKill: 0, doublePoints: 0 });
    expect(state.dropsThisRound).toBe(0);
  });
});

describe("powerUps rollDrop", () => {
  it("drops the picked kind at the given position when the draw is under the chance", async () => {
    const { state, drop, kinds, active, config } = await load();
    expect(drop("doublePoints")).toBe(true);
    expect(active()).toHaveLength(1);
    expect(state.drops[0]).toMatchObject({ active: true, kind: "doublePoints", x: DROP_X, z: DROP_Z, remainingS: config.DROP_LIFETIME_S });
    expect(kinds("powerUpDropped")).toEqual([{ kind: "powerUpDropped", slot: 0, powerUpKind: "doublePoints", x: DROP_X, z: DROP_Z }]);
    expect(state.dropsThisRound).toBe(1);
  });

  it("drops nothing when the draw reaches the chance", async () => {
    const { state, drop, kinds, active, config } = await load();
    expect(drop("nuke", DROP_X, DROP_Z, config.DROP_CHANCE)).toBe(false);
    expect(active()).toHaveLength(0);
    expect(kinds("powerUpDropped")).toHaveLength(0);
    expect(state.dropsThisRound).toBe(0);
  });

  it("uses distinct slots for successive drops", async () => {
    const { drop, kinds } = await load();
    drop("maxAmmo");
    drop("nuke");
    expect(kinds("powerUpDropped").map((event) => (event as { slot: number }).slot)).toEqual([0, 1]);
  });

  it("refuses a drop at the round cap until the round counter is reset", async () => {
    const { powerUps, state, drop, kinds, config } = await load();
    for (let index = 0; index < config.MAX_DROPS_PER_ROUND; index++) expect(drop("maxAmmo")).toBe(true);
    expect(drop("maxAmmo")).toBe(false);
    expect(kinds("powerUpDropped")).toHaveLength(config.MAX_DROPS_PER_ROUND);
    powerUps.updatePowerUps(state, FAR_PLAYER, config.DROP_LIFETIME_S + 1, []);
    expect(drop("maxAmmo")).toBe(false);
    powerUps.resetRoundDrops(state);
    expect(state.dropsThisRound).toBe(0);
    expect(drop("maxAmmo")).toBe(true);
  });
});

describe("powerUps seeded drops", () => {
  const rollSeededKills = async (): Promise<GameEvent[]> => {
    const { powerUps, state, events } = await load();
    const random = (await import(/* @vite-ignore */ RANDOM_MODULE)).createRandom(SEED);
    for (let index = 0; index < SEEDED_KILLS; index++) {
      powerUps.rollDrop(state, index, -index, random, events);
      for (const entry of state.drops) entry.active = false;
      powerUps.resetRoundDrops(state);
    }
    return events;
  };

  it("draws the same drops, kinds and positions from the same seed", async () => {
    const expected = [
      { kind: "powerUpDropped", slot: 0, powerUpKind: "doublePoints", x: 18, z: -18 },
      { kind: "powerUpDropped", slot: 0, powerUpKind: "instaKill", x: 23, z: -23 },
      { kind: "powerUpDropped", slot: 0, powerUpKind: "instaKill", x: 57, z: -57 },
      { kind: "powerUpDropped", slot: 0, powerUpKind: "instaKill", x: 103, z: -103 },
      { kind: "powerUpDropped", slot: 0, powerUpKind: "maxAmmo", x: 119, z: -119 },
    ];
    expect(await rollSeededKills()).toEqual(expected);
    expect(await rollSeededKills()).toEqual(expected);
  });

  it("refuses a drop while every slot still holds a drop from the previous round", async () => {
    const { powerUps, state, drop, kinds, config } = await load();
    for (let index = 0; index < config.MAX_DROPS_PER_ROUND; index++) drop("maxAmmo");
    powerUps.resetRoundDrops(state);
    expect(drop("nuke")).toBe(false);
    expect(kinds("powerUpDropped")).toHaveLength(config.MAX_DROPS_PER_ROUND);
    expect(state.dropsThisRound).toBe(0);
  });
});

describe("powerUps updatePowerUps", () => {
  it("keeps a drop lying until its lifetime ends, then removes it with an expiry event", async () => {
    const { powerUps, state, drop, active } = await load();
    drop("maxAmmo");
    const sink: GameEvent[] = [];
    expect(powerUps.updatePowerUps(state, FAR_PLAYER, ALMOST_LIFETIME_S, sink)).toBeNull();
    expect(active()).toHaveLength(1);
    expect(sink).toHaveLength(0);
    expect(powerUps.updatePowerUps(state, FAR_PLAYER, OVER_LIFETIME_S, sink)).toBeNull();
    expect(active()).toHaveLength(0);
    expect(sink).toEqual([{ kind: "powerUpExpired", slot: 0 }]);
  });

  it("takes a drop within the pickup radius, returns its kind and emits the taken event", async () => {
    const { powerUps, state, drop, active } = await load();
    drop("maxAmmo");
    const sink: GameEvent[] = [];
    expect(powerUps.updatePowerUps(state, { x: DROP_X + NEAR_M, z: DROP_Z }, 1 / 60, sink)).toBe("maxAmmo");
    expect(active()).toHaveLength(0);
    expect(sink).toEqual([{ kind: "powerUpTaken", powerUpKind: "maxAmmo" }]);
  });

  it("leaves a drop outside the pickup radius lying", async () => {
    const { powerUps, state, drop, active } = await load();
    drop("maxAmmo");
    const sink: GameEvent[] = [];
    expect(powerUps.updatePowerUps(state, { x: DROP_X + FAR_M, z: DROP_Z }, 1 / 60, sink)).toBeNull();
    expect(active()).toHaveLength(1);
    expect(sink).toHaveLength(0);
  });

  it("takes only the first drop in range per step", async () => {
    const { powerUps, state, drop, active } = await load();
    drop("nuke");
    drop("maxAmmo");
    expect(powerUps.updatePowerUps(state, { x: DROP_X, z: DROP_Z }, 1 / 60, [])).toBe("nuke");
    expect(active()).toHaveLength(1);
    expect(powerUps.updatePowerUps(state, { x: DROP_X, z: DROP_Z }, 1 / 60, [])).toBe("maxAmmo");
  });
});

describe("powerUps timed kinds", () => {
  it("keeps instaKill active for TIMED_DURATION_S after the pickup", async () => {
    const { powerUps, state, drop, config } = await load();
    expect(powerUps.isPowerUpActive(state, "instaKill")).toBe(false);
    drop("instaKill");
    powerUps.updatePowerUps(state, { x: DROP_X, z: DROP_Z }, 1 / 60, []);
    expect(powerUps.isPowerUpActive(state, "instaKill")).toBe(true);
    expect(powerUps.isPowerUpActive(state, "doublePoints")).toBe(false);
    powerUps.updatePowerUps(state, FAR_PLAYER, config.TIMED_DURATION_S - 1, []);
    expect(powerUps.isPowerUpActive(state, "instaKill")).toBe(true);
    powerUps.updatePowerUps(state, FAR_PLAYER, 1.5, []);
    expect(powerUps.isPowerUpActive(state, "instaKill")).toBe(false);
  });

  it("restarts the timer at TIMED_DURATION_S when a second drop of the kind is taken", async () => {
    const { powerUps, state, drop, config } = await load();
    drop("doublePoints");
    powerUps.updatePowerUps(state, { x: DROP_X, z: DROP_Z }, 1 / 60, []);
    powerUps.updatePowerUps(state, FAR_PLAYER, config.TIMED_DURATION_S - 5, []);
    drop("doublePoints");
    powerUps.updatePowerUps(state, { x: DROP_X, z: DROP_Z }, 1 / 60, []);
    powerUps.updatePowerUps(state, FAR_PLAYER, config.TIMED_DURATION_S - 5, []);
    expect(powerUps.isPowerUpActive(state, "doublePoints")).toBe(true);
    powerUps.updatePowerUps(state, FAR_PLAYER, 6, []);
    expect(powerUps.isPowerUpActive(state, "doublePoints")).toBe(false);
  });

  it("never reports maxAmmo or nuke as an active effect", async () => {
    const { powerUps, state, drop } = await load();
    drop("maxAmmo");
    drop("nuke");
    powerUps.updatePowerUps(state, { x: DROP_X, z: DROP_Z }, 1 / 60, []);
    powerUps.updatePowerUps(state, { x: DROP_X, z: DROP_Z }, 1 / 60, []);
    expect(powerUps.isPowerUpActive(state, "maxAmmo")).toBe(false);
    expect(powerUps.isPowerUpActive(state, "nuke")).toBe(false);
  });
});
