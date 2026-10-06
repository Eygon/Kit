import { readFileSync } from "node:fs";

export {};

const OVERLAY_MODULE = "@/ui/debugOverlay";
const TEXTS_MODULE = "@/ui/texts";
const STYLES_PATH = `${process.cwd()}/src/ui/styles.css`;
const COUNTER_SELECTOR = ".debug-counter";
const FPS = 60;
const DRAW_CALLS = 42;

type DebugOverlay = { update: (fps: number, drawCalls: number) => void };

const load = async () => {
  const module = await import(/* @vite-ignore */ OVERLAY_MODULE);
  const { TEXTS } = await import(/* @vite-ignore */ TEXTS_MODULE);
  const host = document.createElement("div");
  document.body.appendChild(host);
  return { host, TEXTS, create: (search: string): DebugOverlay | null => module.createDebugOverlay(host, search) };
};

describe("debugOverlay", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("creates no counter and returns null without the debug parameter", async () => {
    const { host, create } = await load();
    expect(create("")).toBeNull();
    expect(create("?mode=1")).toBeNull();
    expect(create("?debug=0")).toBeNull();
    expect(host.querySelector(COUNTER_SELECTOR)).toBeNull();
    expect(document.querySelector(COUNTER_SELECTOR)).toBeNull();
  });

  it("creates a counter in the host when the search has debug=1", async () => {
    const { host, create } = await load();
    expect(create("?debug=1")).not.toBeNull();
    expect(host.querySelectorAll(COUNTER_SELECTOR)).toHaveLength(1);
    expect(create("?foo=bar&debug=1")).not.toBeNull();
  });

  it("shows fps and draw calls from the French text", async () => {
    const { host, TEXTS, create } = await load();
    const overlay = create("?debug=1");
    overlay?.update(FPS, DRAW_CALLS);
    const counter = host.querySelector(COUNTER_SELECTOR);
    expect(counter?.textContent).toBe(TEXTS.debugCounter(FPS, DRAW_CALLS));
    expect(counter?.textContent).toContain(String(DRAW_CALLS));
    expect(counter?.textContent).toContain(String(FPS));
  });

  it("writes the DOM only when the shown values change", async () => {
    const { host, create } = await load();
    const overlay = create("?debug=1");
    const counter = host.querySelector(COUNTER_SELECTOR);
    if (!counter) throw new Error("counter missing");
    overlay?.update(FPS, DRAW_CALLS);
    const records: MutationRecord[] = [];
    const observer = new MutationObserver((batch) => records.push(...batch));
    observer.observe(counter, { childList: true, characterData: true, subtree: true, attributes: true });
    overlay?.update(FPS, DRAW_CALLS);
    overlay?.update(FPS + 0.2, DRAW_CALLS);
    records.push(...observer.takeRecords());
    expect(records).toHaveLength(0);
    overlay?.update(FPS - 5, DRAW_CALLS);
    records.push(...observer.takeRecords());
    expect(records.length).toBeGreaterThan(0);
    expect(counter.textContent).toContain(String(FPS - 5));
    records.length = 0;
    overlay?.update(FPS - 5, DRAW_CALLS + 1);
    records.push(...observer.takeRecords());
    expect(records.length).toBeGreaterThan(0);
    expect(counter.textContent).toContain(String(DRAW_CALLS + 1));
    observer.disconnect();
  });

  it("styles the counter as a non interactive fixed overlay", () => {
    const css = readFileSync(STYLES_PATH, "utf8");
    const rule = /\.debug-counter\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(rule).toContain("position: fixed");
    expect(rule).toContain("pointer-events: none");
    expect(rule).toContain("env(safe-area-inset-");
  });
});
