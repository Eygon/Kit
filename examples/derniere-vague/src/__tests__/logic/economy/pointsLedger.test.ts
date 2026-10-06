import type { GameEvent } from "@/logic/game/gameEvents";

const LEDGER_MODULE = "@/logic/economy/pointsLedger";
const CONFIG_MODULE = "@/config/pointsConfig";
const ZOMBIE_ID = 4;

const load = async () => {
  const ledgerModule = await import(/* @vite-ignore */ LEDGER_MODULE);
  const config = (await import(/* @vite-ignore */ CONFIG_MODULE)).POINTS_CONFIG;
  const ledger = ledgerModule.createLedger(config.START_POINTS);
  const apply = (...events: GameEvent[]): void => {
    for (const event of events) ledgerModule.applyEvent(ledger, event);
  };
  return { ledgerModule, config, ledger, apply };
};

const hit = (knife: boolean, head = false): GameEvent => ({ kind: "zombieHit", id: ZOMBIE_ID, damage: 25, head, knife });
const killed = (headshot: boolean): GameEvent => ({ kind: "zombieKilled", id: ZOMBIE_ID, headshot });

describe("pointsLedger", () => {
  it("starts with 500 points", async () => {
    const { ledger, config } = await load();
    expect(config.START_POINTS).toBe(500);
    expect(ledger.points).toBe(500);
  });

  it("awards 10 points for a hit that does not kill", async () => {
    const { ledger, apply, config } = await load();
    apply(hit(false));
    expect(ledger.points).toBe(config.START_POINTS + 10);
  });

  it("awards 60 points for a body kill and no extra hit bonus", async () => {
    const { ledger, apply, config } = await load();
    apply(killed(false), hit(false));
    expect(ledger.points).toBe(config.START_POINTS + 60);
  });

  it("awards 100 points for a head kill and no extra hit bonus", async () => {
    const { ledger, apply, config } = await load();
    apply(killed(true), hit(false, true));
    expect(ledger.points).toBe(config.START_POINTS + 100);
  });

  it("awards 130 points for a knife kill", async () => {
    const { ledger, apply, config } = await load();
    apply(killed(false), hit(true));
    expect(ledger.points).toBe(config.START_POINTS + 130);
  });

  it("awards a non lethal knife hit like any other hit", async () => {
    const { ledger, apply, config } = await load();
    apply(hit(true));
    expect(ledger.points).toBe(config.START_POINTS + 10);
  });

  it("forgets the kills of a step once the step ends", async () => {
    const { ledger, ledgerModule, apply, config } = await load();
    apply(killed(false), hit(false));
    ledgerModule.endLedgerStep(ledger);
    apply(hit(false));
    expect(ledger.points).toBe(config.START_POINTS + 60 + 10);
  });

  it("ignores events that do not earn points", async () => {
    const { ledger, apply, config } = await load();
    apply({ kind: "shotFired" }, { kind: "playerHit", damage: 35, x: 0, z: 0 }, { kind: "reloadDone" });
    expect(ledger.points).toBe(config.START_POINTS);
  });
});

describe("pointsLedger trySpend", () => {
  it("subtracts the cost and returns true when the balance covers it", async () => {
    const { ledgerModule, ledger } = await load();
    ledger.points = 1500;
    expect(ledgerModule.trySpend(ledger, 1200)).toBe(true);
    expect(ledger.points).toBe(300);
  });

  it("spends the whole balance when the cost equals it", async () => {
    const { ledgerModule, ledger } = await load();
    ledger.points = 600;
    expect(ledgerModule.trySpend(ledger, 600)).toBe(true);
    expect(ledger.points).toBe(0);
  });

  it("leaves the balance unchanged and returns false when it falls short", async () => {
    const { ledgerModule, ledger } = await load();
    ledger.points = 800;
    expect(ledgerModule.trySpend(ledger, 1200)).toBe(false);
    expect(ledger.points).toBe(800);
  });
});

describe("pointsLedger multiplier", () => {
  const DOUBLE = 2;

  it("starts with a multiplier of 1", async () => {
    const { ledger } = await load();
    expect(ledger.multiplier).toBe(1);
  });

  it("doubles the hit points", async () => {
    const { ledger, apply, config } = await load();
    ledger.multiplier = DOUBLE;
    apply(hit(false));
    expect(ledger.points).toBe(config.START_POINTS + config.POINTS_HIT * DOUBLE);
  });

  it("doubles body and head kills", async () => {
    const { ledger, apply, config } = await load();
    ledger.multiplier = DOUBLE;
    apply(killed(false), hit(false));
    expect(ledger.points).toBe(config.START_POINTS + config.POINTS_KILL * DOUBLE);
    apply(killed(true));
    expect(ledger.points).toBe(config.START_POINTS + (config.POINTS_KILL + config.POINTS_HEADSHOT_KILL) * DOUBLE);
  });

  it("doubles the whole knife kill", async () => {
    const { ledger, apply, config } = await load();
    ledger.multiplier = DOUBLE;
    apply(killed(false), hit(true));
    expect(ledger.points).toBe(config.START_POINTS + config.POINTS_KNIFE_KILL * DOUBLE);
  });

  it("leaves spending untouched", async () => {
    const { ledgerModule, ledger, config } = await load();
    ledger.multiplier = DOUBLE;
    expect(ledgerModule.trySpend(ledger, 100)).toBe(true);
    expect(ledger.points).toBe(config.START_POINTS - 100);
    expect(ledgerModule.trySpend(ledger, config.START_POINTS)).toBe(false);
  });
});
