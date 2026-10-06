export {};

const DOORS_MODULE = "@/logic/map/zoneDoors";
const LAYOUT_MODULE = "@/logic/map/stationLayout";
const CONFIG_MODULE = "@/config/mapConfig";
const HORDE_MODULE = "@/logic/zombies/zombieHorde";
const RANDOM_MODULE = "@/logic/random";
const SEED = 7;
const STEP_S = 1 / 60;
const SPAWN_DRAWS = 200;
const HALF = 0.5;
const ZONE_IDS = ["north", "east", "west"];

type Event = { kind: string; zoneId?: string };

const load = async () => {
  const doorsModule = await import(/* @vite-ignore */ DOORS_MODULE);
  const layoutModule = await import(/* @vite-ignore */ LAYOUT_MODULE);
  const config = await import(/* @vite-ignore */ CONFIG_MODULE);
  const hordeModule = await import(/* @vite-ignore */ HORDE_MODULE);
  const randomModule = await import(/* @vite-ignore */ RANDOM_MODULE);
  const doors = doorsModule.createZoneDoors();
  const layout = layoutModule.createStationLayout();
  const events: Event[] = [];
  const stepFor = (seconds: number): void => {
    const steps = Math.round(seconds / STEP_S);
    for (let i = 0; i < steps; i++) doorsModule.updateZoneDoors(doors, layout, STEP_S, events);
  };
  const spawnedWindowIds = (): Set<string> => {
    const horde = hordeModule.createHorde();
    const random = randomModule.createRandom(SEED);
    const used = new Set<string>();
    for (let i = 0; i < SPAWN_DRAWS; i++) {
      hordeModule.requestSpawn(horde, 100, "walk", layout, random);
      const zombie = horde.zombies.find((candidate: { alive: boolean }) => candidate.alive);
      const match = layout.windows.find((window: { x: number; z: number }) => window.x === zombie.x && window.z === zombie.z);
      used.add(match.id);
      zombie.alive = false;
    }
    return used;
  };
  return { doorsModule, layout, config, doors, events, stepFor, spawnedWindowIds, openS: config.DOOR_OPEN_S as number };
};

describe("createZoneDoors", () => {
  it("starts with every zone closed", async () => {
    const { doors } = await load();
    for (const zoneId of ZONE_IDS) expect(doors[zoneId]).toEqual({ kind: "closed" });
  });
});

describe("startOpening", () => {
  it("moves a closed door to opening for the full opening time and announces it", async () => {
    const { doorsModule, doors, events, openS } = await load();
    doorsModule.startOpening(doors, "east", events);
    expect(doors.east).toEqual({ kind: "opening", remainingS: openS });
    expect(doors.north).toEqual({ kind: "closed" });
    expect(events).toEqual([{ kind: "doorOpening", zoneId: "east" }]);
  });

  it("ignores a door that is already opening", async () => {
    const { doorsModule, doors, events, stepFor, openS } = await load();
    doorsModule.startOpening(doors, "east", events);
    stepFor(openS * HALF);
    doorsModule.startOpening(doors, "east", events);
    expect(events.filter((event) => event.kind === "doorOpening")).toHaveLength(1);
    expect(doors.east.remainingS).toBeLessThan(openS);
  });

  it("ignores a door that is already open", async () => {
    const { doorsModule, doors, events, stepFor, openS } = await load();
    doorsModule.startOpening(doors, "east", events);
    stepFor(openS + HALF);
    doorsModule.startOpening(doors, "east", events);
    expect(doors.east).toEqual({ kind: "open" });
    expect(events.filter((event) => event.kind === "doorOpening")).toHaveLength(1);
  });
});

describe("updateZoneDoors", () => {
  it("keeps the passage blocked while the door is opening", async () => {
    const { doorsModule, doors, layout, events, stepFor, openS } = await load();
    doorsModule.startOpening(doors, "east", events);
    stepFor(openS * HALF);
    expect(doors.east.kind).toBe("opening");
    expect(layout.segments.filter((segment: { zoneId: string | null }) => segment.zoneId === "east")).toHaveLength(1);
    expect(events.some((event) => event.kind === "doorOpened")).toBe(false);
  });

  it("opens the zone when the opening time elapses and emits one doorOpened event", async () => {
    const { doorsModule, doors, layout, events, stepFor, openS } = await load();
    doorsModule.startOpening(doors, "east", events);
    stepFor(openS + 2 * STEP_S);
    expect(doors.east).toEqual({ kind: "open" });
    expect(layout.segments.filter((segment: { zoneId: string | null }) => segment.zoneId === "east")).toHaveLength(0);
    stepFor(openS);
    expect(events.filter((event) => event.kind === "doorOpened")).toEqual([{ kind: "doorOpened", zoneId: "east" }]);
  });

  it("leaves closed doors and their entrances untouched", async () => {
    const { layout, stepFor, doors, events } = await load();
    const before = layout.segments.length;
    stepFor(2);
    expect(layout.segments).toHaveLength(before);
    for (const zoneId of ZONE_IDS) expect(doors[zoneId]).toEqual({ kind: "closed" });
    expect(events).toEqual([]);
  });

  it("times each door on its own", async () => {
    const { doorsModule, doors, events, stepFor, openS } = await load();
    doorsModule.startOpening(doors, "north", events);
    stepFor(openS * HALF);
    doorsModule.startOpening(doors, "west", events);
    stepFor(openS * HALF + 2 * STEP_S);
    expect(doors.north).toEqual({ kind: "open" });
    expect(doors.west.kind).toBe("opening");
  });
});

describe("doorProgress", () => {
  it("rises from 0 to 1 over the opening time", async () => {
    const { doorsModule, doors, events, stepFor, openS } = await load();
    expect(doorsModule.doorProgress(doors, "east")).toBe(0);
    doorsModule.startOpening(doors, "east", events);
    expect(doorsModule.doorProgress(doors, "east")).toBeCloseTo(0, 6);
    stepFor(openS * HALF);
    expect(doorsModule.doorProgress(doors, "east")).toBeCloseTo(HALF, 1);
    stepFor(openS);
    expect(doorsModule.doorProgress(doors, "east")).toBe(1);
  });
});

describe("zone spawn draw", () => {
  it("never draws a north zone window while the north zone is closed", async () => {
    const { spawnedWindowIds, layout } = await load();
    const northIds = layout.windows.filter((window: { zoneId: string | null }) => window.zoneId === "north").map((window: { id: string }) => window.id);
    const used = spawnedWindowIds();
    for (const id of northIds) expect(used.has(id)).toBe(false);
  });

  it("draws north zone windows once the north zone is open", async () => {
    const { doorsModule, doors, events, stepFor, spawnedWindowIds, layout, openS } = await load();
    doorsModule.startOpening(doors, "north", events);
    stepFor(openS + 2 * STEP_S);
    const northIds = layout.windows.filter((window: { zoneId: string | null }) => window.zoneId === "north").map((window: { id: string }) => window.id);
    const used = spawnedWindowIds();
    for (const id of northIds) expect(used.has(id)).toBe(true);
  });
});
