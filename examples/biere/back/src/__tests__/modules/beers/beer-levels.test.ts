import { describe, expect, it } from "vitest";
import { toBitternessLevel, toColorLevel, toLevelRange } from "@/modules/beers/beer-levels";
import { BITTERNESS_LEVEL_IBU_MAX, COLOR_LEVEL_EBC_MAX } from "@/modules/beers/beers.constants";

describe("toBitternessLevel", () => {
  it.each([
    [0, 1],
    [15, 1],
    [16, 2],
    [25, 2],
    [26, 3],
    [40, 3],
    [41, 4],
    [60, 4],
    [61, 5],
    [120, 5],
  ])("maps %s IBU to level %s", (ibu, level) => {
    expect(toBitternessLevel(ibu)).toBe(level);
  });

  it("answers null without IBU", () => {
    expect(toBitternessLevel(null)).toBeNull();
  });
});

describe("toColorLevel", () => {
  it.each([
    [2, 1],
    [8, 1],
    [9, 2],
    [16, 2],
    [17, 3],
    [33, 3],
    [34, 4],
    [60, 4],
    [61, 5],
    [100, 5],
  ])("maps %s EBC to level %s", (ebc, level) => {
    expect(toColorLevel(ebc)).toBe(level);
  });

  it("answers null without EBC", () => {
    expect(toColorLevel(null)).toBeNull();
  });
});

describe("toLevelRange", () => {
  it.each([
    [25, 45, { min: 3, max: 4 }],
    [4, 8, { min: 1, max: 1 }],
  ])("maps the EBC range %s-%s to %j", (min, max, range) => {
    expect(toLevelRange(min, max)).toEqual(range);
  });
});

describe("level thresholds", () => {
  it("exposes the inclusive upper bounds of the first four levels", () => {
    expect(BITTERNESS_LEVEL_IBU_MAX).toEqual([15, 25, 40, 60]);
    expect(COLOR_LEVEL_EBC_MAX).toEqual([8, 16, 33, 60]);
  });
});
