import type { VenueDto } from "@/types/dtos/venue/venueDto";
import { venueDtoToModel } from "@/types/mappers/venue/venueMapper";
import { VenueTypeEnum } from "@/types/enums/venue/venueTypeEnum";
import { AvailabilityStatusEnum } from "@/types/enums/venue/availabilityStatusEnum";

const dto: VenueDto = {
  id: 12,
  name: "Le Trappiste",
  type: "bar",
  city: "Paris",
  address: "1 rue de la Bière",
  latitude: 48.8566,
  longitude: 2.3522,
  description: "Un bar à bières belges.",
  distanceKm: 1.25,
  checkinCount: 3,
  lastCheckinAt: "2026-10-09T23:30:00.000Z",
  status: "maybeGone",
};

describe("venueDtoToModel", () => {
  it("copies every field and narrows type and status to their enums", async () => {

    expect(venueDtoToModel(dto)).toEqual({
      ...dto,
      lastCheckinAt: new Date("2026-10-09T23:30:00.000Z"),
      type: VenueTypeEnum.BAR,
      status: AvailabilityStatusEnum.MAYBE_GONE,
    });
  });

  it("keeps a null distance and an empty city", async () => {

    const venue = venueDtoToModel({ ...dto, distanceKm: null, city: "" });

    expect(venue.distanceKm).toBeNull();
    expect(venue.city).toBe("");
  });

  it("maps an unknown type to null without touching the status", async () => {

    const venue = venueDtoToModel({ ...dto, type: "pub", status: "gone" });

    expect(venue.type).toBeNull();
    expect(venue.status).toBe(AvailabilityStatusEnum.GONE);
  });

  it("maps an unknown status to UNKNOWN without touching the type", async () => {

    const venue = venueDtoToModel({ ...dto, type: "shop", status: "available" });

    expect(venue.status).toBe(AvailabilityStatusEnum.UNKNOWN);
    expect(venue.type).toBe(VenueTypeEnum.SHOP);
  });

  it("maps the last check-in to a Date at the same instant", () => {
    const venue = venueDtoToModel(dto);

    expect(venue.lastCheckinAt).toBeInstanceOf(Date);
    expect(venue.lastCheckinAt?.toISOString()).toBe("2026-10-09T23:30:00.000Z");
    expect(venue.checkinCount).toBe(3);
  });

  it("keeps a zero count and a null last check-in for a never-visited venue", () => {
    const venue = venueDtoToModel({ ...dto, checkinCount: 0, lastCheckinAt: null });

    expect(venue.checkinCount).toBe(0);
    expect(venue.lastCheckinAt).toBeNull();
  });
});
