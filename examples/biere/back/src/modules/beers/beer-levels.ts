import { BITTERNESS_LEVEL_IBU_MAX, COLOR_LEVEL_EBC_MAX } from "@/modules/beers/beers.constants";
import type { LevelRangeDto } from "@/modules/beers/dtos/level-range.dto";

const toLevel = (value: number, upperBounds: readonly number[]): number => {
  const index = upperBounds.findIndex((upperBound) => value <= upperBound);
  return index === -1 ? upperBounds.length + 1 : index + 1;
};

export const toBitternessLevel = (ibu: number | null): number | null =>
  ibu === null ? null : toLevel(ibu, BITTERNESS_LEVEL_IBU_MAX);

export const toColorLevel = (ebc: number | null): number | null =>
  ebc === null ? null : toLevel(ebc, COLOR_LEVEL_EBC_MAX);

export const toLevelRange = (min: number, max: number): LevelRangeDto => ({
  min: toLevel(min, COLOR_LEVEL_EBC_MAX),
  max: toLevel(max, COLOR_LEVEL_EBC_MAX),
});
