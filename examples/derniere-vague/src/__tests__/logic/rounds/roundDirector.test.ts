import { createRandom } from "@/logic/random";
import { createStationLayout } from "@/logic/map/stationLayout";
import { createHorde, requestSpawn, updateHorde } from "@/logic/zombies/zombieHorde";
import type { GameEvent } from "@/logic/game/gameEvents";

const DIRECTOR_MODULE = "@/logic/rounds/roundDirector";
const ROUND_CONFIG_MODULE = "@/config/roundConfig";
const ZOMBIE_CONFIG_MODULE = "@/config/zombieConfig";
const SEED = 777;
const STEP_S = 1 / 60;
const FAR_PLAYER = { x: 0, z: 2.5 };
const FIRST_ROUND_HP = 150;
const HP_STEP = 100;
const LAST_LINEAR_ROUND = 9;
const LAST_LINEAR_HP = 950;
const GROWTH = 1.1;
const RUN_ROUND = 4;
const BREAK_S = 10;
const SPAWN_WINDOW_S = 30;
const SETTLE_S = 2;

const load = async () => {
  const director = await import(/* @vite-ignore */ DIRECTOR_MODULE);
  const config = (await import(/* @vite-ignore */ ROUND_CONFIG_MODULE)).ROUND_CONFIG;
  const zombieConfig = (await import(/* @vite-ignore */ ZOMBIE_CONFIG_MODULE)).ZOMBIE_CONFIG;
  const layout = createStationLayout();
  const events: GameEvent[] = [];
  const random = createRandom(SEED);
  const horde = createHorde();
  const run = (rounds: unknown, seconds: number): void => {
    for (let i = 0; i < Math.round(seconds / STEP_S); i++) director.updateRounds(rounds, horde, STEP_S, layout, random, events);
  };
  const alive = () => horde.zombies.filter((zombie) => zombie.alive);
  const killAll = (): void => {
    for (const zombie of horde.zombies) zombie.alive = false;
  };
  return { director, config, zombieConfig, layout, events, random, horde, run, alive, killAll };
};

describe("roundDirector scaling", () => {
  it("gives 150 hp in round 1 and adds 100 per round up to round 9", async () => {
    const { director } = await load();
    expect(director.zombieHpForRound(1)).toBe(FIRST_ROUND_HP);
    expect(director.zombieHpForRound(2)).toBe(FIRST_ROUND_HP + HP_STEP);
    expect(director.zombieHpForRound(LAST_LINEAR_ROUND)).toBe(LAST_LINEAR_HP);
  });

  it("multiplies the round 9 hp by 1.1 for each extra round", async () => {
    const { director } = await load();
    expect(director.zombieHpForRound(LAST_LINEAR_ROUND + 1)).toBeCloseTo(LAST_LINEAR_HP * GROWTH, 6);
    expect(director.zombieHpForRound(LAST_LINEAR_ROUND + 3)).toBeCloseTo(LAST_LINEAR_HP * GROWTH ** 3, 6);
  });

  it("grows the zombie count with every round", async () => {
    const { director, config } = await load();
    expect(director.zombieCountForRound(1)).toBe(config.ROUND_BASE_COUNT);
    for (let round = 1; round < 15; round++) expect(director.zombieCountForRound(round + 1)).toBeGreaterThan(director.zombieCountForRound(round));
  });
});

describe("roundDirector spawning", () => {
  it("schedules spawns one at a time instead of all at once", async () => {
    const { director, run, alive } = await load();
    const rounds = director.createRounds(1);
    run(rounds, STEP_S);
    expect(alive()).toHaveLength(1);
    run(rounds, STEP_S * 2);
    expect(alive()).toHaveLength(1);
  });

  it("spawns the whole round count with the round hp", async () => {
    const { director, run, alive } = await load();
    const rounds = director.createRounds(2);
    run(rounds, SPAWN_WINDOW_S);
    const zombies = alive();
    expect(zombies).toHaveLength(director.zombieCountForRound(2));
    for (const zombie of zombies) expect(zombie.hp).toBe(director.zombieHpForRound(2));
  });

  it("spawns walkers before round 4 and runners from round 4", async () => {
    const { director, zombieConfig, run, alive } = await load();
    const walkRounds = director.createRounds(RUN_ROUND - 1);
    run(walkRounds, SPAWN_WINDOW_S);
    for (const zombie of alive()) expect(zombie.speedMps).toBe(zombieConfig.ZOMBIE_SPEEDS_MPS.walk);
    const runner = await load();
    const runRounds = runner.director.createRounds(RUN_ROUND);
    runner.run(runRounds, SPAWN_WINDOW_S);
    expect(runner.alive().length).toBeGreaterThan(0);
    for (const zombie of runner.alive()) expect(zombie.speedMps).toBe(zombieConfig.ZOMBIE_SPEEDS_MPS.run);
  });

  it("keeps the unspawned zombies of the round while the spawn queue is full", async () => {
    const { director, zombieConfig, layout, random, horde, run } = await load();
    for (let i = 0; i < zombieConfig.ZOMBIE_MAX_ALIVE + zombieConfig.ZOMBIE_SPAWN_QUEUE_MAX; i++) requestSpawn(horde, 1, "walk", layout, random);
    expect(requestSpawn(horde, 1, "walk", layout, random)).toBe(false);
    const rounds = director.createRounds(1);
    run(rounds, SETTLE_S);
    expect(rounds.phase.kind).toBe("active");
    expect(rounds.phase.remainingSpawns).toBe(director.zombieCountForRound(1));
    for (const zombie of horde.zombies) zombie.alive = false;
    for (let i = 0; i < Math.round(SPAWN_WINDOW_S / STEP_S); i++) {
      updateHorde(horde, FAR_PLAYER, STEP_S, layout, []);
      director.updateRounds(rounds, horde, STEP_S, layout, random, []);
    }
    expect(rounds.phase.remainingSpawns).toBe(0);
  });
});

describe("roundDirector round flow", () => {
  it("stays active while zombies are still alive", async () => {
    const { director, run } = await load();
    const rounds = director.createRounds(1);
    run(rounds, SPAWN_WINDOW_S);
    expect(rounds.phase.kind).toBe("active");
    expect(rounds.number).toBe(1);
  });

  it("starts the intermission once every zombie of the round is dead", async () => {
    const { director, run, killAll } = await load();
    const rounds = director.createRounds(1);
    run(rounds, SPAWN_WINDOW_S);
    killAll();
    run(rounds, STEP_S);
    expect(rounds.phase.kind).toBe("intermission");
    expect(rounds.number).toBe(1);
  });

  it("starts round N + 1 after the 10 s break and announces it", async () => {
    const { director, run, killAll, events, alive } = await load();
    const rounds = director.createRounds(1);
    run(rounds, SPAWN_WINDOW_S);
    killAll();
    run(rounds, BREAK_S - SETTLE_S);
    expect(rounds.phase.kind).toBe("intermission");
    expect(rounds.number).toBe(1);
    expect(events.filter((event) => event.kind === "roundStarted")).toHaveLength(0);
    run(rounds, SETTLE_S + STEP_S * 2);
    expect(rounds.number).toBe(2);
    expect(rounds.phase.kind).toBe("active");
    expect(events.filter((event) => event.kind === "roundStarted")).toEqual([{ kind: "roundStarted", round: 2 }]);
    run(rounds, SPAWN_WINDOW_S);
    expect(alive()).toHaveLength(director.zombieCountForRound(2));
  });
});
