export {};

const INPUT_MODULE = "@/logic/input/inputState";
const LATCH_FLAGS = ["fire", "knife", "interact"] as const;

const load = async () => {
  const inputModule = await import(/* @vite-ignore */ INPUT_MODULE);
  return inputModule;
};

describe("inputState latches", () => {
  it("starts with no latched press", async () => {
    const { createInputState } = await load();
    expect(createInputState().pressed).toEqual({ fire: false, knife: false, interact: false });
  });

  it("latches one flag without touching the held flags or the other latches", async () => {
    const { createInputState, latchPress } = await load();
    const input = createInputState();
    latchPress(input, "knife");
    expect(input.pressed).toEqual({ fire: false, knife: true, interact: false });
    expect(input.knife).toBe(false);
  });

  it("merges a held flag, a latched press or both into the held output", async () => {
    const { createInputState, latchPress, mergeLatches } = await load();
    for (const flag of LATCH_FLAGS) {
      const input = createInputState();
      const out = createInputState();
      mergeLatches(input, out);
      expect(out[flag]).toBe(false);
      latchPress(input, flag);
      mergeLatches(input, out);
      expect(out[flag]).toBe(true);
      input[flag] = true;
      mergeLatches(input, out);
      expect(out[flag]).toBe(true);
      input.pressed[flag] = false;
      mergeLatches(input, out);
      expect(out[flag]).toBe(true);
      input[flag] = false;
      mergeLatches(input, out);
      expect(out[flag]).toBe(false);
    }
  });

  it("copies the other fields into the output and leaves the source latches alone", async () => {
    const { createInputState, latchPress, mergeLatches } = await load();
    const input = createInputState();
    const out = createInputState();
    input.move.x = 0.5;
    input.move.y = -1;
    input.look.dx = 4;
    input.look.dy = -2;
    input.aim = true;
    input.reload = true;
    input.swap = true;
    latchPress(input, "fire");
    mergeLatches(input, out);
    expect(out.move).toEqual({ x: 0.5, y: -1 });
    expect(out.look).toEqual({ dx: 4, dy: -2 });
    expect([out.aim, out.reload, out.swap]).toEqual([true, true, true]);
    expect(input.pressed.fire).toBe(true);
    expect(out.move).not.toBe(input.move);
  });

  it("clears every latch and keeps the held flags", async () => {
    const { createInputState, latchPress, clearLatches } = await load();
    const input = createInputState();
    input.fire = true;
    for (const flag of LATCH_FLAGS) latchPress(input, flag);
    clearLatches(input);
    expect(input.pressed).toEqual({ fire: false, knife: false, interact: false });
    expect(input.fire).toBe(true);
  });
});
