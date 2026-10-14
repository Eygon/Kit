import { describe, expect, it } from "vitest";
import { toParisDayKey } from "@/common/time/paris-day-key";
import { PARIS_TIME_ZONE } from "@/common/time/time.constants";

describe("PARIS_TIME_ZONE", () => {
  it("reads the calendar days in the Paris time zone", () => {
    expect(PARIS_TIME_ZONE).toBe("Europe/Paris");
  });
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

  it("is independent of the time zone of the server", () => {
    const previous = process.env.TZ;
    process.env.TZ = "Pacific/Auckland";
    try {
      expect(toParisDayKey("2026-10-12T21:30:00.000Z")).toBe("2026-10-12");
      expect(toParisDayKey("2026-10-12T22:30:00.000Z")).toBe("2026-10-13");
    } finally {
      if (previous === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = previous;
      }
    }
  });
});
