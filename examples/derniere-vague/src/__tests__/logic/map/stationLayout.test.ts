export {};

const LAYOUT_MODULE = "@/logic/map/stationLayout";
const CONFIG_MODULE = "@/config/mapConfig";
const PLAYER_RADIUS_M = 0.4;
const EPSILON_M = 1e-6;

type Vec2 = { x: number; z: number };

const load = async () => {
  const layoutModule = await import(/* @vite-ignore */ LAYOUT_MODULE);
  const configModule = await import(/* @vite-ignore */ CONFIG_MODULE);
  return { createStationLayout: layoutModule.createStationLayout, resolveMovement: layoutModule.resolveMovement, openZone: layoutModule.openZone, zones: configModule.ZONES, doorOpenS: configModule.DOOR_OPEN_S, config: configModule.STATION_LAYOUT };
};

describe("createStationLayout", () => {
  it("exposes the start room walls as readonly segments", async () => {
    const { createStationLayout } = await load();
    const layout = createStationLayout();
    expect(layout.segments.length).toBeGreaterThanOrEqual(4);
    for (const segment of layout.segments) {
      const length = Math.hypot(segment.bx - segment.ax, segment.bz - segment.az);
      expect(length).toBeGreaterThan(0);
    }
  });

  it("has exactly three closed zone entrances flagged with a distinct zoneId", async () => {
    const { createStationLayout } = await load();
    const layout = createStationLayout();
    const flagged = layout.segments.filter((segment: { zoneId: string | null }) => segment.zoneId !== null);
    expect(flagged).toHaveLength(3);
    expect(layout.entrances).toHaveLength(3);
    expect(new Set(flagged.map((segment: { zoneId: string }) => segment.zoneId)).size).toBe(3);
  });

  it("has 6 to 8 window spawn points with id, position and facing", async () => {
    const { createStationLayout } = await load();
    const layout = createStationLayout();
    expect(layout.spawnPoints.length).toBeGreaterThanOrEqual(6);
    expect(layout.spawnPoints.length).toBeLessThanOrEqual(8);
    expect(new Set(layout.spawnPoints.map((spawn: { id: string }) => spawn.id)).size).toBe(layout.spawnPoints.length);
    for (const spawn of layout.spawnPoints) {
      expect(Number.isFinite(spawn.x)).toBe(true);
      expect(Number.isFinite(spawn.z)).toBe(true);
      expect(Number.isFinite(spawn.facing)).toBe(true);
    }
  });

  it("places every spawn point outside the room and facing inward", async () => {
    const { createStationLayout, config } = await load();
    const layout = createStationLayout();
    for (const spawn of layout.spawnPoints) {
      const outside = Math.abs(spawn.x) > config.HALF_WIDTH_M || Math.abs(spawn.z) > config.HALF_DEPTH_M;
      expect(outside).toBe(true);
      const towardX = Math.sin(spawn.facing);
      const towardZ = Math.cos(spawn.facing);
      const dot = towardX * -spawn.x + towardZ * -spawn.z;
      expect(dot).toBeGreaterThan(0);
    }
  });

  it("starts the player inside the room, taken from the config", async () => {
    const { createStationLayout, config } = await load();
    const layout = createStationLayout();
    expect(layout.playerStart).toEqual({ x: config.PLAYER_START.x, z: config.PLAYER_START.z });
    expect(Math.abs(layout.playerStart.x)).toBeLessThan(config.HALF_WIDTH_M);
    expect(Math.abs(layout.playerStart.z)).toBeLessThan(config.HALF_DEPTH_M);
  });
});

describe("resolveMovement", () => {
  it("moves freely in open space", async () => {
    const { createStationLayout, resolveMovement } = await load();
    const layout = createStationLayout();
    const out: Vec2 = { x: 0, z: 0 };
    resolveMovement(layout, { x: 0, z: 0 }, { x: 0.5, z: -0.25 }, PLAYER_RADIUS_M, out);
    expect(out.x).toBeCloseTo(0.5, 6);
    expect(out.z).toBeCloseTo(-0.25, 6);
  });

  it("never crosses a wall even with a huge delta", async () => {
    const { createStationLayout, resolveMovement, config } = await load();
    const layout = createStationLayout();
    const out: Vec2 = { x: 0, z: 0 };
    const directions: Vec2[] = [
      { x: 100, z: 0 },
      { x: -100, z: 0 },
      { x: 0, z: 100 },
      { x: 0, z: -100 },
      { x: 90, z: 80 },
      { x: -90, z: -80 },
    ];
    for (const delta of directions) {
      resolveMovement(layout, { x: 1, z: 1 }, delta, PLAYER_RADIUS_M, out);
      expect(Math.abs(out.x)).toBeLessThanOrEqual(config.HALF_WIDTH_M - PLAYER_RADIUS_M + EPSILON_M);
      expect(Math.abs(out.z)).toBeLessThanOrEqual(config.HALF_DEPTH_M - PLAYER_RADIUS_M + EPSILON_M);
    }
  });

  it("blocks the closed zone entrances", async () => {
    const { createStationLayout, resolveMovement, config } = await load();
    const layout = createStationLayout();
    const out: Vec2 = { x: 0, z: 0 };
    resolveMovement(layout, { x: 0, z: 0 }, { x: 0, z: -100 }, PLAYER_RADIUS_M, out);
    expect(out.z).toBeGreaterThan(-config.HALF_DEPTH_M);
    resolveMovement(layout, { x: 0, z: 0 }, { x: 100, z: 0 }, PLAYER_RADIUS_M, out);
    expect(out.x).toBeLessThan(config.HALF_WIDTH_M);
    resolveMovement(layout, { x: 0, z: 0 }, { x: -100, z: 0 }, PLAYER_RADIUS_M, out);
    expect(out.x).toBeGreaterThan(-config.HALF_WIDTH_M);
  });

  it("slides along a wall instead of stopping dead", async () => {
    const { createStationLayout, resolveMovement, config } = await load();
    const layout = createStationLayout();
    const out: Vec2 = { x: 0, z: 0 };
    const start: Vec2 = { x: config.HALF_WIDTH_M - PLAYER_RADIUS_M, z: 3 };
    resolveMovement(layout, start, { x: 0.3, z: 0.4 }, PLAYER_RADIUS_M, out);
    expect(out.x).toBeCloseTo(config.HALF_WIDTH_M - PLAYER_RADIUS_M, 3);
    expect(out.z).toBeCloseTo(3.4, 3);
  });

  it("writes into out without mutating from or delta and supports out aliasing from", async () => {
    const { createStationLayout, resolveMovement } = await load();
    const layout = createStationLayout();
    const from: Vec2 = { x: 1, z: 1 };
    const delta: Vec2 = { x: 0.2, z: 0.1 };
    const out: Vec2 = { x: 0, z: 0 };
    const returned = resolveMovement(layout, from, delta, PLAYER_RADIUS_M, out);
    expect(returned).toBeUndefined();
    expect(from).toEqual({ x: 1, z: 1 });
    expect(delta).toEqual({ x: 0.2, z: 0.1 });
    expect(out.x).toBeCloseTo(1.2, 6);
    resolveMovement(layout, from, delta, PLAYER_RADIUS_M, from);
    expect(from.x).toBeCloseTo(1.2, 6);
    expect(from.z).toBeCloseTo(1.1, 6);
  });
});

describe("zone config", () => {
  it("prices the north, east and west passages at 750, 1000 and 1250 points", async () => {
    const { zones } = await load();
    expect(zones.north.DOOR_COST_POINTS).toBe(750);
    expect(zones.east.DOOR_COST_POINTS).toBe(1000);
    expect(zones.west.DOOR_COST_POINTS).toBe(1250);
  });

  it("uses debris for north and west and a door for east, opening in one second", async () => {
    const { zones, doorOpenS } = await load();
    expect(zones.north.DOOR_KIND).toBe("debris");
    expect(zones.west.DOOR_KIND).toBe("debris");
    expect(zones.east.DOOR_KIND).toBe("door");
    expect(doorOpenS).toBe(1);
  });

  it("gives every zone room walls and at least two windows", async () => {
    const { zones } = await load();
    for (const zoneId of ["north", "east", "west"]) {
      expect(zones[zoneId].WALLS.length).toBeGreaterThanOrEqual(3);
      expect(zones[zoneId].WINDOWS.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("zone windows and walls", () => {
  it("lists every window with its zone, the start room ones having none", async () => {
    const { createStationLayout, zones } = await load();
    const layout = createStationLayout();
    const startWindows = layout.windows.filter((window: { zoneId: string | null }) => window.zoneId === null);
    expect(startWindows).toHaveLength(8);
    for (const zoneId of ["north", "east", "west"]) {
      const own = layout.windows.filter((window: { zoneId: string | null }) => window.zoneId === zoneId);
      expect(own).toHaveLength(zones[zoneId].WINDOWS.length);
    }
    expect(new Set(layout.windows.map((window: { id: string }) => window.id)).size).toBe(layout.windows.length);
  });

  it("keeps zone windows out of the spawn points while the zones are closed", async () => {
    const { createStationLayout } = await load();
    const layout = createStationLayout();
    expect(layout.spawnPoints).toHaveLength(8);
    const zoneIds = new Set(layout.windows.filter((window: { zoneId: string | null }) => window.zoneId !== null).map((window: { id: string }) => window.id));
    for (const spawn of layout.spawnPoints) expect(zoneIds.has(spawn.id)).toBe(false);
  });

  it("always carries the zone room walls in the collision segments", async () => {
    const { createStationLayout, zones, config } = await load();
    const layout = createStationLayout();
    const zoneWallCount = ["north", "east", "west"].reduce((sum, zoneId) => sum + zones[zoneId].WALLS.length, 0);
    expect(layout.segments).toHaveLength(config.WALLS.length + config.ENTRANCES.length + zoneWallCount);
  });

  it("places every window outside the start room and facing inward", async () => {
    const { createStationLayout, config } = await load();
    const layout = createStationLayout();
    for (const window of layout.windows) {
      expect(Math.abs(window.x) > config.HALF_WIDTH_M || Math.abs(window.z) > config.HALF_DEPTH_M).toBe(true);
      expect(Math.sin(window.facing) * -window.x + Math.cos(window.facing) * -window.z).toBeGreaterThan(0);
    }
  });
});

describe("openZone", () => {
  const entranceCount = (layout: { segments: { zoneId: string | null }[] }, zoneId: string): number => layout.segments.filter((segment) => segment.zoneId === zoneId).length;

  it("removes only that entrance from the segments", async () => {
    const { createStationLayout, openZone } = await load();
    const layout = createStationLayout();
    const before = layout.segments.length;
    openZone(layout, "north");
    expect(layout.segments).toHaveLength(before - 1);
    expect(entranceCount(layout, "north")).toBe(0);
    expect(entranceCount(layout, "east")).toBe(1);
    expect(entranceCount(layout, "west")).toBe(1);
  });

  it("adds that zone windows to the spawn points and no other zone", async () => {
    const { createStationLayout, openZone, zones } = await load();
    const layout = createStationLayout();
    openZone(layout, "north");
    expect(layout.spawnPoints).toHaveLength(8 + zones.north.WINDOWS.length);
    for (const spec of zones.north.WINDOWS) expect(layout.spawnPoints.map((spawn: { id: string }) => spawn.id)).toContain(spec.id);
    for (const spec of zones.east.WINDOWS) expect(layout.spawnPoints.map((spawn: { id: string }) => spawn.id)).not.toContain(spec.id);
  });

  it("is idempotent", async () => {
    const { createStationLayout, openZone } = await load();
    const layout = createStationLayout();
    openZone(layout, "east");
    const segments = layout.segments.length;
    const spawns = layout.spawnPoints.length;
    openZone(layout, "east");
    expect(layout.segments).toHaveLength(segments);
    expect(layout.spawnPoints).toHaveLength(spawns);
  });

  it("keeps the zone room walls solid once the entrance is open", async () => {
    const { createStationLayout, openZone, resolveMovement, zones, config } = await load();
    const layout = createStationLayout();
    openZone(layout, "east");
    const out: Vec2 = { x: 0, z: 0 };
    resolveMovement(layout, { x: 7, z: 0 }, { x: 100, z: 0 }, PLAYER_RADIUS_M, out);
    const farWall = Math.max(...zones.east.WALLS.map((wall: { ax: number; bx: number }) => Math.max(wall.ax, wall.bx)));
    expect(out.x).toBeGreaterThan(config.HALF_WIDTH_M + 1);
    expect(out.x).toBeLessThanOrEqual(farWall - PLAYER_RADIUS_M + EPSILON_M);
  });

  it("lets the player walk through the opened passage but not the closed ones", async () => {
    const { createStationLayout, openZone, resolveMovement, config } = await load();
    const layout = createStationLayout();
    const out: Vec2 = { x: 0, z: 0 };
    resolveMovement(layout, { x: 7, z: 0 }, { x: 3, z: 0 }, PLAYER_RADIUS_M, out);
    expect(out.x).toBeLessThan(config.HALF_WIDTH_M);
    openZone(layout, "east");
    resolveMovement(layout, { x: 7, z: 0 }, { x: 3, z: 0 }, PLAYER_RADIUS_M, out);
    expect(out.x).toBeCloseTo(10, 3);
    resolveMovement(layout, { x: 0, z: -5 }, { x: 0, z: -3 }, PLAYER_RADIUS_M, out);
    expect(out.z).toBeGreaterThan(-config.HALF_DEPTH_M);
  });
});
