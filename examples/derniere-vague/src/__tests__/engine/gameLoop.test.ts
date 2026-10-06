import { createFixedStepper } from "@/engine/gameLoop";

describe("createFixedStepper", () => {
  it("runs one update per fixed step and returns the interpolation alpha", () => {
    const steps: number[] = [];
    const stepper = createFixedStepper((s) => steps.push(s), 0.01, 5);
    const alpha = stepper.advance(0.025);
    expect(steps).toHaveLength(2);
    expect(alpha).toBeCloseTo(0.5);
  });
  it("caps the catch-up after a long stall", () => {
    let count = 0;
    const stepper = createFixedStepper(() => count++, 0.01, 5);
    stepper.advance(10);
    expect(count).toBe(5);
  });
});
