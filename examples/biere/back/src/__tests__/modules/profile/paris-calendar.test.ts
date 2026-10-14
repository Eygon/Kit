import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { toParisDayKey as commonToParisDayKey } from "@/common/time/paris-day-key";
import {
  addDaysToDayKey,
  computeDayStreaks,
  findStreakCompletionDayKey,
  lastTwelveMonthKeys,
  toParisDayKey,
  toParisMonthKey,
} from "@/modules/profile/paris-calendar";

const SERVER_TIME_ZONE = "Europe/Paris";
let previousTimeZone: string | undefined;

beforeAll(() => {
  previousTimeZone = process.env.TZ;
  process.env.TZ = SERVER_TIME_ZONE;
});

afterAll(() => {
  if (previousTimeZone === undefined) {
    delete process.env.TZ;
  } else {
    process.env.TZ = previousTimeZone;
  }
});

describe("toParisDayKey", () => {
  it("puts 23:30 and 00:30 Paris on two consecutive days", () => {
    expect(toParisDayKey("2026-03-14T22:30:00.000Z")).toBe("2026-03-14");
    expect(toParisDayKey("2026-03-14T23:30:00.000Z")).toBe("2026-03-15");
  });

  it("follows the Paris day on the spring clock change night without a gap", () => {
    expect(toParisDayKey("2026-03-28T22:59:00.000Z")).toBe("2026-03-28");
    expect(toParisDayKey("2026-03-28T23:30:00.000Z")).toBe("2026-03-29");
    expect(toParisDayKey("2026-03-29T21:30:00.000Z")).toBe("2026-03-29");
    expect(toParisDayKey("2026-03-29T22:30:00.000Z")).toBe("2026-03-30");
  });

  it("follows the Paris day on the autumn clock change night without a double", () => {
    expect(toParisDayKey("2026-10-24T21:59:00.000Z")).toBe("2026-10-24");
    expect(toParisDayKey("2026-10-24T22:30:00.000Z")).toBe("2026-10-25");
    expect(toParisDayKey("2026-10-25T22:30:00.000Z")).toBe("2026-10-25");
    expect(toParisDayKey("2026-10-25T23:30:00.000Z")).toBe("2026-10-26");
  });
});

describe("toParisDayKey of the common time module", () => {
  it("is the very function paris-calendar re-exports", () => {
    expect(toParisDayKey).toBe(commonToParisDayKey);
  });
});

describe("toParisMonthKey", () => {
  it("keeps the last evening of a month in that month of Paris", () => {
    expect(toParisMonthKey("2026-01-31T22:30:00.000Z")).toBe("2026-01");
    expect(toParisMonthKey("2026-04-30T21:30:00.000Z")).toBe("2026-04");
  });

  it("moves to the next month of Paris when UTC is still on the previous month", () => {
    expect(toParisMonthKey("2026-01-31T23:30:00.000Z")).toBe("2026-02");
    expect(toParisMonthKey("2026-04-30T22:30:00.000Z")).toBe("2026-05");
  });

  it("moves to the next year at the end of December", () => {
    expect(toParisMonthKey("2025-12-31T23:30:00.000Z")).toBe("2026-01");
  });
});

describe("addDaysToDayKey", () => {
  it("adds a day across a month end and a year end", () => {
    expect(addDaysToDayKey("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDaysToDayKey("2025-12-31", 1)).toBe("2026-01-01");
  });

  it("subtracts days across a month start", () => {
    expect(addDaysToDayKey("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDaysToDayKey("2026-03-10", -2)).toBe("2026-03-08");
  });

  it("steps one calendar day on the clock change dates", () => {
    expect(addDaysToDayKey("2026-03-28", 1)).toBe("2026-03-29");
    expect(addDaysToDayKey("2026-03-29", 1)).toBe("2026-03-30");
    expect(addDaysToDayKey("2026-10-24", 1)).toBe("2026-10-25");
    expect(addDaysToDayKey("2026-10-25", 1)).toBe("2026-10-26");
  });

  it("keeps the day key with zero days and handles a leap day", () => {
    expect(addDaysToDayKey("2026-03-14", 0)).toBe("2026-03-14");
    expect(addDaysToDayKey("2028-02-28", 1)).toBe("2028-02-29");
  });
});

describe("computeDayStreaks", () => {
  it("answers 0 and 0 without any day", () => {
    expect(computeDayStreaks([], "2026-03-14")).toStrictEqual({ current: 0, best: 0 });
  });

  it("counts a streak of 3 days ending today", () => {
    expect(computeDayStreaks(["2026-03-12", "2026-03-13", "2026-03-14"], "2026-03-14")).toStrictEqual({
      current: 3,
      best: 3,
    });
  });

  it("still counts a streak whose last day is yesterday", () => {
    expect(computeDayStreaks(["2026-03-12", "2026-03-13"], "2026-03-14")).toStrictEqual({ current: 2, best: 2 });
  });

  it("answers a current streak of 0 when the last day is the day before yesterday", () => {
    expect(computeDayStreaks(["2026-03-11", "2026-03-12"], "2026-03-14")).toStrictEqual({ current: 0, best: 2 });
  });

  it("counts several check-ins of the same day as one day", () => {
    expect(computeDayStreaks(["2026-03-14", "2026-03-14", "2026-03-14"], "2026-03-14")).toStrictEqual({
      current: 1,
      best: 1,
    });
  });

  it("separates the best past streak of 5 from the current streak of 2", () => {
    const days = ["2026-02-01", "2026-02-02", "2026-02-03", "2026-02-04", "2026-02-05", "2026-03-13", "2026-03-14"];

    expect(computeDayStreaks(days, "2026-03-14")).toStrictEqual({ current: 2, best: 5 });
  });

  it("sorts the days before counting", () => {
    expect(computeDayStreaks(["2026-03-14", "2026-03-12", "2026-03-13", "2026-01-01"], "2026-03-14")).toStrictEqual({
      current: 3,
      best: 3,
    });
  });

  it("does not link two streaks separated by one empty day", () => {
    expect(computeDayStreaks(["2026-03-10", "2026-03-12", "2026-03-13"], "2026-03-13")).toStrictEqual({
      current: 2,
      best: 2,
    });
  });

  it("links the days across the spring clock change without a gap", () => {
    expect(computeDayStreaks(["2026-03-28", "2026-03-29", "2026-03-30"], "2026-03-30")).toStrictEqual({
      current: 3,
      best: 3,
    });
  });

  it("links the days across the autumn clock change without a double", () => {
    expect(computeDayStreaks(["2026-10-24", "2026-10-25", "2026-10-26"], "2026-10-26")).toStrictEqual({
      current: 3,
      best: 3,
    });
  });

  it("links 23:30 and 00:30 Paris as two consecutive days", () => {
    const days = ["2026-03-14T22:30:00.000Z", "2026-03-14T23:30:00.000Z"].map(toParisDayKey);

    expect(computeDayStreaks(days, "2026-03-15")).toStrictEqual({ current: 2, best: 2 });
  });
});

describe("lastTwelveMonthKeys", () => {
  it("lists 12 months from the oldest to the current month", () => {
    expect(lastTwelveMonthKeys(new Date("2026-10-13T12:00:00.000Z"))).toStrictEqual([
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
    ]);
  });

  it("covers two years from January", () => {
    expect(lastTwelveMonthKeys(new Date("2026-01-15T12:00:00.000Z"))).toStrictEqual([
      "2025-02",
      "2025-03",
      "2025-04",
      "2025-05",
      "2025-06",
      "2025-07",
      "2025-08",
      "2025-09",
      "2025-10",
      "2025-11",
      "2025-12",
      "2026-01",
    ]);
  });

  it("takes the current month in Paris when UTC is still on the previous month", () => {
    const months = lastTwelveMonthKeys(new Date("2026-04-30T22:30:00.000Z"));

    expect(months).toHaveLength(12);
    expect(months[0]).toBe("2025-06");
    expect(months[11]).toBe("2026-05");
  });
});

describe("findStreakCompletionDayKey", () => {
  it("answers null while the longest run of consecutive days is shorter than the length", () => {
    expect(findStreakCompletionDayKey(["2026-03-12", "2026-03-13"], 3)).toBeNull();
  });

  it("answers null without any day", () => {
    expect(findStreakCompletionDayKey([], 3)).toBeNull();
  });

  it("answers the third consecutive day", () => {
    expect(findStreakCompletionDayKey(["2026-03-12", "2026-03-13", "2026-03-14"], 3)).toBe("2026-03-14");
  });

  it("answers the third day of the second run after a gap", () => {
    const days = ["2026-03-01", "2026-03-02", "2026-03-05", "2026-03-06", "2026-03-07", "2026-03-08"];

    expect(findStreakCompletionDayKey(days, 3)).toBe("2026-03-07");
  });

  it("ignores the duplicate days", () => {
    expect(findStreakCompletionDayKey(["2026-03-12", "2026-03-12", "2026-03-13", "2026-03-13"], 3)).toBeNull();
    expect(findStreakCompletionDayKey(["2026-03-12", "2026-03-13", "2026-03-13", "2026-03-14"], 3)).toBe("2026-03-14");
  });

  it("sorts the days before looking for the run", () => {
    expect(findStreakCompletionDayKey(["2026-03-14", "2026-03-12", "2026-03-13"], 3)).toBe("2026-03-14");
  });

  it("answers the first completion when the run goes on beyond the length", () => {
    expect(findStreakCompletionDayKey(["2026-03-10", "2026-03-11", "2026-03-12", "2026-03-13", "2026-03-14"], 3)).toBe("2026-03-12");
  });

  it("links the days across the spring clock change", () => {
    expect(findStreakCompletionDayKey(["2026-03-28", "2026-03-29", "2026-03-30"], 3)).toBe("2026-03-30");
  });
});
