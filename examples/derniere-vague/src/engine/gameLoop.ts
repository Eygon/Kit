import { GAME_CONFIG } from "@/config/gameConfig";

const STEP_EPSILON_S = 1e-9;

export type LoopCallbacks = {
  update: (stepS: number) => void;
  render: (alpha: number, frameS: number) => void;
};

export type FixedStepper = {
  advance: (frameS: number) => number;
};

export const createFixedStepper = (update: (stepS: number) => void, stepS: number = GAME_CONFIG.FIXED_STEP_S, maxSteps: number = GAME_CONFIG.MAX_STEPS_PER_FRAME): FixedStepper => {
  let accumulator = 0;
  const advance = (frameS: number): number => {
    accumulator = Math.min(accumulator + Math.max(0, frameS), stepS * maxSteps);
    while (accumulator >= stepS - STEP_EPSILON_S) {
      update(stepS);
      accumulator -= stepS;
    }
    return Math.max(0, accumulator) / stepS;
  };
  return { advance };
};

export const startGameLoop = (callbacks: LoopCallbacks): (() => void) => {
  const stepper = createFixedStepper(callbacks.update);
  let last = performance.now();
  let handle = 0;
  const frame = (now: number): void => {
    const frameS = (now - last) / 1000;
    last = now;
    const alpha = stepper.advance(frameS);
    callbacks.render(alpha, frameS);
    handle = requestAnimationFrame(frame);
  };
  handle = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(handle);
};
