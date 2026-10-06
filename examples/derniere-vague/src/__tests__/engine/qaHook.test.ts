export {};

const QA_MODULE = "@/engine/qaHook";

const SNAPSHOT = { fps: 58, drawCalls: 91, triangles: 40210, phase: "playing", round: 3, alive: 7 };

describe("installQaHook", () => {
  it("exposes window.__qa returning the snapshot read at call time", async () => {
    const { installQaHook } = await import(/* @vite-ignore */ QA_MODULE);
    const target = {} as Window;
    let current = SNAPSHOT;
    installQaHook(target, () => current);
    const qa = (target as unknown as { __qa: () => unknown }).__qa;
    expect(typeof qa).toBe("function");
    expect(qa()).toEqual(SNAPSHOT);
    current = { ...SNAPSHOT, fps: 30, round: 4, alive: 0, phase: "over" };
    expect(qa()).toEqual({ fps: 30, drawCalls: 91, triangles: 40210, phase: "over", round: 4, alive: 0 });
  });

  it("returns exactly the six QA fields", async () => {
    const { installQaHook } = await import(/* @vite-ignore */ QA_MODULE);
    const target = {} as Window;
    installQaHook(target, () => SNAPSHOT);
    const result = (target as unknown as { __qa: () => Record<string, unknown> }).__qa();
    expect(Object.keys(result).sort()).toEqual(["alive", "drawCalls", "fps", "phase", "round", "triangles"]);
  });
});
