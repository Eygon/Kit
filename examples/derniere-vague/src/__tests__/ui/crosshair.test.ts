import { readFileSync } from "node:fs";

export {};

const CROSSHAIR_MODULE = "@/ui/crosshair";
const CONFIG_MODULE = "@/config/visualConfig";
const INPUT_MODULE = "@/logic/input/inputState";
const STYLES_PATH = `${process.cwd()}/src/ui/styles.css`;
const FRAME_S = 1 / 60;
const GAP_PROPERTY = "--gap";
const VISIBLE_CLASS = "is-visible";
const KILL_CLASS = "is-kill";
const TICK_COUNT = 4;
const SETTLE_FRAMES = 240;
const MARKER_FRAMES_MARGIN = 3;
const HIT_EVENT = { kind: "targetHit", targetId: 1, damage: 10, head: false, knife: false };
const KILL_EVENT = { kind: "zombieKilled", id: 1, headshot: false };

type GameEventLike = Record<string, unknown>;
type CrosshairInput = { move: { x: number; y: number }; aim: boolean };
type Crosshair = { update: (session: { events: GameEventLike[] }, input: CrosshairInput, frameS: number) => void };

const load = async () => {
  const module = await import(/* @vite-ignore */ CROSSHAIR_MODULE);
  const { VISUAL_CONFIG } = await import(/* @vite-ignore */ CONFIG_MODULE);
  const { createInputState } = await import(/* @vite-ignore */ INPUT_MODULE);
  const host = document.createElement("div");
  document.body.appendChild(host);
  const crosshair: Crosshair = module.createCrosshair(host);
  const input: CrosshairInput = createInputState();
  const session = { events: [] as GameEventLike[] };
  const root = (): HTMLElement => {
    const found = host.querySelector<HTMLElement>(".crosshair");
    if (!found) throw new Error("crosshair missing");
    return found;
  };
  const marker = (): HTMLElement => {
    const found = host.querySelector<HTMLElement>(".crosshair__marker");
    if (!found) throw new Error("marker missing");
    return found;
  };
  const gap = (): number => Number.parseFloat(root().style.getPropertyValue(GAP_PROPERTY));
  const step = (events: GameEventLike[] = [], frames = 1): void => {
    for (let frame = 0; frame < frames; frame++) {
      session.events = frame === 0 ? events : [];
      crosshair.update(session, input, FRAME_S);
    }
  };
  return { host, crosshair, input, session, root, marker, gap, step, config: VISUAL_CONFIG.CROSSHAIR };
};

describe("createCrosshair", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("declares positive tuning with a tighter aim gap than the rest gap", async () => {
    const { config } = await load();
    for (const value of Object.values(config)) expect(value as number).toBeGreaterThan(0);
    expect(config.AIM_GAP_PX).toBeLessThan(config.REST_GAP_PX);
  });

  it("mounts one crosshair with four ticks and one hidden marker in the host", async () => {
    const { host, marker } = await load();
    expect(host.querySelectorAll(".crosshair")).toHaveLength(1);
    expect(host.querySelectorAll(".crosshair__tick")).toHaveLength(TICK_COUNT);
    expect(host.querySelectorAll(".crosshair__marker")).toHaveLength(1);
    expect(marker().classList.contains(VISIBLE_CLASS)).toBe(false);
  });

  it("sits at the rest gap when nothing moves and nothing fires", async () => {
    const { step, gap, config } = await load();
    step();
    expect(gap()).toBe(config.REST_GAP_PX);
  });

  it("tightens below the rest gap while aiming and widens back when the aim is released", async () => {
    const { step, gap, input, config } = await load();
    step();
    const resting = gap();
    input.aim = true;
    step();
    expect(gap()).toBeLessThan(resting);
    expect(gap()).toBe(config.AIM_GAP_PX);
    input.aim = false;
    step();
    expect(gap()).toBe(resting);
  });

  it("grows on a shot then returns to the rest gap", async () => {
    const { step, gap, config } = await load();
    step();
    step([{ kind: "shotFired" }]);
    expect(gap()).toBeGreaterThan(config.REST_GAP_PX);
    expect(gap()).toBeLessThanOrEqual(config.REST_GAP_PX + config.SHOT_GAP_PX);
    step([], 2);
    const afterTwoFrames = gap();
    step([], SETTLE_FRAMES);
    expect(afterTwoFrames).toBeGreaterThan(config.REST_GAP_PX);
    expect(gap()).toBe(config.REST_GAP_PX);
  });

  it("recovers at the configured rate", async () => {
    const { step, gap, config } = await load();
    step([{ kind: "shotFired" }]);
    const peak = gap();
    const frames = 6;
    step([], frames);
    expect(peak - gap()).toBeGreaterThanOrEqual(config.RECOVER_RATE * FRAME_S * (frames - 1) - config.GAP_STEP_PX * 2);
    expect(peak - gap()).toBeLessThanOrEqual(config.RECOVER_RATE * FRAME_S * (frames + 1) + config.GAP_STEP_PX * 2);
  });

  it("keeps a single shot spread when several shots land in one frame", async () => {
    const { step, gap, config } = await load();
    step([{ kind: "shotFired" }, { kind: "shotFired" }, { kind: "shotFired" }]);
    expect(gap()).toBeLessThanOrEqual(config.REST_GAP_PX + config.SHOT_GAP_PX);
  });

  it("widens with the move stick in proportion to its push and relaxes when released", async () => {
    const { step, gap, input, config } = await load();
    step();
    input.move.x = 1;
    step();
    expect(gap()).toBeCloseTo(config.REST_GAP_PX + config.MOVE_GAP_PX, 0);
    input.move.x = 0.5;
    step();
    expect(gap()).toBeLessThan(config.REST_GAP_PX + config.MOVE_GAP_PX);
    expect(gap()).toBeGreaterThan(config.REST_GAP_PX);
    input.move.x = 0;
    step();
    expect(gap()).toBe(config.REST_GAP_PX);
  });

  it("adds the move spread to the aim gap", async () => {
    const { step, gap, input, config } = await load();
    input.aim = true;
    input.move.y = 1;
    step();
    expect(gap()).toBeCloseTo(config.AIM_GAP_PX + config.MOVE_GAP_PX, 0);
  });

  it("writes the gap in whole steps and only when the rounded value changes", async () => {
    const { step, gap, root, config } = await load();
    step();
    const writes = vi.spyOn(root().style, "setProperty");
    step([], 10);
    expect(writes).not.toHaveBeenCalled();
    step([{ kind: "shotFired" }]);
    expect(writes).toHaveBeenCalledWith(GAP_PROPERTY, expect.stringMatching(/^-?\d+(\.\d+)?px$/));
    expect((gap() / config.GAP_STEP_PX) % 1).toBeCloseTo(0, 6);
    const afterShot = writes.mock.calls.length;
    step([], SETTLE_FRAMES);
    expect(writes.mock.calls.length).toBeGreaterThan(afterShot);
    const settled = writes.mock.calls.length;
    step([], 10);
    expect(writes.mock.calls.length).toBe(settled);
  });

  it("does not touch the DOM while idle", async () => {
    const { step, host } = await load();
    step();
    const observer = new MutationObserver(() => undefined);
    observer.observe(host, { subtree: true, childList: true, characterData: true, attributes: true });
    step([], 30);
    expect(observer.takeRecords()).toHaveLength(0);
    observer.disconnect();
  });

  it("shows the white marker on a hit and hides it after the marker time", async () => {
    const { step, marker, config } = await load();
    step([HIT_EVENT]);
    expect(marker().classList.contains(VISIBLE_CLASS)).toBe(true);
    expect(marker().classList.contains(KILL_CLASS)).toBe(false);
    const frames = Math.ceil(config.MARKER_S / FRAME_S);
    step([], Math.max(1, frames - MARKER_FRAMES_MARGIN));
    expect(marker().classList.contains(VISIBLE_CLASS)).toBe(true);
    step([], frames + MARKER_FRAMES_MARGIN);
    expect(marker().classList.contains(VISIBLE_CLASS)).toBe(false);
  });

  it("turns the marker red on a kill and white again on the next plain hit", async () => {
    const { step, marker, config } = await load();
    step([HIT_EVENT, KILL_EVENT]);
    expect(marker().classList.contains(VISIBLE_CLASS)).toBe(true);
    expect(marker().classList.contains(KILL_CLASS)).toBe(true);
    step([], Math.ceil(config.MARKER_S / FRAME_S) + MARKER_FRAMES_MARGIN);
    expect(marker().classList.contains(VISIBLE_CLASS)).toBe(false);
    expect(marker().classList.contains(KILL_CLASS)).toBe(false);
    step([HIT_EVENT]);
    expect(marker().classList.contains(VISIBLE_CLASS)).toBe(true);
    expect(marker().classList.contains(KILL_CLASS)).toBe(false);
  });

  it("keeps the kill colour when a later pellet only hits within the marker time", async () => {
    const { step, marker } = await load();
    step([KILL_EVENT]);
    step([HIT_EVENT]);
    expect(marker().classList.contains(KILL_CLASS)).toBe(true);
  });

  it("restarts the marker time on a new hit", async () => {
    const { step, marker, config } = await load();
    const frames = Math.ceil(config.MARKER_S / FRAME_S);
    step([HIT_EVENT]);
    step([], Math.max(1, frames - MARKER_FRAMES_MARGIN));
    step([HIT_EVENT]);
    step([], Math.max(1, frames - MARKER_FRAMES_MARGIN));
    expect(marker().classList.contains(VISIBLE_CLASS)).toBe(true);
  });

  it("ignores events that are not hits", async () => {
    const { step, marker } = await load();
    step([{ kind: "reloadStarted" }, { kind: "zombieHit", id: 1, damage: 10, head: false, knife: false }]);
    expect(marker().classList.contains(VISIBLE_CLASS)).toBe(false);
  });
});

describe("crosshair styles", () => {
  const css = readFileSync(STYLES_PATH, "utf8");
  const rule = (selector: string): string => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`).exec(css);
    if (!match) throw new Error(`rule ${selector} missing`);
    return match[1] ?? "";
  };

  it("centres a click-through crosshair over the canvas", () => {
    const body = rule(".crosshair");
    expect(body).toMatch(/position:\s*absolute/);
    expect(body).toMatch(/pointer-events:\s*none/);
    expect(body).toMatch(/left:\s*50%/);
    expect(body).toMatch(/top:\s*50%/);
  });

  it("offsets each of the four ticks by the gap variable", () => {
    expect(rule(".crosshair__tick")).toMatch(/position:\s*absolute/);
    const offsets = css.match(/var\(--gap\)/g) ?? [];
    expect(offsets.length).toBeGreaterThanOrEqual(TICK_COUNT);
  });

  it("fades a white cross marker and turns it red on a kill", () => {
    expect(rule(".crosshair__marker")).toMatch(/opacity:\s*0/);
    expect(rule(".crosshair__marker")).toMatch(/transition:[^;]*opacity/);
    expect(rule(".crosshair__marker.is-visible")).toMatch(/opacity:\s*1/);
    expect(rule(".crosshair__marker.is-kill")).toMatch(/#(?:[ef][0-9a-f]|d[0-9a-f])[0-9a-f]{2}[0-9a-f]{2}|rgb|red/i);
  });

  it("animates the marker with transform or opacity only", () => {
    expect(rule(".crosshair__marker")).not.toMatch(/\b(?:width|height|top|left):\s*\d+px\s*;\s*transition/);
  });
});
