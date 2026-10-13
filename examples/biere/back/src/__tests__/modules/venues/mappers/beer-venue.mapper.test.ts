import { describe, expect, it } from "vitest";
import type { VenueRecordDto } from "@/modules/venues/dtos/venue-record.dto";
import { AvailabilityStatusEnum } from "@/modules/venues/enums/availability-status.enum";
import { VenueTypeEnum } from "@/modules/venues/enums/venue-type.enum";
import { toBeerVenueDto } from "@/modules/venues/mappers/beer-venue.mapper";

const RECORD: VenueRecordDto = {
  id: 7,
  name: "La Fine Mousse",
  type: VenueTypeEnum.BAR,
  city: "Paris",
  address: "6 avenue Jean Aicard, 75011 Paris",
  latitude: 48.8655,
  longitude: 2.3802,
  description: "Un bar.",
};

const LAST_CONFIRMED_AT = new Date("2026-03-10T18:30:00.000Z");

describe("toBeerVenueDto", () => {
  it("lists every field of the contract with the last confirmation as an ISO string", () => {
    expect(
      toBeerVenueDto(
        RECORD,
        { status: AvailabilityStatusEnum.CONFIRMED, lastConfirmedAt: LAST_CONFIRMED_AT, recentVoterCount: 3 },
        12.34,
      ),
    ).toEqual({
      venueId: 7,
      venueName: "La Fine Mousse",
      venueType: VenueTypeEnum.BAR,
      city: "Paris",
      address: "6 avenue Jean Aicard, 75011 Paris",
      latitude: 48.8655,
      longitude: 2.3802,
      status: AvailabilityStatusEnum.CONFIRMED,
      lastConfirmedAt: "2026-03-10T18:30:00.000Z",
      recentVoterCount: 3,
      distanceKm: 12.34,
    });
  });

  it("keeps a missing last confirmation and a missing distance as null", () => {
    const dto = toBeerVenueDto(
      RECORD,
      { status: AvailabilityStatusEnum.UNKNOWN, lastConfirmedAt: null, recentVoterCount: 0 },
      null,
    );

    expect(dto.lastConfirmedAt).toBeNull();
    expect(dto.distanceKm).toBeNull();
    expect(dto.status).toBe(AvailabilityStatusEnum.UNKNOWN);
    expect(dto.recentVoterCount).toBe(0);
  });
});
