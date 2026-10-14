import type { LevelDto } from "@/modules/social/dtos/level.dto";
import { LEVEL_TITLES } from "@/modules/social/enums/level-title.enum";
import { LEVEL_THRESHOLDS } from "@/modules/social/social.constants";

export const toLevel = (discoveredCount: number): LevelDto => {
  const effectiveCount = Math.max(discoveredCount, 0);
  const level = LEVEL_THRESHOLDS.filter((threshold) => effectiveCount >= threshold).length;
  const nextThreshold = LEVEL_THRESHOLDS[level] ?? null;

  return {
    level,
    title: LEVEL_TITLES[level - 1],
    discoveredCount,
    currentThreshold: LEVEL_THRESHOLDS[level - 1],
    nextThreshold,
    nextTitle: nextThreshold === null ? null : LEVEL_TITLES[level],
  };
};
