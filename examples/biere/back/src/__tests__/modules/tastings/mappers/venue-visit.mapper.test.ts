import { describe, expect, it } from "vitest";
import { toVenueVisitDto } from "@/modules/tastings/mappers/venue-visit.mapper";

describe("toVenueVisitDto", () => {
  it("turns the raw text columns into numbers and the stored date into an ISO date, leaking no other column", () => {
    const row = { venueId: "4", checkinCount: "2", lastCheckinAt: "2026-10-09 18:30:00.000", extra: "x" };

    expect(toVenueVisitDto(row as never)).toStrictEqual({
      venueId: 4,
      checkinCount: 2,
      lastCheckinAt: "2026-10-09T18:30:00.000Z",
    });
  });

  it("keeps numeric columns as they are", () => {
    expect(toVenueVisitDto({ venueId: 7, checkinCount: 1, lastCheckinAt: "2026-10-02 08:00:00" })).toStrictEqual({
      venueId: 7,
      checkinCount: 1,
      lastCheckinAt: "2026-10-02T08:00:00.000Z",
    });
  });
});
