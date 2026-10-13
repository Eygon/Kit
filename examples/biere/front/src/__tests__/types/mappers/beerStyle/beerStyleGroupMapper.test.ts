import { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";
import { beerStyleGroupDtosToModel } from "@/types/mappers/beerStyle/beerStyleGroupMapper";

const trappistStyles = [
  { id: 12, name: "Trappiste Blonde", description: "Une blonde." },
  { id: 13, name: "Trappiste Triple", description: "Une triple." },
];

describe("beerStyleGroupDtosToModel", () => {
  it("maps every group with its family and all the fields of its styles", () => {
    const groups = beerStyleGroupDtosToModel([
      { family: "trappist", styles: trappistStyles },
      { family: "ipa", styles: [] },
    ]);

    expect(groups).toEqual([
      { family: BeerFamilyEnum.TRAPPIST, styles: trappistStyles },
      { family: BeerFamilyEnum.IPA, styles: [] },
    ]);
  });

  it("drops a group of an unknown family and keeps the order of the others", () => {
    const groups = beerStyleGroupDtosToModel([
      { family: "stout", styles: [] },
      { family: "mead", styles: trappistStyles },
      { family: "abbey", styles: [] },
    ]);

    expect(groups.map((group) => group.family)).toEqual([BeerFamilyEnum.STOUT, BeerFamilyEnum.ABBEY]);
  });

  it("returns an empty list for no group", () => {
    expect(beerStyleGroupDtosToModel([])).toEqual([]);
  });
});
