import { createRandom } from "@/logic/random";
import { createStationLayout } from "@/logic/map/stationLayout";
import type { GameEvent } from "@/logic/game/gameEvents";

const HORDE_MODULE = "@/logic/zombies/zombieHorde";
const CONFIG_MODULE = "@/config/zombieConfig";
const SEED = 4242;
const STEP_S = 1 / 60;
const HP = 100;
const FAR_PLAYER = { x: 0, z: 2.5 };
const NEAR_DISTANCE_M = 0.6;

const load = async () => {
  const horde = await import(/* @vite-ignore */ HORDE_MODULE);
  const config = (await import(/* @vite-ignore */ CONFIG_MODULE)).ZOMBIE_CONFIG;
  const layout = createStationLayout();
  const events: GameEvent[] = [];
  const random = createRandom(SEED);
  const state = horde.createHorde();
  const run = (seconds: number, player = FAR_PLAYER): void => {
    for (let i = 0; i < Math.round(seconds / STEP_S); i++) horde.updateHorde(state, player, STEP_S, layout, events);
  };
  const kinds = (kind: string): GameEvent[] => events.filter((event) => event.kind === kind);
  const alive = (): number => state.zombies.filter((zombie: { alive: boolean }) => zombie.alive).length;
  return { horde, config, layout, events, random, state, run, kinds, alive };
};

describe("zombieHorde spawning", () => {
  it("preallocates ZOMBIE_MAX_ALIVE dead slots", async () => {
    const { state, config } = await load();
    expect(state.zombies).toHaveLength(config.ZOMBIE_MAX_ALIVE);
    expect(state.zombies.every((zombie: { alive: boolean }) => !zombie.alive)).toBe(true);
  });

  it("spawns at the window picked by the seeded random and starts breaching", async () => {
    const { horde, state, layout, random } = await load();
    const expected = createRandom(SEED).pick(layout.spawnPoints);
    expect(horde.requestSpawn(state, HP, "walk", layout, random)).toBe(true);
    const zombie = state.zombies.find((candidate: { alive: boolean }) => candidate.alive);
    expect(zombie.x).toBe(expected.x);
    expect(zombie.z).toBe(expected.z);
    expect(zombie.state).toBe("breaching");
    expect(zombie.hp).toBe(HP);
  });

  it("is deterministic for a fixed seed", async () => {
    const a = await load();
    const b = await load();
    for (let i = 0; i < 5; i++) {
      a.horde.requestSpawn(a.state, HP, "walk", a.layout, a.random);
      b.horde.requestSpawn(b.state, HP, "walk", b.layout, b.random);
    }
    const positions = (zombies: { x: number; z: number }[]) => zombies.map((zombie) => [zombie.x, zombie.z]);
    expect(positions(a.state.zombies)).toEqual(positions(b.state.zombies));
  });

  it("climbs through the window then chases and gets closer to the player", async () => {
    const { horde, state, layout, random, run, config } = await load();
    horde.requestSpawn(state, HP, "walk", layout, random);
    const zombie = state.zombies.find((candidate: { alive: boolean }) => candidate.alive);
    run(config.ZOMBIE_SPAWN_S + STEP_S * 2);
    expect(zombie.state).toBe("chasing");
    const before = Math.hypot(zombie.x - FAR_PLAYER.x, zombie.z - FAR_PLAYER.z);
    run(1);
    expect(Math.hypot(zombie.x - FAR_PLAYER.x, zombie.z - FAR_PLAYER.z)).toBeLessThan(before - config.ZOMBIE_SPEEDS_MPS.walk * 0.9);
  });

  it("moves faster in run mode than in walk mode", async () => {
    const a = await load();
    const b = await load();
    a.horde.requestSpawn(a.state, HP, "walk", a.layout, a.random);
    b.horde.requestSpawn(b.state, HP, "run", b.layout, b.random);
    a.run(a.config.ZOMBIE_SPAWN_S + 1);
    b.run(b.config.ZOMBIE_SPAWN_S + 1);
    const distance = (state: { zombies: { alive: boolean; x: number; z: number }[] }) => {
      const zombie = state.zombies.find((candidate) => candidate.alive);
      return Math.hypot((zombie?.x ?? 0) - FAR_PLAYER.x, (zombie?.z ?? 0) - FAR_PLAYER.z);
    };
    expect(distance(b.state)).toBeLessThan(distance(a.state));
  });

  it("never walks through the station walls while chasing", async () => {
    const { horde, state, layout, random, run, config } = await load();
    for (let i = 0; i < 6; i++) horde.requestSpawn(state, HP, "run", layout, random);
    run(config.ZOMBIE_SPAWN_S + 20);
    for (const zombie of state.zombies) {
      expect(Math.abs(zombie.x)).toBeLessThan(8);
      expect(Math.abs(zombie.z)).toBeLessThan(6);
    }
  });

  it("makes a request wait when the cap is reached and spawns it once a slot frees", async () => {
    const { horde, state, layout, random, run, config, alive } = await load();
    for (let i = 0; i < config.ZOMBIE_MAX_ALIVE + 1; i++) expect(horde.requestSpawn(state, HP, "walk", layout, random)).toBe(true);
    expect(alive()).toBe(config.ZOMBIE_MAX_ALIVE);
    run(STEP_S);
    expect(alive()).toBe(config.ZOMBIE_MAX_ALIVE);
    horde.damageZombie(state, 0, HP, false, false, []);
    run(config.ZOMBIE_DEATH_S + STEP_S * 2);
    expect(alive()).toBe(config.ZOMBIE_MAX_ALIVE);
    const spawned = state.zombies.filter((zombie: { state: string }) => zombie.state !== "dying");
    expect(spawned.length).toBe(config.ZOMBIE_MAX_ALIVE);
  });

  it("refuses a request once the waiting queue is full", async () => {
    const { horde, state, layout, random, config } = await load();
    const total = config.ZOMBIE_MAX_ALIVE + config.ZOMBIE_SPAWN_QUEUE_MAX;
    for (let i = 0; i < total; i++) expect(horde.requestSpawn(state, HP, "walk", layout, random)).toBe(true);
    expect(horde.requestSpawn(state, HP, "walk", layout, random)).toBe(false);
  });

  it("refuses a spawn when the layout has no window", async () => {
    const { horde, state, layout, random } = await load();
    expect(horde.requestSpawn(state, HP, "walk", { ...layout, spawnPoints: [] }, random)).toBe(false);
  });
});

describe("zombieHorde attacks", () => {
  const spawnNear = async () => {
    const ctx = await load();
    ctx.horde.requestSpawn(ctx.state, HP, "walk", ctx.layout, ctx.random);
    const zombie = ctx.state.zombies.find((candidate: { alive: boolean }) => candidate.alive);
    zombie.state = "chasing";
    zombie.x = 0;
    zombie.z = 2.5 - NEAR_DISTANCE_M;
    return { ...ctx, zombie };
  };

  it("starts an attack in range and deals exactly one playerHit per swing", async () => {
    const { zombie, run, kinds, config } = await spawnNear();
    run(STEP_S * 2);
    expect(zombie.state).toBe("attacking");
    run(config.ZOMBIE_ATTACK_WINDUP_S + STEP_S * 2);
    expect(kinds("playerHit")).toHaveLength(1);
    expect(kinds("playerHit")[0]).toEqual({ kind: "playerHit", damage: config.ZOMBIE_ATTACK_DAMAGE, x: zombie.x, z: zombie.z });
    run(config.ZOMBIE_ATTACK_DURATION_S - config.ZOMBIE_ATTACK_WINDUP_S);
    expect(kinds("playerHit")).toHaveLength(1);
  });

  it("reports the position of the zombie that lands the hit", async () => {
    const { zombie, run, kinds, config } = await spawnNear();
    zombie.x = -config.ZOMBIE_ATTACK_RANGE_M * 0.5;
    zombie.z = FAR_PLAYER.z - config.ZOMBIE_ATTACK_RANGE_M * 0.5;
    run(config.ZOMBIE_ATTACK_WINDUP_S + STEP_S * 3);
    const [hit] = kinds("playerHit") as { x: number; z: number }[];
    expect(hit?.x).toBe(zombie.x);
    expect(hit?.z).toBe(zombie.z);
    expect(hit?.x).toBeLessThan(FAR_PLAYER.x);
  });

  it("waits for the cooldown before the next swing", async () => {
    const { run, kinds, config } = await spawnNear();
    run(config.ZOMBIE_ATTACK_DURATION_S + config.ZOMBIE_ATTACK_COOLDOWN_S * 0.5);
    expect(kinds("playerHit")).toHaveLength(1);
    run(config.ZOMBIE_ATTACK_COOLDOWN_S + config.ZOMBIE_ATTACK_DURATION_S);
    expect(kinds("playerHit")).toHaveLength(2);
  });

  it("deals no hit and no attack when the player is out of range", async () => {
    const { run, kinds, state, alive, horde, layout, random } = await load();
    horde.requestSpawn(state, HP, "walk", layout, random);
    run(1);
    expect(alive()).toBe(1);
    expect(state.zombies.some((zombie: { state: string }) => zombie.state === "attacking")).toBe(false);
    expect(kinds("playerHit")).toHaveLength(0);
  });

  it("cancels the swing when the zombie dies mid-attack", async () => {
    const { zombie, run, kinds, horde, state, events, config } = await spawnNear();
    run(config.ZOMBIE_ATTACK_WINDUP_S * 0.5);
    expect(zombie.state).toBe("attacking");
    horde.damageZombie(state, zombie.id, HP, false, false, events);
    run(config.ZOMBIE_ATTACK_DURATION_S + config.ZOMBIE_ATTACK_COOLDOWN_S);
    expect(kinds("playerHit")).toHaveLength(0);
  });
});

describe("zombieHorde damage", () => {
  const spawnOne = async () => {
    const ctx = await load();
    ctx.horde.requestSpawn(ctx.state, HP, "walk", ctx.layout, ctx.random);
    const zombie = ctx.state.zombies.find((candidate: { alive: boolean }) => candidate.alive);
    return { ...ctx, zombie };
  };

  it("pushes zombieHit and keeps the zombie alive while hp remains", async () => {
    const { horde, state, zombie, events } = await spawnOne();
    expect(horde.damageZombie(state, zombie.id, 30, false, false, events)).toBe(true);
    expect(events).toEqual([{ kind: "zombieHit", id: zombie.id, damage: 30, head: false, knife: false }]);
    expect(zombie.hp).toBe(HP - 30);
    expect(zombie.state).not.toBe("dying");
  });

  it("kills at zero hp with a zombieKilled event carrying the headshot flag", async () => {
    const { horde, state, zombie, events } = await spawnOne();
    horde.damageZombie(state, zombie.id, HP, true, false, events);
    expect(events).toEqual([
      { kind: "zombieHit", id: zombie.id, damage: HP, head: true, knife: false },
      { kind: "zombieKilled", id: zombie.id, headshot: true },
    ]);
    expect(zombie.state).toBe("dying");
    expect(zombie.hp).toBe(0);
  });

  it("stops being a hit target and stops moving when dying, then returns to the pool", async () => {
    const { horde, state, zombie, events, run, config } = await spawnOne();
    run(config.ZOMBIE_SPAWN_S + 0.5);
    horde.damageZombie(state, zombie.id, HP, false, true, events);
    const targets: unknown[] = [];
    horde.collectTargets(state, targets);
    expect(targets).not.toContain(zombie);
    const { x, z } = zombie;
    run(config.ZOMBIE_DEATH_S * 0.5);
    expect(zombie.x).toBe(x);
    expect(zombie.z).toBe(z);
    expect(zombie.alive).toBe(true);
    run(config.ZOMBIE_DEATH_S);
    expect(zombie.alive).toBe(false);
  });

  it("collects living zombies as hit targets with radius and height", async () => {
    const { horde, state, zombie, config } = await spawnOne();
    const targets: { id: number; radiusM: number; heightM: number }[] = [];
    horde.collectTargets(state, targets);
    expect(targets).toHaveLength(1);
    expect(targets[0]).toBe(zombie);
    expect(targets[0]?.radiusM).toBe(config.ZOMBIE_RADIUS_M);
    expect(targets[0]?.heightM).toBe(config.ZOMBIE_HEIGHT_M);
  });

  it("ignores damage on a dead, dying or unknown slot", async () => {
    const { horde, state, zombie, events } = await spawnOne();
    expect(horde.damageZombie(state, 999, 10, false, false, events)).toBe(false);
    horde.damageZombie(state, zombie.id, HP, false, false, events);
    events.length = 0;
    expect(horde.damageZombie(state, zombie.id, 10, false, false, events)).toBe(false);
    expect(events).toEqual([]);
  });
});

describe("zombieHorde breaching", () => {
  const BARRICADES_MODULE = "@/logic/map/barricades";
  const MAP_MODULE = "@/config/mapConfig";
  const PLAYER_FAR = { x: 0, z: 2.5 };

  const loadBreach = async () => {
    const context = await load();
    const barricadesModule = await import(/* @vite-ignore */ BARRICADES_MODULE);
    const barricade = (await import(/* @vite-ignore */ MAP_MODULE)).BARRICADE;
    const barricades = barricadesModule.createBarricades(context.layout.windows);
    context.horde.requestSpawn(context.state, HP, "walk", context.layout, context.random);
    const zombie = context.state.zombies.find((candidate: { alive: boolean }) => candidate.alive);
    const runBreach = (seconds: number): void => {
      for (let i = 0; i < Math.round(seconds / STEP_S); i++) context.horde.updateHorde(context.state, PLAYER_FAR, STEP_S, context.layout, context.events, barricades);
    };
    const planks = (): number => barricadesModule.planksOf(barricades, zombie.windowId);
    return { ...context, barricadesModule, barricade, barricades, zombie, runBreach, planks };
  };

  it("places the zombie breaching at the window it was drawn on", async () => {
    const { zombie, layout } = await loadBreach();
    expect(zombie.state).toBe("breaching");
    expect(layout.windows.map((candidate: { id: string }) => candidate.id)).toContain(zombie.windowId);
  });

  it("tears no plank before one tear interval", async () => {
    const { runBreach, planks, barricade, zombie } = await loadBreach();
    runBreach(barricade.TEAR_INTERVAL_S - STEP_S * 3);
    expect(planks()).toBe(barricade.PLANKS_PER_WINDOW);
    expect(zombie.state).toBe("breaching");
  });

  it("tears one plank per tear interval and emits plankTorn at the window", async () => {
    const { runBreach, planks, barricade, kinds, zombie } = await loadBreach();
    runBreach(barricade.TEAR_INTERVAL_S + STEP_S * 2);
    expect(planks()).toBe(barricade.PLANKS_PER_WINDOW - 1);
    runBreach(barricade.TEAR_INTERVAL_S);
    expect(planks()).toBe(barricade.PLANKS_PER_WINDOW - 2);
    expect(kinds("plankTorn")).toHaveLength(2);
    expect(kinds("plankTorn")[0]).toMatchObject({ windowId: zombie.windowId });
  });

  it("stays outside until the window has 0 planks, then climbs in", async () => {
    const { runBreach, planks, barricade, zombie, config } = await loadBreach();
    runBreach(barricade.TEAR_INTERVAL_S * (barricade.PLANKS_PER_WINDOW - 1) + STEP_S * 4);
    expect(planks()).toBe(1);
    expect(zombie.state).toBe("breaching");
    runBreach(barricade.TEAR_INTERVAL_S);
    expect(planks()).toBe(0);
    expect(zombie.state).toBe("spawning");
    runBreach(config.ZOMBIE_SPAWN_S + STEP_S * 2);
    expect(zombie.state).toBe("chasing");
  });

  it("does not move or attack while breaching", async () => {
    const { runBreach, zombie, kinds, barricade } = await loadBreach();
    const { x, z } = zombie;
    runBreach(barricade.TEAR_INTERVAL_S * 3);
    expect(zombie.x).toBe(x);
    expect(zombie.z).toBe(z);
    expect(kinds("playerHit")).toHaveLength(0);
  });

  it("climbs in at once when its window is already bare", async () => {
    const { horde, state, layout, random, barricadesModule, barricades, barricade, events } = await loadBreach();
    horde.requestSpawn(state, HP, "walk", layout, random);
    const second = state.zombies.filter((candidate: { alive: boolean }) => candidate.alive)[1];
    for (let i = 0; i < barricade.PLANKS_PER_WINDOW; i++) barricadesModule.tearPlank(barricades, second.windowId, events);
    horde.updateHorde(state, PLAYER_FAR, STEP_S, layout, events, barricades);
    expect(second.state).toBe("spawning");
  });

  it("skips breaching and climbs in when no barricades are given", async () => {
    const { horde, state, layout, random, events } = await load();
    horde.requestSpawn(state, HP, "walk", layout, random);
    const zombie = state.zombies.find((candidate: { alive: boolean }) => candidate.alive);
    horde.updateHorde(state, PLAYER_FAR, STEP_S, layout, events);
    expect(zombie.state).toBe("spawning");
    expect(events.filter((event) => event.kind === "plankTorn")).toHaveLength(0);
  });

  it("dies normally when shot while breaching and tears nothing more", async () => {
    const { horde, state, runBreach, planks, barricade, zombie, config } = await loadBreach();
    runBreach(barricade.TEAR_INTERVAL_S + STEP_S * 2);
    const planksLeft = planks();
    expect(horde.damageZombie(state, zombie.id, HP, false, false, [])).toBe(true);
    expect(zombie.state).toBe("dying");
    runBreach(config.ZOMBIE_DEATH_S + barricade.TEAR_INTERVAL_S);
    expect(zombie.alive).toBe(false);
    expect(planks()).toBe(planksLeft);
  });
});

describe("zombieHorde killAllZombies", () => {
  const STATES = ["breaching", "spawning", "chasing", "attacking"];
  const DYING_PROGRESS_S = 0.3;
  const QUEUED = 3;
  const QUEUE_HEAD = 1;

  const populate = async () => {
    const loaded = await load();
    STATES.forEach((zombieState, index) => {
      const zombie = loaded.state.zombies[index];
      zombie.alive = true;
      zombie.state = zombieState;
      zombie.hp = HP;
      zombie.stateTimeS = 0.5;
    });
    const dying = loaded.state.zombies[STATES.length];
    dying.alive = true;
    dying.state = "dying";
    dying.stateTimeS = DYING_PROGRESS_S;
    return loaded;
  };

  it("sends every living zombie not yet dying to dying with a fresh timer and returns the count", async () => {
    const { horde, state } = await populate();
    expect(horde.killAllZombies(state)).toBe(STATES.length);
    for (let index = 0; index < STATES.length; index++) {
      expect(state.zombies[index]).toMatchObject({ alive: true, state: "dying", stateTimeS: 0 });
    }
  });

  it("leaves a zombie already dying and the dead slots alone", async () => {
    const { horde, state } = await populate();
    horde.killAllZombies(state);
    expect(state.zombies[STATES.length]).toMatchObject({ alive: true, state: "dying", stateTimeS: DYING_PROGRESS_S });
    expect(state.zombies[STATES.length + 1].alive).toBe(false);
  });

  it("pushes no zombieHit or zombieKilled and returns zero on an empty horde", async () => {
    const { horde, state, events, run } = await populate();
    horde.killAllZombies(state);
    run(0.1);
    expect(events.filter((event) => event.kind === "zombieHit" || event.kind === "zombieKilled")).toHaveLength(0);
    const empty = horde.createHorde();
    expect(horde.killAllZombies(empty)).toBe(0);
  });

  it("returns the killed zombies to the pool and leaves the spawn queue untouched", async () => {
    const { horde, state, config, run, alive } = await populate();
    state.queued = QUEUED;
    state.queueHead = QUEUE_HEAD;
    horde.killAllZombies(state);
    expect(state.queued).toBe(QUEUED);
    expect(state.queueHead).toBe(QUEUE_HEAD);
    run(config.ZOMBIE_DEATH_S + 0.1);
    expect(alive()).toBe(0);
  });
});
