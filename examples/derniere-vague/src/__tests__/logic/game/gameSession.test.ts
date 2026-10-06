import { createInputState } from "@/logic/input/inputState";
import type { InputState } from "@/logic/input/inputState";

const LAYOUT_MODULE = "@/logic/map/stationLayout";
const SESSION_MODULE = "@/logic/game/gameSession";
const POINTS_MODULE = "@/config/pointsConfig";
const ROUND_CONFIG_MODULE = "@/config/roundConfig";
const PLAYER_CONFIG_MODULE = "@/config/playerConfig";
const SEED = 2024;
const STEP_S = 1 / 60;
const NO_ASSIST_RAD = 0;
const BODY_PITCH_RAD = 0;
const HEAD_PITCH_RAD = 0.03;
const SHOT_DISTANCE_M = 3;
const KNIFE_DISTANCE_M = 1;
const ADJACENT_DISTANCE_M = 0.5;
const PISTOL_BODY_DAMAGE = 25;
const PISTOL_HEAD_DAMAGE = 50;
const KNIFE_DAMAGE = 60;
const MAX_FIGHT_STEPS = 900;
const FIRST_HIT_STEPS = 120;
const REGEN_WAIT_S = 4.5;
const SPAWN_WAIT_S = 6;
const DETERMINISM_STEPS = 300;

type TestZombie = { alive: boolean; state: string; x: number; z: number; hp: number; speedMps: number; stateTimeS: number; cooldownS: number };

const load = async () => {
  const sessionModule = await import(/* @vite-ignore */ SESSION_MODULE);
  const points = (await import(/* @vite-ignore */ POINTS_MODULE)).POINTS_CONFIG;
  const roundConfig = (await import(/* @vite-ignore */ ROUND_CONFIG_MODULE)).ROUND_CONFIG;
  const playerConfig = (await import(/* @vite-ignore */ PLAYER_CONFIG_MODULE)).PLAYER_CONFIG;
  const session = sessionModule.createGameSession(SEED);
  const input: InputState = createInputState();
  const step = (count = 1): void => {
    for (let i = 0; i < count; i++) sessionModule.stepGameSession(session, input, STEP_S, NO_ASSIST_RAD);
  };
  const stepSeconds = (seconds: number): void => step(Math.round(seconds / STEP_S));
  const placeZombie = (distanceM: number, hp: number): TestZombie => {
    const zombie: TestZombie = session.horde.zombies[0];
    zombie.alive = true;
    zombie.state = "chasing";
    zombie.x = session.player.x;
    zombie.z = session.player.z - distanceM;
    zombie.hp = hp;
    zombie.speedMps = 0;
    zombie.stateTimeS = 0;
    zombie.cooldownS = 0;
    return zombie;
  };
  const clearHorde = (): void => {
    for (const zombie of session.horde.zombies) zombie.alive = false;
  };
  return { sessionModule, points, roundConfig, playerConfig, session, input, step, stepSeconds, placeZombie, clearHorde };
};

describe("gameSession creation", () => {
  it("starts playing in round 1 with the start points, full health and the first round announced", async () => {
    const { session, points, roundConfig } = await load();
    expect(session.phase).toEqual({ kind: "playing" });
    expect(session.rounds.number).toBe(1);
    expect(session.ledger.points).toBe(points.START_POINTS);
    expect(session.health).toEqual({ status: "alive", hitsTaken: 0, sinceHitS: 0 });
    expect(session.events).toContainEqual({ kind: "roundStarted", round: 1 });
    expect(session.rounds.phase.remainingSpawns).toBe(roundConfig.ROUND_BASE_COUNT);
    expect(session.player.x).toBe(session.layout.playerStart.x);
    expect(session.player.z).toBe(session.layout.playerStart.z);
  });

  it("spawns the first zombies of the round while playing", async () => {
    const { session, stepSeconds } = await load();
    stepSeconds(SPAWN_WAIT_S);
    const alive = session.horde.zombies.filter((zombie: TestZombie) => zombie.alive);
    expect(alive.length).toBeGreaterThan(1);
  });

  it("is deterministic for a fixed seed", async () => {
    const a = await load();
    const b = await load();
    a.step(DETERMINISM_STEPS);
    b.step(DETERMINISM_STEPS);
    const positions = (zombies: TestZombie[]) => zombies.map((zombie) => [zombie.alive, zombie.x, zombie.z]);
    expect(positions(a.session.horde.zombies)).toEqual(positions(b.session.horde.zombies));
  });
});

describe("gameSession points", () => {
  it("earns 10 points for a pistol hit that does not kill", async () => {
    const { session, input, step, placeZombie, points } = await load();
    const zombie = placeZombie(SHOT_DISTANCE_M, PISTOL_BODY_DAMAGE * 4);
    session.player.pitch = BODY_PITCH_RAD;
    input.fire = true;
    step();
    expect(zombie.hp).toBe(PISTOL_BODY_DAMAGE * 3);
    expect(session.ledger.points).toBe(points.START_POINTS + points.POINTS_HIT);
  });

  it("earns 60 points for a body kill and not the hit bonus on top", async () => {
    const { session, input, step, placeZombie, points } = await load();
    const zombie = placeZombie(SHOT_DISTANCE_M, PISTOL_BODY_DAMAGE);
    session.player.pitch = BODY_PITCH_RAD;
    input.fire = true;
    step();
    expect(zombie.state).toBe("dying");
    expect(session.ledger.points).toBe(points.START_POINTS + points.POINTS_KILL);
  });

  it("earns 100 points for a head kill", async () => {
    const { session, input, step, placeZombie, points } = await load();
    const zombie = placeZombie(SHOT_DISTANCE_M, PISTOL_HEAD_DAMAGE);
    session.player.pitch = HEAD_PITCH_RAD;
    input.fire = true;
    step();
    expect(zombie.state).toBe("dying");
    expect(session.ledger.points).toBe(points.START_POINTS + points.POINTS_HEADSHOT_KILL);
  });

  it("earns 130 points for a knife kill", async () => {
    const { session, input, step, placeZombie, points } = await load();
    const zombie = placeZombie(KNIFE_DISTANCE_M, KNIFE_DAMAGE);
    input.knife = true;
    step();
    expect(zombie.state).toBe("dying");
    expect(session.ledger.points).toBe(points.START_POINTS + points.POINTS_KNIFE_KILL);
  });

  it("does not pay the same kill twice on the following steps", async () => {
    const { session, input, step, placeZombie, points } = await load();
    placeZombie(SHOT_DISTANCE_M, PISTOL_BODY_DAMAGE);
    input.fire = true;
    step();
    input.fire = false;
    step(FIRST_HIT_STEPS);
    expect(session.ledger.points).toBe(points.START_POINTS + points.POINTS_KILL);
  });
});

describe("gameSession player health", () => {
  it("restores full health after 4 s without damage", async () => {
    const { session, step, stepSeconds, placeZombie, clearHorde, playerConfig } = await load();
    placeZombie(ADJACENT_DISTANCE_M, Infinity);
    for (let i = 0; i < FIRST_HIT_STEPS && session.health.hitsTaken !== 1; i++) step();
    expect(session.health.hitsTaken).toBe(1);
    clearHorde();
    stepSeconds(playerConfig.PLAYER_REGEN_DELAY_S - 1);
    expect(session.health.hitsTaken).toBe(1);
    stepSeconds(REGEN_WAIT_S - playerConfig.PLAYER_REGEN_DELAY_S + 1);
    expect(session.health.hitsTaken).toBe(0);
    expect(session.phase.kind).toBe("playing");
  });

  it("ends the game with the round reached when the third hit lands", async () => {
    const { session, step, placeZombie, playerConfig } = await load();
    session.rounds.number = 3;
    placeZombie(ADJACENT_DISTANCE_M, Infinity);
    for (let i = 0; i < MAX_FIGHT_STEPS && session.phase.kind === "playing"; i++) step();
    expect(session.health.status).toBe("dead");
    expect(session.phase).toEqual({ kind: "over", roundReached: 3 });
    const hits = session.events.filter((event: { kind: string }) => event.kind === "playerHit");
    expect(hits).toHaveLength(playerConfig.PLAYER_HITS_TO_DIE);
  });

  it("freezes the simulation once the game is over", async () => {
    const { session, input, step, placeZombie } = await load();
    placeZombie(ADJACENT_DISTANCE_M, Infinity);
    for (let i = 0; i < MAX_FIGHT_STEPS && session.phase.kind === "playing"; i++) step();
    const before = { x: session.player.x, z: session.player.z, eventCount: session.events.length };
    input.move.y = 1;
    step(FIRST_HIT_STEPS);
    expect(session.player.x).toBe(before.x);
    expect(session.player.z).toBe(before.z);
    expect(session.events).toHaveLength(before.eventCount);
  });
});

describe("gameSession rounds", () => {
  it("starts round 2 ten seconds after the last zombie of round 1 dies", async () => {
    const { session, step, stepSeconds, clearHorde, roundConfig } = await load();
    session.rounds.phase = { kind: "active", remainingSpawns: 0, spawnCooldownS: 0 };
    clearHorde();
    step();
    expect(session.rounds.phase.kind).toBe("intermission");
    stepSeconds(roundConfig.ROUND_BREAK_S - 1);
    expect(session.rounds.number).toBe(1);
    stepSeconds(1 + STEP_S * 2);
    expect(session.rounds.number).toBe(2);
    expect(session.events).toContainEqual({ kind: "roundStarted", round: 2 });
  });
});

const MAP_MODULE = "@/config/mapConfig";
const LOADOUT_MODULE = "@/logic/weapons/loadout";
const WEAPON_MODULE = "@/config/weaponConfig";
const SWAP_HOLD_STEPS = 12;
const SHOTGUN_RANGE_DISTANCE_M = 3;
const TOUGH_HP = 1000;

const loadShop = async () => {
  const base = await load();
  const mapConfig = await import(/* @vite-ignore */ MAP_MODULE);
  const loadoutModule = await import(/* @vite-ignore */ LOADOUT_MODULE);
  const weapons = (await import(/* @vite-ignore */ WEAPON_MODULE)).WEAPONS;
  const buy = (weaponId: string, points: number): void => {
    const spot = mapConfig.WALL_BUYS.find((candidate: { weaponId: string }) => candidate.weaponId === weaponId);
    base.session.player.x = spot.x;
    base.session.player.z = spot.z;
    base.session.ledger.points = points;
    base.input.interact = true;
    base.step();
    base.input.interact = false;
    base.step();
  };
  return { ...base, mapConfig, loadoutModule, weapons, buy };
};

describe("gameSession loadout and purchases", () => {
  it("starts with the pistol in hand as the weapon alias", async () => {
    const { session, loadoutModule } = await loadShop();
    expect(session.weapon.weaponId).toBe("pistol");
    expect(session.weapon).toBe(loadoutModule.activeWeapon(session.loadout));
  });

  it("buys the carbine at its spot: 300 points left, carbine in hand full, purchase event", async () => {
    const { session, input, step, mapConfig, weapons, loadoutModule } = await loadShop();
    const spot = mapConfig.WALL_BUYS.find((candidate: { weaponId: string }) => candidate.weaponId === "carbine");
    session.player.x = spot.x;
    session.player.z = spot.z;
    session.ledger.points = 1500;
    input.interact = true;
    step();
    expect(session.ledger.points).toBe(300);
    expect(session.weapon.weaponId).toBe("carbine");
    expect(session.weapon.mag).toBe(weapons.carbine.MAG_SIZE);
    expect(session.weapon.reserve).toBe(weapons.carbine.RESERVE_AMMO);
    expect(session.weapon).toBe(loadoutModule.activeWeapon(session.loadout));
    expect(session.events).toContainEqual({ kind: "purchaseDone", pointId: spot.id, costPoints: 1200 });
  });

  it("denies the carbine with 800 points and keeps the pistol", async () => {
    const { session, input, step, mapConfig } = await loadShop();
    const spot = mapConfig.WALL_BUYS.find((candidate: { weaponId: string }) => candidate.weaponId === "carbine");
    session.player.x = spot.x;
    session.player.z = spot.z;
    session.ledger.points = 800;
    input.interact = true;
    step();
    expect(session.ledger.points).toBe(800);
    expect(session.weapon.weaponId).toBe("pistol");
    expect(session.events).toContainEqual({ kind: "purchaseDenied", pointId: spot.id });
  });

  it("refills an owned carbine with an empty reserve for 600 points", async () => {
    const { session, buy, input, step, mapConfig, weapons } = await loadShop();
    buy("carbine", 1500);
    session.weapon.mag = 0;
    session.weapon.reserve = 0;
    session.ledger.points = 1500;
    input.interact = true;
    step();
    expect(session.ledger.points).toBe(900);
    expect(session.weapon.mag).toBe(weapons.carbine.MAG_SIZE);
    expect(session.weapon.reserve).toBe(weapons.carbine.RESERVE_AMMO);
    expect(mapConfig.WALL_BUYS.length).toBe(3);
  });

  it("turns pistol + carbine into pistol + shotgun with the shotgun in hand", async () => {
    const { session, buy, input, step } = await loadShop();
    buy("carbine", 1500);
    buy("shotgun", 1500);
    expect(session.weapon.weaponId).toBe("shotgun");
    input.swap = true;
    step();
    expect(session.weapon.weaponId).toBe("pistol");
  });

  it("swaps exactly once for a swap press held across steps", async () => {
    const { session, buy, input, step } = await loadShop();
    buy("carbine", 1500);
    input.swap = true;
    step(SWAP_HOLD_STEPS);
    expect(session.weapon.weaponId).toBe("pistol");
    input.swap = false;
    step();
    input.swap = true;
    step(SWAP_HOLD_STEPS);
    expect(session.weapon.weaponId).toBe("carbine");
  });

  it("keeps the pistol when swap is pressed with a single weapon", async () => {
    const { session, input, step } = await loadShop();
    input.swap = true;
    step(SWAP_HOLD_STEPS);
    expect(session.weapon.weaponId).toBe("pistol");
  });

  it("fires only the weapon in hand and leaves the holstered one untouched", async () => {
    const { session, buy, input, step, loadoutModule, weapons } = await loadShop();
    buy("carbine", 1500);
    input.fire = true;
    step();
    input.fire = false;
    expect(session.weapon.mag).toBe(weapons.carbine.MAG_SIZE - 1);
    input.swap = true;
    step();
    expect(session.weapon.weaponId).toBe("pistol");
    expect(session.weapon.mag).toBe(weapons.pistol.MAG_SIZE);
    expect(loadoutModule.activeWeapon(session.loadout)).toBe(session.weapon);
  });

  it("resolves several pellets with the shotgun and damages the zombie for each hit", async () => {
    const { session, buy, input, step, placeZombie, clearHorde, weapons } = await loadShop();
    buy("shotgun", 1500);
    clearHorde();
    session.player.yaw = 0;
    session.player.pitch = BODY_PITCH_RAD;
    const zombie = placeZombie(SHOTGUN_RANGE_DISTANCE_M, TOUGH_HP);
    input.fire = true;
    step();
    const pelletHits = session.events.filter((event: { kind: string }) => event.kind === "targetHit");
    expect(pelletHits.length).toBeGreaterThan(1);
    for (const hit of pelletHits) expect(hit.damage).toBeGreaterThanOrEqual(weapons.shotgun.DAMAGE);
    const dealt = pelletHits.reduce((sum: number, hit: { damage: number }) => sum + hit.damage, 0);
    expect(zombie.hp).toBe(TOUGH_HP - dealt);
  });

  it("resolves a single shot per trigger pull with a one-pellet weapon", async () => {
    const { session, input, step, placeZombie, clearHorde } = await loadShop();
    clearHorde();
    session.player.pitch = BODY_PITCH_RAD;
    placeZombie(SHOT_DISTANCE_M, TOUGH_HP);
    input.fire = true;
    step();
    expect(session.events.filter((event: { kind: string }) => event.kind === "targetHit")).toHaveLength(1);
  });
});

describe("gameSession zone doors", () => {
  const OPENING_S = 1;
  const goToEast = (session: { player: { x: number; z: number } }): void => {
    session.player.x = 7.5;
    session.player.z = 0;
  };
  const pressInteract = (input: InputState, step: (count?: number) => void): void => {
    input.interact = true;
    step();
    input.interact = false;
    step();
  };

  it("starts with every zone door closed", async () => {
    const { session } = await load();
    for (const zoneId of ["north", "east", "west"]) expect(session.doors[zoneId]).toEqual({ kind: "closed" });
  });

  it("spends 1000 points at the east passage and enters the opening phase", async () => {
    const { session, input, step } = await load();
    session.ledger.points = 1000;
    goToEast(session);
    pressInteract(input, step);
    expect(session.ledger.points).toBe(0);
    expect(session.doors.east.kind).toBe("opening");
    expect(session.events).toContainEqual({ kind: "doorOpening", zoneId: "east" });
  });

  it("opens the passage once the opening time elapses and emits doorOpened", async () => {
    const { session, input, step, stepSeconds } = await load();
    session.ledger.points = 1000;
    goToEast(session);
    pressInteract(input, step);
    const blocked = session.layout.segments.some((segment: { zoneId: string | null }) => segment.zoneId === "east");
    expect(blocked).toBe(true);
    stepSeconds(OPENING_S + 0.2);
    expect(session.doors.east).toEqual({ kind: "open" });
    expect(session.layout.segments.some((segment: { zoneId: string | null }) => segment.zoneId === "east")).toBe(false);
    expect(session.events.filter((event: { kind: string }) => event.kind === "doorOpened")).toEqual([{ kind: "doorOpened", zoneId: "east" }]);
  });

  it("lets the player walk through the opened east passage", async () => {
    const { session, input, step, stepSeconds } = await load();
    session.ledger.points = 1000;
    goToEast(session);
    pressInteract(input, step);
    stepSeconds(OPENING_S + 0.2);
    session.player.yaw = 0;
    input.move.x = 1;
    input.move.y = 0;
    stepSeconds(2);
    expect(session.player.x).toBeGreaterThan(8.5);
  });

  it("denies the north passage with 700 points and keeps it closed", async () => {
    const { session, input, step, stepSeconds } = await load();
    session.ledger.points = 700;
    session.player.x = 0;
    session.player.z = -5.5;
    pressInteract(input, step);
    stepSeconds(OPENING_S + 0.2);
    expect(session.ledger.points).toBe(700);
    expect(session.doors.north).toEqual({ kind: "closed" });
    expect(session.events).toContainEqual({ kind: "purchaseDenied", pointId: "door-north" });
    expect(session.layout.segments.some((segment: { zoneId: string | null }) => segment.zoneId === "north")).toBe(true);
  });

  it("adds the north zone windows to the spawn draw only once the north zone is open", async () => {
    const { session, input, step, stepSeconds } = await load();
    const northIds = session.layout.windows.filter((window: { zoneId: string | null }) => window.zoneId === "north").map((window: { id: string }) => window.id);
    const spawnIds = (): string[] => session.layout.spawnPoints.map((spawn: { id: string }) => spawn.id);
    for (const id of northIds) expect(spawnIds()).not.toContain(id);
    session.ledger.points = 750;
    session.player.x = 0;
    session.player.z = -5.5;
    pressInteract(input, step);
    stepSeconds(OPENING_S + 0.2);
    for (const id of northIds) expect(spawnIds()).toContain(id);
  });
});

describe("gameSession shots through an opened zone door", () => {
  const FAR_ZONE_X = 11;
  const SHOOTER_X = 6;
  const EAST_YAW_RAD = -Math.PI / 2;
  const aimAcrossEastDoor = async () => {
    const loaded = await load();
    const zombie = loaded.placeZombie(0, PISTOL_BODY_DAMAGE * 4);
    zombie.x = FAR_ZONE_X;
    zombie.z = 0;
    loaded.session.player.x = SHOOTER_X;
    loaded.session.player.z = 0;
    loaded.session.player.yaw = EAST_YAW_RAD;
    loaded.session.player.pitch = BODY_PITCH_RAD;
    return { ...loaded, zombie };
  };

  it("blocks a shot toward the east zone while the east door is closed", async () => {
    const { session, input, step, zombie } = await aimAcrossEastDoor();
    input.fire = true;
    step();
    expect(zombie.hp).toBe(PISTOL_BODY_DAMAGE * 4);
    expect(session.events.some((event: { kind: string }) => event.kind === "targetHit")).toBe(false);
  });

  it("lets a shot reach a target in the east zone once the east door is open", async () => {
    const { session, input, step, zombie } = await aimAcrossEastDoor();
    const layoutModule = await import(/* @vite-ignore */ LAYOUT_MODULE);
    layoutModule.openZone(session.layout, "east");
    input.fire = true;
    step();
    expect(zombie.hp).toBe(PISTOL_BODY_DAMAGE * 3);
  });
});

describe("gameSession barricades", () => {
  const MAP_MODULE_PATH = "@/config/mapConfig";
  const FROZEN_ROUND_S = 1e9;
  const ROUND_SWITCH_S = 0.05;
  const CLOSED_ZONE_WAIT_S = 30;
  const BROKEN_PLANKS = 4;

  type SessionWindow = { id: string; x: number; z: number; zoneId: string | null };

  const loadBarricades = async () => {
    const loaded = await load();
    const barricade = (await import(/* @vite-ignore */ MAP_MODULE_PATH)).BARRICADE;
    const freezeRound = (remainingS = FROZEN_ROUND_S): void => {
      loaded.session.rounds.phase = { kind: "intermission", remainingS };
      loaded.clearHorde();
    };
    const startWindow: SessionWindow = loaded.session.layout.windows.find((candidate: SessionWindow) => candidate.zoneId === null);
    const standAtWindow = (): void => {
      loaded.session.player.x = startWindow.x;
      loaded.session.player.z = startWindow.z;
    };
    const barricadeOf = (id: string) => loaded.session.barricades.windows.find((candidate: { id: string }) => candidate.id === id);
    const breakWindow = (): void => {
      barricadeOf(startWindow.id).planks = barricade.PLANKS_PER_WINDOW - BROKEN_PLANKS;
    };
    return { ...loaded, barricade, freezeRound, startWindow, standAtWindow, barricadeOf, breakWindow };
  };

  it("starts with every window fully planked", async () => {
    const { session, barricade } = await loadBarricades();
    expect(session.barricades.windows).toHaveLength(session.layout.windows.length);
    expect(session.barricades.windows.every((window: { planks: number }) => window.planks === barricade.PLANKS_PER_WINDOW)).toBe(true);
  });

  it("makes a spawned zombie tear one plank per interval before entering", async () => {
    const { session, step, stepSeconds, barricade, barricadeOf } = await loadBarricades();
    step();
    const zombie: TestZombie & { windowId: string } = session.horde.zombies.find((candidate: TestZombie) => candidate.alive);
    expect(zombie.state).toBe("breaching");
    stepSeconds(barricade.TEAR_INTERVAL_S + STEP_S * 4);
    expect(barricadeOf(zombie.windowId).planks).toBe(barricade.PLANKS_PER_WINDOW - 1);
    expect(zombie.state).toBe("breaching");
    stepSeconds(barricade.TEAR_INTERVAL_S * barricade.PLANKS_PER_WINDOW);
    expect(barricadeOf(zombie.windowId).planks).toBe(0);
    expect(zombie.state).not.toBe("breaching");
    expect(session.events.filter((event: { kind: string }) => event.kind === "plankTorn").length).toBeGreaterThanOrEqual(barricade.PLANKS_PER_WINDOW);
  });

  it("repairs one plank per interval while interact is held at the window, +10 points each", async () => {
    const { session, input, stepSeconds, freezeRound, standAtWindow, breakWindow, barricadeOf, startWindow, barricade, points } = await loadBarricades();
    freezeRound();
    breakWindow();
    standAtWindow();
    input.interact = true;
    stepSeconds(barricade.REPAIR_INTERVAL_S * 2 + STEP_S * 4);
    expect(barricadeOf(startWindow.id).planks).toBe(barricade.PLANKS_PER_WINDOW - BROKEN_PLANKS + 2);
    expect(session.ledger.points).toBe(points.START_POINTS + points.POINTS_REPAIR_PLANK * 2);
    expect(session.interactions.prompt).toMatchObject({ kind: "repair", windowId: startWindow.id });
  });

  it("counts repair points as points earned in the run stats", async () => {
    const { session, input, stepSeconds, freezeRound, standAtWindow, breakWindow, barricade, points } = await loadBarricades();
    freezeRound();
    breakWindow();
    standAtWindow();
    input.interact = true;
    stepSeconds(barricade.REPAIR_INTERVAL_S * 2 + STEP_S * 4);
    expect(session.stats.pointsEarned).toBe(points.POINTS_REPAIR_PLANK * 2);
  });

  it("returns the plank without points once 500 repair points are earned this round", async () => {
    const { session, input, stepSeconds, freezeRound, standAtWindow, breakWindow, barricadeOf, startWindow, barricade, points } = await loadBarricades();
    freezeRound();
    breakWindow();
    standAtWindow();
    session.barricades.repairPointsEarned = points.REPAIR_CAP_PER_ROUND_POINTS;
    input.interact = true;
    stepSeconds(barricade.REPAIR_INTERVAL_S + STEP_S * 4);
    expect(barricadeOf(startWindow.id).planks).toBe(barricade.PLANKS_PER_WINDOW - BROKEN_PLANKS + 1);
    expect(session.ledger.points).toBe(points.START_POINTS);
  });

  it("earns repair points again once a new round starts", async () => {
    const { session, input, stepSeconds, freezeRound, standAtWindow, breakWindow, barricade, points } = await loadBarricades();
    freezeRound(ROUND_SWITCH_S);
    breakWindow();
    standAtWindow();
    session.barricades.repairPointsEarned = points.REPAIR_CAP_PER_ROUND_POINTS;
    stepSeconds(ROUND_SWITCH_S * 2);
    expect(session.events).toContainEqual({ kind: "roundStarted", round: 2 });
    expect(session.barricades.repairPointsEarned).toBe(0);
    session.rounds.phase = { kind: "intermission", remainingS: FROZEN_ROUND_S };
    input.interact = true;
    stepSeconds(barricade.REPAIR_INTERVAL_S + STEP_S * 4);
    expect(session.ledger.points).toBe(points.START_POINTS + points.POINTS_REPAIR_PLANK);
  });

  it("never targets a window of a closed zone and offers no repair there", async () => {
    const { session, input, step, stepSeconds, freezeRound, barricade, barricadeOf } = await loadBarricades();
    const closedWindow: SessionWindow = session.layout.windows.find((candidate: SessionWindow) => candidate.zoneId === "north");
    const closedIds = new Set(session.layout.windows.filter((candidate: SessionWindow) => candidate.zoneId !== null).map((candidate: SessionWindow) => candidate.id));
    const seenWindowIds = new Set<string>();
    for (let i = 0; i < Math.round(CLOSED_ZONE_WAIT_S / STEP_S); i++) {
      step();
      for (const zombie of session.horde.zombies as { alive: boolean; windowId: string }[]) if (zombie.alive) seenWindowIds.add(zombie.windowId);
    }
    expect(seenWindowIds.size).toBeGreaterThan(0);
    for (const id of seenWindowIds) expect(closedIds.has(id)).toBe(false);
    freezeRound();
    barricadeOf(closedWindow.id).planks = 1;
    session.player.x = closedWindow.x;
    session.player.z = closedWindow.z;
    input.interact = true;
    stepSeconds(barricade.REPAIR_INTERVAL_S * 2);
    expect(session.interactions.prompt).toBeNull();
    expect(barricadeOf(closedWindow.id).planks).toBe(1);
  });
});

describe("gameSession mystery box", () => {
  const BOX_CONFIG_PATH = "@/config/boxConfig";
  const FROZEN_ROUND_S = 1e9;
  const BOX_COST = 950;
  const LOW_DRAW = 0;
  const HIGH_DRAW = 0.999;

  type FixedRandom = { next: () => number; range: (min: number, max: number) => number; int: (min: number, max: number) => number; pick: <T>(items: readonly T[]) => T };

  const fixedRandom = (value: number): FixedRandom => ({
    next: () => value,
    range: (min, max) => min + (max - min) * value,
    int: (min, max) => Math.floor(min + (max - min) * value),
    pick: (items) => items[0] as never,
  });

  const loadBox = async () => {
    const loaded = await load();
    const boxConfig = await import(/* @vite-ignore */ BOX_CONFIG_PATH);
    loaded.session.rounds.phase = { kind: "intermission", remainingS: FROZEN_ROUND_S };
    loaded.clearHorde();
    const standAtBox = (): void => {
      const spot = boxConfig.BOX_SPOTS[loaded.session.box.spot];
      loaded.session.player.x = spot.x;
      loaded.session.player.z = spot.z;
    };
    const press = (): void => {
      loaded.input.interact = true;
      loaded.step();
      loaded.input.interact = false;
      loaded.step();
    };
    return { ...loaded, boxConfig, standAtBox, press };
  };

  it("holds an idle box on its start spot", async () => {
    const { session, boxConfig } = await loadBox();
    expect(session.box.state).toEqual({ kind: "idle" });
    expect(session.box.spot).toBe(boxConfig.BOX_START_SPOT);
    expect(session.box.rolls).toBe(0);
  });

  it("spends the points and rolls when the player presses interact at the box", async () => {
    const { session, standAtBox, press, boxConfig } = await loadBox();
    session.ledger.points = BOX_COST + 50;
    standAtBox();
    press();
    expect(session.ledger.points).toBe(50);
    expect(session.box.state.kind).toBe("rolling");
    expect(session.box.state.remainingS).toBeLessThan(boxConfig.BOX_ROLL_S);
  });

  it("does not buy twice while the box rolls", async () => {
    const { session, standAtBox, press } = await loadBox();
    session.ledger.points = BOX_COST * 2;
    standAtBox();
    press();
    press();
    expect(session.ledger.points).toBe(BOX_COST);
    expect(session.box.rolls).toBe(1);
  });

  it("offers a weapon after the roll time and gives it on interact", async () => {
    const { session, standAtBox, press, stepSeconds, boxConfig } = await loadBox();
    session.ledger.points = BOX_COST;
    standAtBox();
    press();
    stepSeconds(boxConfig.BOX_ROLL_S);
    expect(session.box.state.kind).toBe("offering");
    const offered = session.box.state.weaponId;
    expect(session.interactions.prompt).toMatchObject({ kind: "takeWeapon", weaponId: offered });
    press();
    expect(session.loadout.slots[1]?.weaponId).toBe(offered);
    expect(session.weapon.weaponId).toBe(offered);
    expect(session.box.state.kind).toBe("idle");
  });

  it("loses the weapon when the offer is not taken in time", async () => {
    const { session, standAtBox, press, stepSeconds, boxConfig } = await loadBox();
    session.ledger.points = BOX_COST;
    standAtBox();
    press();
    stepSeconds(boxConfig.BOX_ROLL_S + boxConfig.BOX_OFFER_S + 0.5);
    expect(session.box.state.kind).toBe("idle");
    expect(session.loadout.slots[1]).toBeNull();
    expect(session.ledger.points).toBe(0);
  });

  it("draws the offer with the session random", async () => {
    const low = await loadBox();
    low.session.random = fixedRandom(LOW_DRAW);
    low.session.ledger.points = BOX_COST;
    low.standAtBox();
    low.press();
    low.stepSeconds(low.boxConfig.BOX_ROLL_S);
    expect(low.session.box.state.weaponId).toBe(low.boxConfig.BOX_POOL[0].weaponId);
    const high = await loadBox();
    high.session.random = fixedRandom(HIGH_DRAW);
    high.session.ledger.points = BOX_COST;
    high.standAtBox();
    high.press();
    high.stepSeconds(high.boxConfig.BOX_ROLL_S);
    expect(high.session.box.state.weaponId).toBe(high.boxConfig.BOX_POOL[high.boxConfig.BOX_POOL.length - 1].weaponId);
  });

  it("refunds the points and moves the box on a teddy", async () => {
    const { session, standAtBox, press, stepSeconds, boxConfig } = await loadBox();
    session.random = fixedRandom(boxConfig.TEDDY_CHANCE / 2);
    session.box.rolls = boxConfig.TEDDY_FROM_ROLL - 1;
    session.ledger.points = BOX_COST;
    standAtBox();
    press();
    stepSeconds(boxConfig.BOX_ROLL_S);
    expect(session.ledger.points).toBe(BOX_COST);
    expect(session.box.state.kind).toBe("moving");
    stepSeconds(boxConfig.BOX_MOVE_S + 0.5);
    expect(session.box.state.kind).toBe("idle");
    expect(session.box.spot).not.toBe(boxConfig.BOX_START_SPOT);
  });

  it("replays the same offers for the same seed", async () => {
    const offers: string[] = [];
    for (let run = 0; run < 2; run++) {
      const { session, standAtBox, press, stepSeconds, boxConfig } = await loadBox();
      session.ledger.points = BOX_COST;
      standAtBox();
      press();
      stepSeconds(boxConfig.BOX_ROLL_S);
      offers.push(session.box.state.weaponId);
    }
    expect(offers[0]).toBe(offers[1]);
    expect(offers[0]).toBeDefined();
  });
});

describe("gameSession power-ups", () => {
  const POWER_UP_CONFIG_MODULE = "@/config/powerUpConfig";
  const MAP_CONFIG_MODULE = "@/config/mapConfig";
  const LOADOUT_MODULE = "@/logic/weapons/loadout";
  const WEAPON_CONFIG_MODULE = "@/config/weaponConfig";
  const FROZEN_ROUND_S = 1e9;
  const ROUND_SWITCH_S = 0.05;
  const SURE_DROP_DRAW = 0;
  const NO_DROP_DRAW = 0.99;
  const NUKE_VICTIMS = 5;
  const NUKE_DISTANCE_M = 10;
  const FAR_M = 40;
  const BROKEN_PLANKS = 4;
  const TIMER_MARGIN_S = 0.2;
  const BIG_HP = 1000;
  const WINDOW_REPAIR_MARGIN_STEPS = 4;

  type DropState = { active: boolean; kind: string; x: number; z: number; remainingS: number };
  type SessionWindow = { id: string; x: number; z: number; zoneId: string | null };

  const loadPowerUps = async () => {
    const loaded = await load();
    const config = await import(/* @vite-ignore */ POWER_UP_CONFIG_MODULE);
    const loadoutModule = await import(/* @vite-ignore */ LOADOUT_MODULE);
    const weaponConfig = (await import(/* @vite-ignore */ WEAPON_CONFIG_MODULE)).WEAPONS;
    const { session } = loaded;
    session.rounds.phase = { kind: "intermission", remainingS: FROZEN_ROUND_S };
    loaded.clearHorde();
    const rigRandom = (next: number, kind: string): void => {
      session.random.next = () => next;
      session.random.pick = ((items: readonly unknown[]) => (items.includes(kind) ? kind : items[0])) as typeof session.random.pick;
    };
    const lay = (kind: string, x: number, z: number, remainingS = config.DROP_LIFETIME_S): DropState => {
      const slot: DropState = session.powerUps.drops.find((entry: DropState) => !entry.active);
      Object.assign(slot, { active: true, kind, x, z, remainingS });
      return slot;
    };
    const layAtPlayer = (kind: string): DropState => lay(kind, session.player.x, session.player.z);
    const kinds = (kind: string): { kind: string }[] => session.events.filter((event: { kind: string }) => event.kind === kind);
    const killWithPistol = (hp: number) => {
      const zombie = loaded.placeZombie(SHOT_DISTANCE_M, hp);
      loaded.input.fire = true;
      loaded.step();
      loaded.input.fire = false;
      return zombie;
    };
    return { ...loaded, config, loadoutModule, weaponConfig, rigRandom, lay, layAtPlayer, kinds, killWithPistol };
  };

  it("exposes powerUps on the session with an empty initial state", async () => {
    const { session, config } = await loadPowerUps();
    expect(session.powerUps.drops).toHaveLength(config.MAX_DROPS_PER_ROUND);
    expect(session.powerUps.dropsThisRound).toBe(0);
  });

  it("drops a seeded power-up at the killed zombie position and emits the drop event", async () => {
    const { session, rigRandom, killWithPistol, kinds } = await loadPowerUps();
    rigRandom(SURE_DROP_DRAW, "doublePoints");
    const zombie = killWithPistol(PISTOL_BODY_DAMAGE);
    expect(zombie.state).toBe("dying");
    expect(session.powerUps.drops[0]).toMatchObject({ active: true, kind: "doublePoints", x: zombie.x, z: zombie.z });
    expect(kinds("powerUpDropped")).toEqual([{ kind: "powerUpDropped", slot: 0, powerUpKind: "doublePoints", x: zombie.x, z: zombie.z }]);
    expect(session.powerUps.dropsThisRound).toBe(1);
  });

  it("drops nothing when the seeded draw is over the drop chance", async () => {
    const { session, rigRandom, killWithPistol, kinds } = await loadPowerUps();
    rigRandom(NO_DROP_DRAW, "nuke");
    killWithPistol(PISTOL_BODY_DAMAGE);
    expect(session.powerUps.drops.some((entry: DropState) => entry.active)).toBe(false);
    expect(kinds("powerUpDropped")).toHaveLength(0);
  });

  it("drops nothing once the round cap is reached, then drops again after the next round starts", async () => {
    const { session, rigRandom, killWithPistol, kinds, config, clearHorde, step, placeZombie, input } = await loadPowerUps();
    rigRandom(SURE_DROP_DRAW, "maxAmmo");
    session.powerUps.dropsThisRound = config.MAX_DROPS_PER_ROUND;
    killWithPistol(PISTOL_BODY_DAMAGE);
    expect(kinds("powerUpDropped")).toHaveLength(0);
    const roundsBefore = kinds("roundStarted").length;
    clearHorde();
    session.rounds.phase = { kind: "intermission", remainingS: ROUND_SWITCH_S };
    step(Math.ceil(ROUND_SWITCH_S / STEP_S) + 2);
    expect(kinds("roundStarted").length).toBe(roundsBefore + 1);
    expect(session.powerUps.dropsThisRound).toBe(0);
    session.rounds.phase = { kind: "intermission", remainingS: FROZEN_ROUND_S };
    clearHorde();
    session.weapon.cooldownS = 0;
    placeZombie(SHOT_DISTANCE_M, PISTOL_BODY_DAMAGE);
    input.fire = true;
    step();
    expect(kinds("powerUpDropped")).toHaveLength(1);
  });

  it("removes an untouched drop after its lifetime and emits the expiry event", async () => {
    const { session, lay, stepSeconds, kinds, config } = await loadPowerUps();
    const drop = lay("maxAmmo", session.player.x + FAR_M, session.player.z);
    stepSeconds(config.DROP_LIFETIME_S - 1);
    expect(drop.active).toBe(true);
    expect(kinds("powerUpExpired")).toHaveLength(0);
    stepSeconds(2);
    expect(drop.active).toBe(false);
    expect(kinds("powerUpExpired")).toEqual([{ kind: "powerUpExpired", slot: 0 }]);
  });

  it("refills both weapons when the player walks onto a max-ammo drop", async () => {
    const { session, layAtPlayer, step, kinds, loadoutModule, weaponConfig } = await loadPowerUps();
    loadoutModule.giveWeapon(session.loadout, "carbine");
    for (const weapon of session.loadout.slots) {
      weapon.mag = 0;
      weapon.reserve = 0;
    }
    const drop = layAtPlayer("maxAmmo");
    step();
    expect(session.loadout.slots[0]).toMatchObject({ mag: weaponConfig.pistol.MAG_SIZE, reserve: weaponConfig.pistol.RESERVE_AMMO });
    expect(session.loadout.slots[1]).toMatchObject({ mag: weaponConfig.carbine.MAG_SIZE, reserve: weaponConfig.carbine.RESERVE_AMMO });
    expect(drop.active).toBe(false);
    expect(kinds("powerUpTaken")).toEqual([{ kind: "powerUpTaken", powerUpKind: "maxAmmo" }]);
  });

  it("kills with one bullet for the normal kill points while insta-kill runs, then returns to normal damage", async () => {
    const { session, layAtPlayer, step, stepSeconds, killWithPistol, points, config } = await loadPowerUps();
    layAtPlayer("instaKill");
    step();
    const zombie = killWithPistol(BIG_HP);
    expect(zombie.state).toBe("dying");
    expect(session.ledger.points).toBe(points.START_POINTS + points.POINTS_KILL);
    stepSeconds(config.TIMED_DURATION_S + TIMER_MARGIN_S);
    session.horde.zombies[0].alive = false;
    const later = killWithPistol(BIG_HP);
    expect(later.state).toBe("chasing");
    expect(later.hp).toBe(BIG_HP - PISTOL_BODY_DAMAGE);
  });

  it("kills with one knife blow for the normal knife points while insta-kill runs", async () => {
    const { session, layAtPlayer, step, placeZombie, input, points } = await loadPowerUps();
    layAtPlayer("instaKill");
    step();
    const zombie = placeZombie(KNIFE_DISTANCE_M, BIG_HP);
    input.knife = true;
    step();
    expect(zombie.state).toBe("dying");
    expect(session.ledger.points).toBe(points.START_POINTS + points.POINTS_KNIFE_KILL);
  });

  it("doubles hit and kill points while double points runs, then pays normally", async () => {
    const { session, layAtPlayer, step, stepSeconds, killWithPistol, points, config } = await loadPowerUps();
    layAtPlayer("doublePoints");
    step();
    killWithPistol(PISTOL_BODY_DAMAGE * 2);
    expect(session.ledger.points).toBe(points.START_POINTS + points.POINTS_HIT * 2);
    session.horde.zombies[0].alive = false;
    session.ledger.points = points.START_POINTS;
    session.weapon.cooldownS = 0;
    killWithPistol(PISTOL_BODY_DAMAGE);
    expect(session.ledger.points).toBe(points.START_POINTS + points.POINTS_KILL * 2);
    stepSeconds(config.TIMED_DURATION_S + TIMER_MARGIN_S);
    session.horde.zombies[0].alive = false;
    session.ledger.points = points.START_POINTS;
    session.weapon.cooldownS = 0;
    killWithPistol(PISTOL_BODY_DAMAGE);
    expect(session.ledger.points).toBe(points.START_POINTS + points.POINTS_KILL);
  });

  it("does not double the repair points while double points runs", async () => {
    const { session, input, stepSeconds, layAtPlayer, step, points } = await loadPowerUps();
    const barricade = (await import(/* @vite-ignore */ MAP_CONFIG_MODULE)).BARRICADE;
    const startWindow: SessionWindow = session.layout.windows.find((candidate: SessionWindow) => candidate.zoneId === null);
    session.barricades.windows.find((candidate: { id: string }) => candidate.id === startWindow.id).planks = barricade.PLANKS_PER_WINDOW - BROKEN_PLANKS;
    session.player.x = startWindow.x;
    session.player.z = startWindow.z;
    layAtPlayer("doublePoints");
    step();
    input.interact = true;
    stepSeconds(barricade.REPAIR_INTERVAL_S + STEP_S * WINDOW_REPAIR_MARGIN_STEPS);
    expect(session.ledger.points).toBe(points.START_POINTS + points.POINTS_REPAIR_PLANK);
  });

  it("kills every living zombie on a nuke for exactly 400 points, with no kill points and no new drop", async () => {
    const { session, rigRandom, layAtPlayer, step, kinds, points, config } = await loadPowerUps();
    rigRandom(SURE_DROP_DRAW, "maxAmmo");
    for (let index = 0; index < NUKE_VICTIMS; index++) {
      const zombie = session.horde.zombies[index];
      Object.assign(zombie, { alive: true, state: "chasing", x: session.player.x + index, z: session.player.z - NUKE_DISTANCE_M, hp: PISTOL_BODY_DAMAGE * 4, speedMps: 0, stateTimeS: 0, cooldownS: 0 });
    }
    layAtPlayer("nuke");
    step();
    for (let index = 0; index < NUKE_VICTIMS; index++) expect(session.horde.zombies[index].state).toBe("dying");
    expect(session.ledger.points).toBe(points.START_POINTS + config.NUKE_POINTS);
    expect(kinds("zombieKilled")).toHaveLength(0);
    expect(kinds("powerUpDropped")).toHaveLength(0);
    expect(kinds("nukeDetonated")).toEqual([{ kind: "nukeDetonated" }]);
    expect(kinds("powerUpTaken")).toEqual([{ kind: "powerUpTaken", powerUpKind: "nuke" }]);
  });

  it("counts the nuke points as points earned in the run stats", async () => {
    const { session, layAtPlayer, step, config } = await loadPowerUps();
    layAtPlayer("nuke");
    step();
    expect(session.stats.pointsEarned).toBe(config.NUKE_POINTS);
  });
});

describe("gameSession latched presses", () => {
  const INPUT_MODULE = "@/logic/input/inputState";
  const loadLatches = async () => {
    const shop = await loadShop();
    const { latchPress } = await import(/* @vite-ignore */ INPUT_MODULE);
    const shotsFired = (): number => shop.session.events.filter((event: { kind: string }) => event.kind === "shotFired").length;
    const standAtCarbine = (points: number): { id: string } => {
      const spot = shop.mapConfig.WALL_BUYS.find((candidate: { weaponId: string }) => candidate.weaponId === "carbine");
      shop.session.player.x = spot.x;
      shop.session.player.z = spot.z;
      shop.session.ledger.points = points;
      return spot;
    };
    return { ...shop, latchPress, shotsFired, standAtCarbine };
  };

  it("fires exactly one shot for a fire press released before the step", async () => {
    const { input, step, latchPress, shotsFired } = await loadLatches();
    latchPress(input, "fire");
    expect(input.fire).toBe(false);
    step();
    expect(shotsFired()).toBe(1);
    expect(input.pressed.fire).toBe(false);
  });

  it("swings the knife for a knife press released before the step", async () => {
    const { session, input, step, latchPress } = await loadLatches();
    latchPress(input, "knife");
    step();
    expect(session.events.filter((event: { kind: string }) => event.kind === "knifeSwung")).toHaveLength(1);
  });

  it("buys the wall weapon once for an interact tap released before the step", async () => {
    const { session, input, step, latchPress, standAtCarbine } = await loadLatches();
    const spot = standAtCarbine(1500);
    latchPress(input, "interact");
    step();
    step();
    expect(session.ledger.points).toBe(300);
    expect(session.weapon.weaponId).toBe("carbine");
    expect(session.events.filter((event: { kind: string }) => event.kind === "purchaseDone")).toEqual([{ kind: "purchaseDone", pointId: spot.id, costPoints: 1200 }]);
  });

  it("keeps a held fire firing across steps while the latch is spent after the first", async () => {
    const { input, step, latchPress, shotsFired } = await loadLatches();
    input.fire = true;
    latchPress(input, "fire");
    step();
    expect(input.pressed.fire).toBe(false);
    expect(input.fire).toBe(true);
    expect(shotsFired()).toBe(1);
  });

  it("does not leak the merged flags into the caller input", async () => {
    const { session, input, step, latchPress } = await loadLatches();
    latchPress(input, "fire");
    step();
    expect(input.fire).toBe(false);
    expect(session.stepInput).not.toBe(input);
  });

  it("clears the latches even when the game is over", async () => {
    const { session, input, step, latchPress, shotsFired } = await loadLatches();
    session.phase = { kind: "over", roundReached: 1 };
    for (const flag of ["fire", "knife", "interact"]) latchPress(input, flag);
    step();
    expect(input.pressed).toEqual({ fire: false, knife: false, interact: false });
    expect(shotsFired()).toBe(0);
  });
});

const STATS_SHOP_POINTS = 1500;
const loadStatsShop = async () => {
  const base = await load();
  const mapConfig = await import(/* @vite-ignore */ MAP_MODULE);
  return { ...base, mapConfig };
};

describe("gameSession run stats", () => {
  it("starts every statistic at zero", async () => {
    const { session } = await load();
    expect(session.stats).toEqual({ kills: 0, headshots: 0, pointsEarned: 0 });
  });

  it("counts a head kill as one kill, one headshot and the headshot points earned", async () => {
    const { session, input, step, placeZombie, points } = await load();
    placeZombie(SHOT_DISTANCE_M, PISTOL_HEAD_DAMAGE);
    session.player.pitch = HEAD_PITCH_RAD;
    input.fire = true;
    step();
    expect(session.stats).toEqual({ kills: 1, headshots: 1, pointsEarned: points.POINTS_HEADSHOT_KILL });
  });

  it("counts a body kill as a kill without headshot", async () => {
    const { session, input, step, placeZombie, points } = await load();
    placeZombie(SHOT_DISTANCE_M, PISTOL_BODY_DAMAGE);
    session.player.pitch = BODY_PITCH_RAD;
    input.fire = true;
    step();
    expect(session.stats).toEqual({ kills: 1, headshots: 0, pointsEarned: points.POINTS_KILL });
  });

  it("counts hit points earned without a kill", async () => {
    const { session, input, step, placeZombie, points } = await load();
    placeZombie(SHOT_DISTANCE_M, PISTOL_BODY_DAMAGE * 4);
    session.player.pitch = BODY_PITCH_RAD;
    input.fire = true;
    step();
    expect(session.stats).toEqual({ kills: 0, headshots: 0, pointsEarned: points.POINTS_HIT });
  });

  it("does not count a kill again on the following steps", async () => {
    const { session, input, step, placeZombie, points } = await load();
    placeZombie(SHOT_DISTANCE_M, PISTOL_BODY_DAMAGE);
    input.fire = true;
    step();
    input.fire = false;
    step(FIRST_HIT_STEPS);
    expect(session.stats).toEqual({ kills: 1, headshots: 0, pointsEarned: points.POINTS_KILL });
  });

  it("does not count spent points as earned", async () => {
    const { session, input, step, mapConfig } = await loadStatsShop();
    const spot = mapConfig.WALL_BUYS.find((candidate: { weaponId: string }) => candidate.weaponId === "carbine");
    session.player.x = spot.x;
    session.player.z = spot.z;
    session.ledger.points = STATS_SHOP_POINTS;
    input.interact = true;
    step();
    expect(session.ledger.points).toBeLessThan(STATS_SHOP_POINTS);
    expect(session.stats.pointsEarned).toBe(0);
  });

  it("gives a new session fresh statistics after a played one", async () => {
    const played = await load();
    played.placeZombie(SHOT_DISTANCE_M, PISTOL_BODY_DAMAGE);
    played.input.fire = true;
    played.step();
    expect(played.session.stats.kills).toBe(1);
    const fresh = played.sessionModule.createGameSession(SEED);
    expect(fresh.stats).toEqual({ kills: 0, headshots: 0, pointsEarned: 0 });
  });
});
