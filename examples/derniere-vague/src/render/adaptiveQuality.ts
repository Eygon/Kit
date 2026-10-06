import type * as THREE from "three";
import { GAME_CONFIG } from "@/config/gameConfig";
import { VISUAL_CONFIG } from "@/config/visualConfig";

export type AdaptiveQuality = {
  update: (frameS: number) => void;
  readonly level: number;
};

type QualityStep = { readonly pixelRatio: number; readonly density: number };

const QUALITY = VISUAL_CONFIG.QUALITY;
const MS_PER_S = 1000;
const FULL_DENSITY = 1;
const RATIO_EPSILON = 1e-6;

const buildSteps = (basePixelRatio: number): QualityStep[] => {
  const steps: QualityStep[] = [{ pixelRatio: basePixelRatio, density: FULL_DENSITY }];
  let ratio = basePixelRatio;
  while (ratio - QUALITY.PIXEL_RATIO_STEP > QUALITY.PIXEL_RATIO_FLOOR + RATIO_EPSILON) {
    ratio -= QUALITY.PIXEL_RATIO_STEP;
    steps.push({ pixelRatio: ratio, density: FULL_DENSITY });
  }
  if (ratio > QUALITY.PIXEL_RATIO_FLOOR + RATIO_EPSILON) steps.push({ pixelRatio: QUALITY.PIXEL_RATIO_FLOOR, density: FULL_DENSITY });
  const floorRatio = steps[steps.length - 1]?.pixelRatio ?? basePixelRatio;
  for (const density of QUALITY.DENSITY_STEPS) steps.push({ pixelRatio: floorRatio, density });
  return steps;
};

export const createAdaptiveQuality = (renderer: Pick<THREE.WebGLRenderer, "setPixelRatio">, particles: { setDensity: (factor: number) => void }): AdaptiveQuality => {
  const steps = buildSteps(Math.min(window.devicePixelRatio, GAME_CONFIG.MAX_PIXEL_RATIO));
  let level = 0;
  let windowElapsedS = 0;
  let windowFrames = 0;
  let underBudgetS = 0;

  const apply = (next: number): void => {
    const previous = steps[level];
    const target = steps[next];
    if (!target || !previous) return;
    level = next;
    if (target.pixelRatio !== previous.pixelRatio) renderer.setPixelRatio(target.pixelRatio);
    if (target.density !== previous.density) particles.setDensity(target.density);
  };

  const update: AdaptiveQuality["update"] = (frameS) => {
    windowElapsedS += frameS;
    windowFrames++;
    if (windowElapsedS < QUALITY.WINDOW_S) return;
    const averageMs = (windowElapsedS / windowFrames) * MS_PER_S;
    const spanS = windowElapsedS;
    windowElapsedS = 0;
    windowFrames = 0;
    if (averageMs > QUALITY.FRAME_BUDGET_MS) {
      underBudgetS = 0;
      if (level < steps.length - 1) apply(level + 1);
      return;
    }
    underBudgetS += spanS;
    if (underBudgetS < QUALITY.RECOVERY_S) return;
    underBudgetS = 0;
    if (level > 0) apply(level - 1);
  };

  return {
    update,
    get level() {
      return level;
    },
  };
};
