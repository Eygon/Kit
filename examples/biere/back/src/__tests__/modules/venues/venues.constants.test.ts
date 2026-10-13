import { describe, expect, it } from "vitest";
import * as constants from "@/modules/venues/venues.constants";

describe("venues constants", () => {
  it("bounds names, addresses, cities and descriptions", () => {
    expect({
      name: constants.VENUE_NAME_MAX_LENGTH,
      address: constants.VENUE_ADDRESS_MAX_LENGTH,
      city: constants.VENUE_CITY_MAX_LENGTH,
      description: constants.VENUE_DESCRIPTION_MAX_LENGTH,
    }).toEqual({ name: 80, address: 160, city: 60, description: 300 });
  });

  it("bounds coordinates and the search radius", () => {
    expect({
      latitude: constants.LATITUDE_MAX_DEGREES,
      longitude: constants.LONGITUDE_MAX_DEGREES,
      radius: constants.RADIUS_MAX_KM,
    }).toEqual({ latitude: 90, longitude: 180, radius: 50 });
  });

  it("sets the availability window, the vote threshold and the vote cooldown", () => {
    expect({
      windowDays: constants.AVAILABILITY_WINDOW_DAYS,
      minVotes: constants.AVAILABILITY_MIN_VOTES,
      cooldownHours: constants.VOTE_COOLDOWN_HOURS,
    }).toEqual({ windowDays: 30, minVotes: 2, cooldownHours: 24 });
  });

  it("sets the distance and time units", () => {
    expect({
      earthRadius: constants.EARTH_RADIUS_KM,
      decimals: constants.DISTANCE_DECIMALS,
      dayMs: constants.DAY_MS,
      hourMs: constants.HOUR_MS,
    }).toEqual({ earthRadius: 6371, decimals: 2, dayMs: 86_400_000, hourMs: 3_600_000 });
  });
});
