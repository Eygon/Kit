import { readFileSync } from "node:fs";
import { VISUAL_CONFIG } from "@/config/visualConfig";
import { TEXTS } from "@/ui/texts";

export {};

const MODULE = "@/ui/floatingPoints";
const STYLES_PATH = `${process.cwd()}/src/ui/styles.css`;
const FLOAT_CLASS = "hud__float";
const GAIN = 60;
const OTHER_GAIN = 10;

type FloatingPoints = { show: (amount: number) => void };

const load = async () => {
  const module = await import(/* @vite-ignore */ MODULE);
  const anchor = document.createElement("div");
  document.body.appendChild(anchor);
  const floating: FloatingPoints = module.createFloatingPoints(anchor);
  const nodes = (): HTMLElement[] => Array.from(anchor.querySelectorAll<HTMLElement>("[data-hud-float]"));
  const active = (): HTMLElement[] => nodes().filter((node) => node.classList.contains(FLOAT_CLASS));
  return { anchor, floating, nodes, active };
};

const styles = (): string => readFileSync(STYLES_PATH, "utf8");

describe("floatingPoints", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("creates the configured pool of idle nodes inside the anchor", async () => {
    const { nodes, active } = await load();
    expect(VISUAL_CONFIG.HUD_FEEDBACK.FLOATING_POOL_SIZE).toBeGreaterThan(1);
    expect(nodes()).toHaveLength(VISUAL_CONFIG.HUD_FEEDBACK.FLOATING_POOL_SIZE);
    expect(active()).toHaveLength(0);
  });

  it("shows the gain text on an animated node", async () => {
    const { floating, active } = await load();
    floating.show(GAIN);
    expect(active()).toHaveLength(1);
    expect(active()[0]?.dataset.gain).toBe(TEXTS.pointsGain(GAIN));
    expect(active()[0]?.textContent).toBe("");
    expect(TEXTS.pointsGain(GAIN)).toContain(String(GAIN));
  });

  it("runs the animation for the configured duration", async () => {
    const { floating, active } = await load();
    floating.show(GAIN);
    expect(active()[0]?.style.getPropertyValue("--float-s")).toBe(`${VISUAL_CONFIG.HUD_FEEDBACK.FLOATING_S}s`);
  });

  it("uses one node per gain and never grows the pool", async () => {
    const { floating, nodes, active } = await load();
    floating.show(GAIN);
    floating.show(OTHER_GAIN);
    expect(active().map((node) => node.dataset.gain)).toEqual([TEXTS.pointsGain(GAIN), TEXTS.pointsGain(OTHER_GAIN)]);
    for (let index = 0; index < VISUAL_CONFIG.HUD_FEEDBACK.FLOATING_POOL_SIZE * 2; index++) floating.show(GAIN);
    expect(nodes()).toHaveLength(VISUAL_CONFIG.HUD_FEEDBACK.FLOATING_POOL_SIZE);
  });

  it("frees a node and clears its gain when its animation ends", async () => {
    const { floating, active, nodes } = await load();
    floating.show(GAIN);
    const node = active()[0];
    node?.dispatchEvent(new Event("animationend"));
    expect(active()).toHaveLength(0);
    expect(node?.dataset.gain).toBe("");
    expect(nodes()).toHaveLength(VISUAL_CONFIG.HUD_FEEDBACK.FLOATING_POOL_SIZE);
  });

  it("restarts a busy node when every node is in use", async () => {
    const { floating, active } = await load();
    const size = VISUAL_CONFIG.HUD_FEEDBACK.FLOATING_POOL_SIZE;
    for (let index = 0; index < size; index++) floating.show(GAIN);
    floating.show(OTHER_GAIN);
    expect(active()).toHaveLength(size);
    expect(active().some((node) => node.dataset.gain === TEXTS.pointsGain(OTHER_GAIN))).toBe(true);
  });
});

describe("floating points styles", () => {
  const rule = (selector: string): string => new RegExp(`${selector.replace(/\./g, "\\.")}\\s*\\{[^}]*\\}`).exec(styles())?.[0] ?? "";

  it("animates the float with a rise and fade keyframes over the configured duration", () => {
    expect(rule(".hud__float")).toMatch(/animation:[^;]*var\(--float-s\)/);
    expect(rule(".hud__float")).toMatch(/pointer-events:\s*none/);
    expect(styles()).toMatch(/\.hud__float::after\s*\{[^}]*content:\s*attr\(data-gain\)/);
    const keyframes = /@keyframes\s+hud-float[\s\S]*?\}\s*\}/.exec(styles())?.[0] ?? "";
    expect(keyframes).toMatch(/opacity/);
    expect(keyframes).toMatch(/transform:\s*translateY/);
  });
});
