export {};

const QUALITY_MODULE = "@/render/adaptiveQuality";
const VISUAL_MODULE = "@/config/visualConfig";
const BASE_PIXEL_RATIO = 2;
const FAST_FRAME_S = 1 / 64;
const SLOW_FRAME_S = 1 / 16;
const SPIKE_FRAME_S = 0.25;
const EPSILON = 1e-6;

const setDevicePixelRatio = (value: number): void => {
  Object.defineProperty(window, "devicePixelRatio", { value, configurable: true });
};

const mount = async () => {
  setDevicePixelRatio(BASE_PIXEL_RATIO);
  const { createAdaptiveQuality } = await import(/* @vite-ignore */ QUALITY_MODULE);
  const { VISUAL_CONFIG } = await import(/* @vite-ignore */ VISUAL_MODULE);
  const config = VISUAL_CONFIG.QUALITY;
  const renderer = { setPixelRatio: vi.fn() };
  const particles = { setDensity: vi.fn() };
  const quality = createAdaptiveQuality(renderer, particles);
  const windows = (frameS: number, count: number): void => {
    const frames = Math.round((config.WINDOW_S * count) / frameS);
    for (let frame = 0; frame < frames; frame++) quality.update(frameS);
  };
  const recoveryWindows = Math.ceil(config.RECOVERY_S / config.WINDOW_S);
  const lastRatio = (): number | undefined => renderer.setPixelRatio.mock.calls.at(-1)?.[0];
  const pixelSteps = Math.ceil((BASE_PIXEL_RATIO - config.PIXEL_RATIO_FLOOR) / config.PIXEL_RATIO_STEP - EPSILON);
  return { quality, renderer, particles, config, windows, recoveryWindows, lastRatio, pixelSteps };
};

describe("createAdaptiveQuality", () => {
  afterEach(() => {
    setDevicePixelRatio(1);
  });

  it("changes nothing while the average frame time stays under budget", async () => {
    const { quality, renderer, particles, windows } = await mount();
    windows(FAST_FRAME_S, 5);
    expect(quality.level).toBe(0);
    expect(renderer.setPixelRatio).not.toHaveBeenCalled();
    expect(particles.setDensity).not.toHaveBeenCalled();
  });

  it("steps the pixel ratio down one step once the window average exceeds the budget", async () => {
    const { quality, config, lastRatio } = await mount();
    expect(SLOW_FRAME_S * 1000).toBeGreaterThan(config.FRAME_BUDGET_MS);
    const windowFrames = Math.round(config.WINDOW_S / SLOW_FRAME_S);
    for (let frame = 0; frame < windowFrames - 1; frame++) quality.update(SLOW_FRAME_S);
    expect(quality.level).toBe(0);
    quality.update(SLOW_FRAME_S);
    expect(quality.level).toBe(1);
    expect(lastRatio()).toBeCloseTo(BASE_PIXEL_RATIO - config.PIXEL_RATIO_STEP, 6);
  });

  it("ignores a single spike that leaves the window average under budget", async () => {
    const { quality, windows } = await mount();
    quality.update(SPIKE_FRAME_S);
    windows(FAST_FRAME_S, 2);
    expect(quality.level).toBe(0);
  });

  it("reaches the pixel ratio floor before touching particle density, then lowers density step by step", async () => {
    const { quality, renderer, particles, config, windows, lastRatio, pixelSteps } = await mount();
    windows(SLOW_FRAME_S, pixelSteps);
    expect(lastRatio()).toBeCloseTo(config.PIXEL_RATIO_FLOOR, 6);
    expect(quality.level).toBe(pixelSteps);
    expect(particles.setDensity).not.toHaveBeenCalled();
    windows(SLOW_FRAME_S, 1);
    expect(particles.setDensity).toHaveBeenLastCalledWith(config.DENSITY_STEPS[0]);
    windows(SLOW_FRAME_S, config.DENSITY_STEPS.length + 3);
    expect(particles.setDensity).toHaveBeenLastCalledWith(config.DENSITY_STEPS[config.DENSITY_STEPS.length - 1]);
    expect(quality.level).toBe(pixelSteps + config.DENSITY_STEPS.length);
    const pixelCalls = renderer.setPixelRatio.mock.calls.length;
    windows(SLOW_FRAME_S, 3);
    expect(renderer.setPixelRatio.mock.calls.length).toBe(pixelCalls);
    for (const call of renderer.setPixelRatio.mock.calls) expect(call[0]).toBeGreaterThanOrEqual(config.PIXEL_RATIO_FLOOR - EPSILON);
  });

  it("steps back up exactly one level once the recovery window has elapsed under budget", async () => {
    const { quality, config, windows, recoveryWindows, lastRatio } = await mount();
    windows(SLOW_FRAME_S, 2);
    expect(quality.level).toBe(2);
    windows(FAST_FRAME_S, recoveryWindows - 1);
    expect(quality.level).toBe(2);
    windows(FAST_FRAME_S, 1);
    expect(quality.level).toBe(1);
    expect(lastRatio()).toBeCloseTo(BASE_PIXEL_RATIO - config.PIXEL_RATIO_STEP, 6);
  });

  it("restores the particle density first when recovering from the deepest level", async () => {
    const { quality, particles, config, windows, recoveryWindows, pixelSteps } = await mount();
    const deepest = pixelSteps + config.DENSITY_STEPS.length;
    windows(SLOW_FRAME_S, deepest + 2);
    expect(quality.level).toBe(deepest);
    windows(FAST_FRAME_S, recoveryWindows);
    expect(quality.level).toBe(deepest - 1);
    expect(particles.setDensity).toHaveBeenLastCalledWith(config.DENSITY_STEPS[config.DENSITY_STEPS.length - 2] ?? 1);
  });

  it("never recovers above the full quality level", async () => {
    const { quality, renderer, windows, recoveryWindows } = await mount();
    windows(FAST_FRAME_S, recoveryWindows * 3);
    expect(quality.level).toBe(0);
    expect(renderer.setPixelRatio).not.toHaveBeenCalled();
  });
});
