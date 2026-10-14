import { describe, expect, it } from "vitest";
import * as constants from "@/modules/profile/profile.constants";

describe("profile constants", () => {
  it("rounds the averages to the tenth", () => {
    expect(constants.STATS_ROUNDING_FACTOR).toBe(10);
  });

  it("reads the calendar days and months in the Paris time zone", () => {
    expect(constants.PARIS_TIME_ZONE).toBe("Europe/Paris");
  });

  it("lists the last 12 months of check-ins", () => {
    expect(constants.MONTHLY_CHECKINS_MONTHS).toBe(12);
  });
});

describe("badge constants", () => {
  it("sets the thresholds of the badges", () => {
    expect(constants.FIRST_SIP_TARGET).toBe(1);
    expect(constants.EXPLORER_TARGET).toBe(10);
    expect(constants.COLLECTOR_TARGET).toBe(50);
    expect(constants.GLOBETROTTER_TARGET).toBe(5);
    expect(constants.PHOTOGRAPHER_TARGET).toBe(10);
    expect(constants.REGULAR_STREAK_DAYS).toBe(3);
    expect(constants.SENTINEL_TARGET).toBe(10);
    expect(constants.CARTOGRAPHER_TARGET).toBe(1);
  });

  it("prefixes the id of a specialist badge", () => {
    expect(constants.SPECIALIST_ID_PREFIX).toBe("specialist-");
  });
});
