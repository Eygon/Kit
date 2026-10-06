export {};

const HITSCAN_MODULE = "@/logic/combat/hitscan";
const LAYOUT_MODULE = "@/logic/map/stationLayout";
const CONFIG_MODULE = "@/config/weaponConfig";
const GAME_CONFIG_MODULE = "@/config/gameConfig";

type Target = { id: number; x: number; z: number; radiusM: number; heightM: number };
type Hit = { targetId: number; head: boolean };

const RANGE_M = 40;
const KNIFE_RANGE_M = 1.5;
const ORIGIN = { x: 0, z: 2.5 };
const RADIUS_M = 0.3;
const HEIGHT_M = 1.8;

const target = (id: number, x: number, z: number): Target => ({ id, x, z, radiusM: RADIUS_M, heightM: HEIGHT_M });

const load = async () => {
  const hitscan = await import(/* @vite-ignore */ HITSCAN_MODULE);
  const layoutModule = await import(/* @vite-ignore */ LAYOUT_MODULE);
  const layout = layoutModule.createStationLayout();
  const config = await import(/* @vite-ignore */ CONFIG_MODULE);
  const gameConfig = await import(/* @vite-ignore */ GAME_CONFIG_MODULE);
  const out: Hit = { targetId: -1, head: false };
  const shoot = (origin: { x: number; z: number }, yaw: number, pitch: number, targets: Target[], assistRad = 0, rangeM = RANGE_M): Hit | null =>
    hitscan.resolveShot(origin, yaw, pitch, targets, rangeM, assistRad, out, layout);
  const pitchTo = (heightM: number, distanceM: number): number => Math.atan((heightM - gameConfig.GAME_CONFIG.PLAYER_EYE_HEIGHT_M) / distanceM);
  return { hitscan, layout, shoot, out, pitchTo, assist: config.AIM_ASSIST_CONE_RAD as number, headHeight: config.HEAD_HEIGHT_M as number };
};

describe("resolveShot", () => {
  it("hits a target straight ahead on the body", async () => {
    const { shoot } = await load();
    expect(shoot(ORIGIN, 0, 0, [target(7, 0, -2)])).toEqual({ targetId: 7, head: false });
  });

  it("reports a head hit above the head height and a body hit below it", async () => {
    const { shoot, pitchTo, headHeight } = await load();
    const distance = 4.5;
    expect(shoot(ORIGIN, 0, pitchTo(headHeight + 0.05, distance), [target(1, 0, -2)])?.head).toBe(true);
    expect(shoot(ORIGIN, 0, pitchTo(headHeight - 0.4, distance), [target(1, 0, -2)])?.head).toBe(false);
  });

  it("misses over the top of the target and into the floor", async () => {
    const { shoot, pitchTo } = await load();
    expect(shoot(ORIGIN, 0, pitchTo(HEIGHT_M + 0.5, 4.5), [target(1, 0, -2)])).toBeNull();
    expect(shoot(ORIGIN, 0, pitchTo(-0.5, 4.5), [target(1, 0, -2)])).toBeNull();
  });

  it("returns the first target on the line whatever the list order", async () => {
    const { shoot } = await load();
    expect(shoot(ORIGIN, 0, 0, [target(1, 0, -4), target(2, 0, 0)])?.targetId).toBe(2);
    expect(shoot(ORIGIN, 0, 0, [target(2, 0, 0), target(1, 0, -4)])?.targetId).toBe(2);
  });

  it("ignores targets behind the player and beyond the range", async () => {
    const { shoot } = await load();
    expect(shoot(ORIGIN, 0, 0, [target(1, 0, 5)])).toBeNull();
    expect(shoot(ORIGIN, 0, 0, [target(1, 0, -2)], 0, 3)).toBeNull();
  });

  it("follows the yaw", async () => {
    const { shoot } = await load();
    const east = shoot({ x: 0, z: 0 }, -Math.PI / 2, 0, [target(3, 4, 0)]);
    expect(east?.targetId).toBe(3);
    expect(shoot({ x: 0, z: 0 }, Math.PI / 2, 0, [target(3, 4, 0)])).toBeNull();
  });

  it("is stopped by the station walls", async () => {
    const { shoot } = await load();
    expect(shoot(ORIGIN, 0, 0, [target(1, 0, -7)])).toBeNull();
    expect(shoot({ x: 5, z: 3 }, -Math.PI / 2, 0, [target(1, 9, 3)])).toBeNull();
    expect(shoot({ x: 5, z: 3 }, -Math.PI / 2, 0, [target(1, 7, 3)])?.targetId).toBe(1);
  });

  it("widens acceptance with the assist cone only when requested", async () => {
    const { shoot, assist } = await load();
    const offCrosshair = target(4, 0.55, -2.5);
    expect(shoot(ORIGIN, 0, 0, [offCrosshair], 0)).toBeNull();
    expect(shoot(ORIGIN, 0, 0, [offCrosshair], assist)?.targetId).toBe(4);
    expect(shoot(ORIGIN, 0, 0, [target(4, 1.2, -2.5)], assist)).toBeNull();
  });

  it("fills and returns the provided out object", async () => {
    const { shoot, out } = await load();
    expect(shoot(ORIGIN, 0, 0, [target(9, 0, -2)])).toBe(out);
    expect(out.targetId).toBe(9);
  });
});

describe("resolveKnife", () => {
  const knife = async (origin: { x: number; z: number }, yaw: number, targets: Target[]): Promise<number | null> => {
    const { hitscan, layout } = await load();
    return hitscan.resolveKnife(origin, yaw, targets, KNIFE_RANGE_M, layout);
  };

  it("hits a target within range in front", async () => {
    expect(await knife(ORIGIN, 0, [target(5, 0, 1.5)])).toBe(5);
  });

  it("misses targets that are too far, behind or outside the front arc", async () => {
    expect(await knife(ORIGIN, 0, [target(5, 0, 0.5)])).toBeNull();
    expect(await knife(ORIGIN, 0, [target(5, 0, 3.5)])).toBeNull();
    expect(await knife(ORIGIN, 0, [target(5, 1, 2.5)])).toBeNull();
  });

  it("picks the nearest target in the arc", async () => {
    expect(await knife(ORIGIN, 0, [target(1, 0, 1.4), target(2, 0.1, 1.8)])).toBe(2);
  });

  it("is blocked by a wall between the player and the target", async () => {
    expect(await knife({ x: 0, z: -5.8 }, 0, [target(1, 0, -6.6)])).toBeNull();
  });
});
