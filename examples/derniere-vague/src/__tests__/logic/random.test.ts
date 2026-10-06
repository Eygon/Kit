import { createRandom } from "@/logic/random";

describe("createRandom", () => {
  it("replays the same sequence for the same seed", () => {
    const a = createRandom(42);
    const b = createRandom(42);
    expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()]);
  });
  it("keeps int within bounds and pick within the list", () => {
    const r = createRandom(7);
    for (let i = 0; i < 500; i++) {
      const n = r.int(3, 9);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThan(9);
    }
    expect(["a", "b"]).toContain(r.pick(["a", "b"]));
    expect(() => r.pick([])).toThrow();
  });
});
