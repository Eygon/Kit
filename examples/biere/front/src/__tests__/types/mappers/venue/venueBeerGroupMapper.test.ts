import { AvailabilityStatusEnum } from "@/types/enums/venue/availabilityStatusEnum";
import { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";
import { venueBeersToFamilyGroups } from "@/types/mappers/venue/venueBeerGroupMapper";
import type { VenueBeer } from "@/types/models/venue/venueBeer";

const beer = (beerId: number, family: BeerFamilyEnum | null): VenueBeer => ({
  beerId,
  beerName: `Bière ${beerId}`,
  breweryName: "Brasserie",
  styleName: "Style",
  family,
  status: AvailabilityStatusEnum.CONFIRMED,
  lastConfirmedAt: null,
  recentVoterCount: 0,
  nextVoteAt: null,
  drunk: false,
  checkinCount: 0,
  lastCheckinAt: null,
});

describe("venueBeersToFamilyGroups", () => {
  it("returns no group for no beer", () => {
    expect(venueBeersToFamilyGroups([])).toEqual([]);
  });

  it("groups 3 IPA and 2 Stout in two groups keeping the received order", () => {
    const beers = [
      beer(3, BeerFamilyEnum.IPA),
      beer(1, BeerFamilyEnum.IPA),
      beer(2, BeerFamilyEnum.IPA),
      beer(5, BeerFamilyEnum.STOUT),
      beer(4, BeerFamilyEnum.STOUT),
    ];

    const groups = venueBeersToFamilyGroups(beers);

    expect(groups).toEqual([
      { family: BeerFamilyEnum.IPA, beers: [beers[0], beers[1], beers[2]] },
      { family: BeerFamilyEnum.STOUT, beers: [beers[3], beers[4]] },
    ]);
  });

  it("only merges consecutive beers: a family that comes back opens a new group", () => {
    const beers = [beer(1, BeerFamilyEnum.IPA), beer(2, BeerFamilyEnum.STOUT), beer(3, BeerFamilyEnum.IPA)];

    const groups = venueBeersToFamilyGroups(beers);

    expect(groups.map((group) => [group.family, group.beers.map((item) => item.beerId)])).toEqual([
      [BeerFamilyEnum.IPA, [1]],
      [BeerFamilyEnum.STOUT, [2]],
      [BeerFamilyEnum.IPA, [3]],
    ]);
  });

  it("groups consecutive beers without family together", () => {
    const beers = [beer(1, BeerFamilyEnum.IPA), beer(2, null), beer(3, null)];

    const groups = venueBeersToFamilyGroups(beers);

    expect(groups).toEqual([
      { family: BeerFamilyEnum.IPA, beers: [beers[0]] },
      { family: null, beers: [beers[1], beers[2]] },
    ]);
  });
});
