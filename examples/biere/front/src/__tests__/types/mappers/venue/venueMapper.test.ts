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
  status: "maybeGone",
};

describe("venueDtoToModel", () => {
  it("copies every field and narrows type and status to their enums", async () => {

    expect(venueDtoToModel(dto)).toEqual({
      ...dto,
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
});
