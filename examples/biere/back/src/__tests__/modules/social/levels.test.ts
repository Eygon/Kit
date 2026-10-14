import { describe, expect, it } from "vitest";
import { LevelTitleEnum, LEVEL_TITLES } from "@/modules/social/enums/level-title.enum";
import { toLevel } from "@/modules/social/levels";
import * as constants from "@/modules/social/social.constants";

describe("toLevel", () => {
  it.each([
    [0, 1, "curious"],
    [4, 1, "curious"],
    [5, 2, "taster"],
    [14, 2, "taster"],
    [15, 3, "hopHead"],
    [29, 3, "hopHead"],
    [30, 4, "finePalate"],
    [59, 4, "finePalate"],
    [60, 5, "masterBrewer"],
    [99, 5, "masterBrewer"],
    [100, 6, "foamLegend"],
    [120, 6, "foamLegend"],
  ])("maps %i discoveries to level %i (%s)", (discoveredCount, level, title) => {
    const result = toLevel(discoveredCount);

    expect(result.level).toBe(level);
    expect(result.title).toBe(title);
    expect(result.discoveredCount).toBe(discoveredCount);
  });

  it("gives the thresholds and next title for 12 discoveries", () => {
    expect(toLevel(12)).toEqual({
      level: 2,
      title: "taster",
      discoveredCount: 12,
      currentThreshold: 5,
      nextThreshold: 15,
      nextTitle: "hopHead",
    });
  });

  it("gives the exact boundary thresholds at 5 and 15", () => {
    expect(toLevel(5)).toEqual({
      level: 2,
      title: "taster",
      discoveredCount: 5,
      currentThreshold: 5,
      nextThreshold: 15,
      nextTitle: "hopHead",
    });
    expect(toLevel(4)).toEqual({
      level: 1,
      title: "curious",
      discoveredCount: 4,
      currentThreshold: 0,
      nextThreshold: 5,
      nextTitle: "taster",
    });
  });

  it.each([100, 120])("has no next threshold nor next title at %i discoveries", (discoveredCount) => {
    expect(toLevel(discoveredCount)).toEqual({
      level: 6,
      title: "foamLegend",
      discoveredCount,
      currentThreshold: 100,
      nextThreshold: null,
      nextTitle: null,
    });
  });

  it("treats a negative count as 0 and copies it", () => {
    expect(toLevel(-3)).toEqual({
      level: 1,
      title: "curious",
      discoveredCount: -3,
      currentThreshold: 0,
      nextThreshold: 5,
      nextTitle: "taster",
    });
  });
});

describe("social constants", () => {
  it("exposes the level thresholds and the feed page size", () => {
    expect(constants.LEVEL_THRESHOLDS).toEqual([0, 5, 15, 30, 60, 100]);
    expect(constants.FEED_PAGE_SIZE).toBe(20);
  });

  it("orders the level titles like the thresholds", () => {
    expect(LEVEL_TITLES).toEqual(["curious", "taster", "hopHead", "finePalate", "masterBrewer", "foamLegend"]);
    expect(LevelTitleEnum.HOP_HEAD).toBe("hopHead");
    expect(LevelTitleEnum.FINE_PALATE).toBe("finePalate");
    expect(LevelTitleEnum.MASTER_BREWER).toBe("masterBrewer");
    expect(LevelTitleEnum.FOAM_LEGEND).toBe("foamLegend");
  });
});
