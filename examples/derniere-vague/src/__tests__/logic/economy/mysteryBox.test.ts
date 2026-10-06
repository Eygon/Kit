import type { GameEvent } from "@/logic/game/gameEvents";

export {};

const BOX_MODULE = "@/logic/economy/mysteryBox";
const CONFIG_MODULE = "@/config/boxConfig";
const RANDOM_MODULE = "@/logic/random";
const LEDGER_MODULE = "@/logic/economy/pointsLedger";
const SEED = 7;
const STEP_S = 1 / 60;
const TEDDY_ROLL_VALUE = 0.1;
const SAFE_ROLL_VALUE = 0.9;
const POOL_DRAWS = 3000;
const RAY_GUN_SHARE_MIN = 0.08;
const RAY_GUN_SHARE_MAX = 0.14;
const COMMON_SHARE_MIN = 0.19;
const COMMON_SHARE_MAX = 0.25;
const DETERMINISM_ROLLS = 12;

type BoxState = { kind: string; remainingS?: number; weaponId?: string };
type TestBox = { state: BoxState; spot: number; rolls: number };
type FixedRandom = { next: () => number; range: (min: number, max: number) => number; int: (min: number, max: number) => number; pick: <T>(items: readonly T[]) => T };
type PoolEntry = { weaponId: string; weight: number };

const fixedRandom = (value: number): FixedRandom => ({
  next: () => value,
  range: (min, max) => min + (max - min) * value,
  int: (min, max) => Math.floor(min + (max - min) * value),
  pick: (items) => items[0] as never,
});

const load = async (points = 0) => {
  const boxModule = await import(/* @vite-ignore */ BOX_MODULE);
  const config = await import(/* @vite-ignore */ CONFIG_MODULE);
  const randomModule = await import(/* @vite-ignore */ RANDOM_MODULE);
  const ledgerModule = await import(/* @vite-ignore */ LEDGER_MODULE);
  const box: TestBox = boxModule.createMysteryBox();
  const ledger = ledgerModule.createLedger(points);
  const events: GameEvent[] = [];
  const random = randomModule.createRandom(SEED);
  const stepSeconds = (seconds: number, source: FixedRandom = random): void => {
    const steps = Math.round(seconds / STEP_S);
    for (let i = 0; i < steps; i++) boxModule.updateMysteryBox(box, STEP_S, source, ledger, events);
  };
  const kinds = (): string[] => events.map((event) => event.kind);
  const offerOnce = (source: FixedRandom = random): string => {
    boxModule.openBox(box, events);
    stepSeconds(config.BOX_ROLL_S + STEP_S, source);
    const offered = box.state.weaponId;
    if (offered === undefined) throw new Error("no offer");
    boxModule.takeOffer(box, events);
    return offered;
  };
  return { boxModule, config, box, ledger, events, random, stepSeconds, kinds, offerOnce };
};

describe("mysteryBox config", () => {
  it("holds the tuning of the box", async () => {
    const { config } = await load();
    expect(config.BOX_COST_POINTS).toBe(950);
    expect(config.BOX_ROLL_S).toBe(4);
    expect(config.BOX_OFFER_S).toBe(10);
    expect(config.BOX_MOVE_S).toBe(3);
    expect(config.TEDDY_FROM_ROLL).toBe(4);
    expect(config.TEDDY_CHANCE).toBe(0.25);
    expect(config.BOX_SPOTS).toHaveLength(3);
    expect(config.BOX_START_SPOT).toBe(0);
  });

  it("weights the pool with the ray gun at half the others", async () => {
    const { config } = await load();
    const pool: readonly PoolEntry[] = config.BOX_POOL;
    const weightOf = (weaponId: string): number | undefined => pool.find((entry) => entry.weaponId === weaponId)?.weight;
    for (const weaponId of ["smg", "carbine", "shotgun", "lmg"]) expect(weightOf(weaponId)).toBe(1);
    expect(weightOf("rayGun")).toBe(0.5);
    expect(pool).toHaveLength(5);
  });
});

describe("mysteryBox opening and rolling", () => {
  it("starts idle on the start spot with no roll done", async () => {
    const { box, config } = await load();
    expect(box.state).toEqual({ kind: "idle" });
    expect(box.spot).toBe(config.BOX_START_SPOT);
    expect(box.rolls).toBe(0);
  });

  it("rolls for the roll time once opened and announces it", async () => {
    const { boxModule, box, events, config } = await load();
    boxModule.openBox(box, events);
    expect(box.state).toEqual({ kind: "rolling", remainingS: config.BOX_ROLL_S });
    expect(box.rolls).toBe(1);
    expect(events).toEqual([{ kind: "boxOpened" }]);
  });

  it("counts the roll time down with the step", async () => {
    const { boxModule, box, events, stepSeconds, config } = await load();
    boxModule.openBox(box, events);
    stepSeconds(1);
    expect(box.state.kind).toBe("rolling");
    expect(box.state.remainingS).toBeCloseTo(config.BOX_ROLL_S - 1, 5);
  });

  it("ignores a second opening while rolling, offering or moving", async () => {
    const { boxModule, box, events, stepSeconds, config } = await load();
    boxModule.openBox(box, events);
    stepSeconds(1);
    boxModule.openBox(box, events);
    expect(box.rolls).toBe(1);
    expect(box.state.remainingS).toBeCloseTo(config.BOX_ROLL_S - 1, 5);
    stepSeconds(config.BOX_ROLL_S);
    expect(box.state.kind).toBe("offering");
    boxModule.openBox(box, events);
    expect(box.state.kind).toBe("offering");
    box.state = { kind: "moving", remainingS: 1 };
    boxModule.openBox(box, events);
    expect(box.state).toEqual({ kind: "moving", remainingS: 1 });
    expect(events.filter((event) => event.kind === "boxOpened")).toHaveLength(1);
  });

  it("does nothing while idle", async () => {
    const { box, events, stepSeconds, ledger } = await load(100);
    stepSeconds(30);
    expect(box.state).toEqual({ kind: "idle" });
    expect(events).toEqual([]);
    expect(ledger.points).toBe(100);
  });
});

describe("mysteryBox offer", () => {
  it("offers a pool weapon for the offer time once the roll ends", async () => {
    const { boxModule, box, events, stepSeconds, config, kinds } = await load();
    boxModule.openBox(box, events);
    stepSeconds(config.BOX_ROLL_S + STEP_S);
    const pool: readonly PoolEntry[] = config.BOX_POOL;
    expect(box.state.kind).toBe("offering");
    expect(pool.map((entry) => entry.weaponId)).toContain(box.state.weaponId);
    expect(box.state.remainingS).toBeLessThanOrEqual(config.BOX_OFFER_S);
    expect(box.state.remainingS).toBeGreaterThan(config.BOX_OFFER_S - 2 * STEP_S);
    expect(kinds()).toEqual(["boxOpened", "boxOffered"]);
    expect(events[1]).toEqual({ kind: "boxOffered", weaponId: box.state.weaponId });
  });

  it("draws the offer from the weighted pool with the session random", async () => {
    const { boxModule, box, events, stepSeconds, config } = await load();
    boxModule.openBox(box, events);
    stepSeconds(config.BOX_ROLL_S + STEP_S, fixedRandom(0));
    expect(box.state.weaponId).toBe("smg");
    boxModule.takeOffer(box, events);
    boxModule.openBox(box, events);
    stepSeconds(config.BOX_ROLL_S + STEP_S, fixedRandom(0.999));
    expect(box.state.weaponId).toBe("rayGun");
  });

  it("follows the pool weights over many draws", async () => {
    const { box, offerOnce, random } = await load();
    const counts = new Map<string, number>();
    for (let i = 0; i < POOL_DRAWS; i++) {
      box.rolls = 0;
      const weaponId = offerOnce(random);
      counts.set(weaponId, (counts.get(weaponId) ?? 0) + 1);
    }
    const share = (weaponId: string): number => (counts.get(weaponId) ?? 0) / POOL_DRAWS;
    expect(share("rayGun")).toBeGreaterThan(RAY_GUN_SHARE_MIN);
    expect(share("rayGun")).toBeLessThan(RAY_GUN_SHARE_MAX);
    for (const weaponId of ["smg", "carbine", "shotgun", "lmg"]) {
      expect(share(weaponId)).toBeGreaterThan(COMMON_SHARE_MIN);
      expect(share(weaponId)).toBeLessThan(COMMON_SHARE_MAX);
    }
    expect(counts.has("pistol")).toBe(false);
  });

  it("replays the same offers for the same seed", async () => {
    const first = await load();
    const second = await load();
    const run = (loaded: Awaited<ReturnType<typeof load>>): string[] => {
      const offers: string[] = [];
      for (let i = 0; i < DETERMINISM_ROLLS; i++) {
        loaded.box.rolls = 0;
        offers.push(loaded.offerOnce());
      }
      return offers;
    };
    expect(run(first)).toEqual(run(second));
  });

  it("gives the offered weapon to whoever takes it within the offer time", async () => {
    const { boxModule, box, events, stepSeconds, config } = await load();
    boxModule.openBox(box, events);
    stepSeconds(config.BOX_ROLL_S + config.BOX_OFFER_S / 2);
    const offered = box.state.weaponId;
    expect(boxModule.takeOffer(box, events)).toBe(offered);
    expect(box.state).toEqual({ kind: "idle" });
    expect(events[events.length - 1]).toEqual({ kind: "boxWeaponTaken", weaponId: offered });
  });

  it("gives nothing when nothing is offered", async () => {
    const { boxModule, box, events, stepSeconds, config } = await load();
    expect(boxModule.takeOffer(box, events)).toBeNull();
    boxModule.openBox(box, events);
    stepSeconds(1);
    expect(boxModule.takeOffer(box, events)).toBeNull();
    expect(box.state.kind).toBe("rolling");
    box.state = { kind: "moving", remainingS: config.BOX_MOVE_S };
    expect(boxModule.takeOffer(box, events)).toBeNull();
    expect(events.some((event) => event.kind === "boxWeaponTaken")).toBe(false);
  });

  it("closes the box and loses the weapon when the offer time elapses", async () => {
    const { boxModule, box, events, stepSeconds, config, ledger } = await load(10);
    boxModule.openBox(box, events);
    stepSeconds(config.BOX_ROLL_S + config.BOX_OFFER_S + 2 * STEP_S);
    expect(box.state).toEqual({ kind: "idle" });
    expect(boxModule.takeOffer(box, events)).toBeNull();
    expect(ledger.points).toBe(10);
    expect(events.some((event) => event.kind === "boxWeaponTaken" || event.kind === "boxTeddy")).toBe(false);
  });

  it("can be opened again after the offer is taken or lost", async () => {
    const { boxModule, box, events, offerOnce } = await load();
    offerOnce();
    boxModule.openBox(box, events);
    expect(box.state.kind).toBe("rolling");
    expect(box.rolls).toBe(2);
  });
});

describe("mysteryBox teddy", () => {
  it("never shows the teddy before the teddy roll, whatever the draw", async () => {
    const { boxModule, box, events, stepSeconds, config, ledger } = await load();
    box.rolls = config.TEDDY_FROM_ROLL - 2;
    boxModule.openBox(box, events);
    expect(box.rolls).toBe(config.TEDDY_FROM_ROLL - 1);
    stepSeconds(config.BOX_ROLL_S + STEP_S, fixedRandom(TEDDY_ROLL_VALUE));
    expect(box.state.kind).toBe("offering");
    expect(ledger.points).toBe(0);
    expect(events.some((event) => event.kind === "boxTeddy")).toBe(false);
  });

  it("refunds the cost, announces the teddy and moves the box when the draw selects it", async () => {
    const { boxModule, box, events, stepSeconds, config, ledger, kinds } = await load();
    box.rolls = config.TEDDY_FROM_ROLL - 1;
    boxModule.openBox(box, events);
    stepSeconds(config.BOX_ROLL_S + STEP_S, fixedRandom(TEDDY_ROLL_VALUE));
    expect(ledger.points).toBe(config.BOX_COST_POINTS);
    expect(box.state.kind).toBe("moving");
    expect(kinds()).toEqual(["boxOpened", "boxTeddy"]);
    expect(events.some((event) => event.kind === "boxOffered")).toBe(false);
  });

  it("moves to another spot once the move time elapses", async () => {
    const { boxModule, box, events, stepSeconds, config } = await load();
    const startSpot = box.spot;
    box.rolls = config.TEDDY_FROM_ROLL - 1;
    boxModule.openBox(box, events);
    stepSeconds(config.BOX_ROLL_S + STEP_S, fixedRandom(TEDDY_ROLL_VALUE));
    stepSeconds(config.BOX_MOVE_S / 2, fixedRandom(TEDDY_ROLL_VALUE));
    expect(box.state.kind).toBe("moving");
    expect(box.spot).toBe(startSpot);
    stepSeconds(config.BOX_MOVE_S, fixedRandom(TEDDY_ROLL_VALUE));
    expect(box.state).toEqual({ kind: "idle" });
    expect(box.spot).not.toBe(startSpot);
    expect(box.spot).toBeGreaterThanOrEqual(0);
    expect(box.spot).toBeLessThan(config.BOX_SPOTS.length);
    expect(events[events.length - 1]).toEqual({ kind: "boxMoved", spot: box.spot });
    expect(box.rolls).toBe(0);
  });

  it("reaches every other spot depending on the draw and never stays", async () => {
    const reached: number[] = [];
    for (const drawn of [0, 1]) {
      const loaded = await load();
      const source: FixedRandom = { ...fixedRandom(TEDDY_ROLL_VALUE), int: () => drawn };
      loaded.box.rolls = loaded.config.TEDDY_FROM_ROLL - 1;
      loaded.box.spot = 1;
      loaded.boxModule.openBox(loaded.box, loaded.events);
      loaded.stepSeconds(loaded.config.BOX_ROLL_S + STEP_S, source);
      loaded.stepSeconds(loaded.config.BOX_MOVE_S + STEP_S, source);
      reached.push(loaded.box.spot);
    }
    expect(reached).toEqual([0, 2]);
  });

  it("keeps the teddy out of reach when the draw misses the chance", async () => {
    const { boxModule, box, events, stepSeconds, config, ledger } = await load();
    box.rolls = config.TEDDY_FROM_ROLL - 1;
    boxModule.openBox(box, events);
    stepSeconds(config.BOX_ROLL_S + STEP_S, fixedRandom(SAFE_ROLL_VALUE));
    expect(box.state.kind).toBe("offering");
    expect(ledger.points).toBe(0);
  });

  it("can offer the teddy on every roll after the teddy roll", async () => {
    const { boxModule, box, events, stepSeconds, config, ledger } = await load();
    box.rolls = config.TEDDY_FROM_ROLL + 5;
    boxModule.openBox(box, events);
    stepSeconds(config.BOX_ROLL_S + STEP_S, fixedRandom(TEDDY_ROLL_VALUE));
    expect(box.state.kind).toBe("moving");
    expect(ledger.points).toBe(config.BOX_COST_POINTS);
  });
});
