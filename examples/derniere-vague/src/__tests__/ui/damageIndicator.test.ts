import { readFileSync } from "node:fs";

export {};

const INDICATOR_MODULE = "@/ui/damageIndicator";
const CONFIG_MODULE = "@/config/visualConfig";
const STYLES_PATH = `${process.cwd()}/src/ui/styles.css`;
const FRAME_S = 1 / 60;
const ACTIVE_CLASS = "is-active";
const ANGLE_PROPERTY = "--arc-angle";
const DURATION_PROPERTY = "--arc-duration";
const RADIUS_PROPERTY = "--arc-radius";
const FAR_M = 2;
const ANGLE_PRECISION = 4;
const HALF_TURN_DEG = 180;
const QUARTER_TURN_DEG = 90;
const QUARTER_TURN_RAD = Math.PI / 2;
const POOL_SIZE = 4;
const DURATION_S = 1;
const HALF_DURATION_S = 0.5;
const LATE_S = 0.8;
const SETTLE_MARGIN_S = 0.1;

type Hit = { kind: "playerHit"; damage: number; x: number; z: number };
type Indicator = { update: (session: { events: unknown[]; player: { x: number; z: number; yaw: number } }, frameS?: number) => void };

const hitAt = (x: number, z: number): Hit => ({ kind: "playerHit", damage: 35, x, z });
const LEFT = hitAt(-FAR_M, 0);
const RIGHT = hitAt(FAR_M, 0);
const AHEAD = hitAt(0, -FAR_M);
const BEHIND = hitAt(0, FAR_M);

const load = async () => {
  const module = await import(/* @vite-ignore */ INDICATOR_MODULE);
  const { VISUAL_CONFIG } = await import(/* @vite-ignore */ CONFIG_MODULE);
  const host = document.createElement("div");
  document.body.appendChild(host);
  const indicator: Indicator = module.createDamageIndicator(host);
  const session = { events: [] as unknown[], player: { x: 0, z: 0, yaw: 0 } };
  const arcs = (): HTMLElement[] => [...host.querySelectorAll<HTMLElement>(".damage-arc")];
  const active = (): HTMLElement[] => arcs().filter((arc) => arc.classList.contains(ACTIVE_CLASS));
  const angleOf = (arc: HTMLElement | undefined): number => Number.parseFloat(arc?.style.getPropertyValue(ANGLE_PROPERTY) ?? "NaN");
  const step = (events: unknown[] = [], frames = 1): void => {
    for (let frame = 0; frame < frames; frame++) {
      session.events = frame === 0 ? events : [];
      indicator.update(session, FRAME_S);
    }
  };
  return { host, indicator, session, arcs, active, angleOf, step, config: VISUAL_CONFIG.DAMAGE_ARC };
};

describe("createDamageIndicator", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("declares a pool of 4 arcs that fade over 1 s with a positive radius", async () => {
    const { config } = await load();
    expect(config.POOL_SIZE).toBe(POOL_SIZE);
    expect(config.DURATION_S).toBe(DURATION_S);
    expect(config.RADIUS_PX).toBeGreaterThan(0);
  });

  it("mounts the pooled arcs once in the host, all idle, with the tuning exposed as CSS properties", async () => {
    const { host, arcs, active, step } = await load();
    step();
    step([LEFT]);
    expect(host.querySelectorAll(".damage-indicator")).toHaveLength(1);
    expect(arcs()).toHaveLength(POOL_SIZE);
    expect(active()).toHaveLength(1);
    const root = host.querySelector<HTMLElement>(".damage-indicator");
    expect(root?.style.getPropertyValue(DURATION_PROPERTY)).toBe(`${DURATION_S}s`);
    expect(Number.parseFloat(root?.style.getPropertyValue(RADIUS_PROPERTY) ?? "NaN")).toBeGreaterThan(0);
  });

  it("starts with every arc idle", async () => {
    const { active } = await load();
    expect(active()).toHaveLength(0);
  });

  it("shows an arc on the left edge for a zombie on the left of the player", async () => {
    const { step, active, angleOf } = await load();
    step([LEFT]);
    expect(active()).toHaveLength(1);
    expect(angleOf(active()[0])).toBeCloseTo(-QUARTER_TURN_DEG, ANGLE_PRECISION);
  });

  it("puts the arc on the right edge, at the top and at the bottom for the other bearings", async () => {
    const { step, active, angleOf } = await load();
    step([RIGHT, AHEAD, BEHIND]);
    const angles = active().map((arc) => angleOf(arc));
    expect(angles[0]).toBeCloseTo(QUARTER_TURN_DEG, ANGLE_PRECISION);
    expect(angles[1]).toBeCloseTo(0, ANGLE_PRECISION);
    expect(Math.abs(angles[2] ?? 0)).toBeCloseTo(HALF_TURN_DEG, ANGLE_PRECISION);
  });

  it("measures the bearing against the player yaw", async () => {
    const { step, active, angleOf, session } = await load();
    session.player.yaw = QUARTER_TURN_RAD;
    step([hitAt(-FAR_M, 0)]);
    expect(angleOf(active()[0])).toBeCloseTo(0, ANGLE_PRECISION);
  });

  it("measures the bearing from the player position", async () => {
    const { step, active, angleOf, session } = await load();
    session.player.x = 5;
    session.player.z = 7;
    step([hitAt(5 - FAR_M, 7)]);
    expect(angleOf(active()[0])).toBeCloseTo(-QUARTER_TURN_DEG, ANGLE_PRECISION);
  });

  it("keeps an arc up for about the fade duration then clears it", async () => {
    const { step, active, config } = await load();
    step([LEFT]);
    step([], Math.round((config.DURATION_S * HALF_DURATION_S) / FRAME_S));
    expect(active()).toHaveLength(1);
    step([], Math.round((config.DURATION_S * (1 - HALF_DURATION_S + SETTLE_MARGIN_S)) / FRAME_S));
    expect(active()).toHaveLength(0);
  });

  it("recycles the oldest arc and restarts its fade when the pool is exhausted", async () => {
    const { step, active, arcs, angleOf } = await load();
    step([LEFT, RIGHT, AHEAD, BEHIND]);
    expect(active()).toHaveLength(POOL_SIZE);
    step([], Math.round(LATE_S / FRAME_S));
    step([AHEAD]);
    expect(arcs()).toHaveLength(POOL_SIZE);
    expect(angleOf(arcs()[0])).toBeCloseTo(0, ANGLE_PRECISION);
    step([], Math.round(HALF_DURATION_S / FRAME_S));
    expect(active()).toEqual([arcs()[0]]);
  });

  it("ignores events that are not a player hit and leaves the DOM alone when idle", async () => {
    const { host, step, active } = await load();
    const observer = new MutationObserver(() => undefined);
    observer.observe(host, { subtree: true, childList: true, characterData: true, attributes: true });
    step([{ kind: "shotFired" }, { kind: "zombieHit", id: 1, damage: 10, head: false, knife: false }], 3);
    expect(active()).toHaveLength(0);
    expect(observer.takeRecords()).toHaveLength(0);
    observer.disconnect();
  });
});

describe("damage arc styles", () => {
  const css = readFileSync(STYLES_PATH, "utf8");
  const rule = (selector: string): string => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`).exec(css);
    if (!match) throw new Error(`rule ${selector} missing`);
    return match[1] ?? "";
  };

  it("lays a click-through red edge arc, centred and rotated by the arc angle", () => {
    const body = rule(".damage-arc");
    expect(body).toMatch(/position:\s*absolute/);
    expect(body).toMatch(/pointer-events:\s*none/);
    expect(body).toMatch(/left:\s*50%/);
    expect(body).toMatch(/top:\s*50%/);
    expect(body).toMatch(/rotate\(var\(--arc-angle\)\)/);
    expect(body).toMatch(/opacity:\s*0/);
    expect(body).toMatch(/rgba?\(\s*(?:1[5-9]\d|2\d\d)\s*,\s*\d{1,2}\s*,\s*\d{1,2}|#(?:[ef][0-9a-f]|d[0-9a-f])[0-9a-f]{2}[0-9a-f]{2}|red/i);
    expect(rule(".damage-indicator")).toMatch(/pointer-events:\s*none/);
  });

  it("fades the active arc out over the configured duration", () => {
    expect(rule(".damage-arc.is-active")).toMatch(/animation:[^;]*damage-arc-fade[^;]*var\(--arc-duration\)/);
    const keyframes = /@keyframes damage-arc-fade\s*\{([\s\S]*?\n\})/.exec(css);
    expect(keyframes?.[1]).toMatch(/opacity:\s*1/);
    expect(keyframes?.[1]).toMatch(/opacity:\s*0/);
  });
});
