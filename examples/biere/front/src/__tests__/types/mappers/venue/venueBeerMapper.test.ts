import { venueBeerDtoToModel } from "@/types/mappers/venue/venueBeerMapper";
import type { VenueBeerDto } from "@/types/dtos/venue/venueBeerDto";
import { AvailabilityStatusEnum } from "@/types/enums/venue/availabilityStatusEnum";
import { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";

const dto: VenueBeerDto = {
  beerId: 7,
  beerName: "Houblon Chouffe",
  breweryName: "Chouffe",
  styleName: "Double IPA",
  family: "ipa",
  status: "maybeGone",
  lastConfirmedAt: "2026-10-01T10:00:00.000Z",
  recentVoterCount: 3,
  nextVoteAt: "2026-10-02T10:00:00.000Z",
  drunk: true,
  checkinCount: 3,
  lastCheckinAt: "2026-10-12T12:00:00.000Z",
};

describe("venueBeerDtoToModel", () => {
  it("keeps a beer never tasted as not drunk, with a count of 0 and no last checkin date", () => {
    const model = venueBeerDtoToModel({ ...dto, drunk: false, checkinCount: 0, lastCheckinAt: null });

    expect(model.drunk).toBe(false);
    expect(model.checkinCount).toBe(0);
    expect(model.lastCheckinAt).toBeNull();
  });

  it("keeps a drunk beer without a known date as drunk with a null last checkin date", () => {
    const model = venueBeerDtoToModel({ ...dto, drunk: true, checkinCount: 1, lastCheckinAt: null });

    expect(model.drunk).toBe(true);
    expect(model.checkinCount).toBe(1);
    expect(model.lastCheckinAt).toBeNull();
  });

  it("copies every field, narrows family and status to their enums and turns the two dates into Date", () => {
    expect(venueBeerDtoToModel(dto)).toEqual({
      beerId: 7,
      beerName: "Houblon Chouffe",
      breweryName: "Chouffe",
      styleName: "Double IPA",
      family: BeerFamilyEnum.IPA,
      status: AvailabilityStatusEnum.MAYBE_GONE,
      lastConfirmedAt: new Date("2026-10-01T10:00:00.000Z"),
      recentVoterCount: 3,
      nextVoteAt: new Date("2026-10-02T10:00:00.000Z"),
      drunk: true,
      checkinCount: 3,
      lastCheckinAt: new Date("2026-10-12T12:00:00.000Z"),
    });
  });

  it("keeps null dates null", () => {
    const model = venueBeerDtoToModel({ ...dto, lastConfirmedAt: null, nextVoteAt: null });

    expect(model.lastConfirmedAt).toBeNull();
    expect(model.nextVoteAt).toBeNull();
  });

  it("maps an unknown family to null and an unknown status to unknown", () => {
    const model = venueBeerDtoToModel({ ...dto, family: "mead", status: "available" });

    expect(model.family).toBeNull();
    expect(model.status).toBe(AvailabilityStatusEnum.UNKNOWN);
  });
});
