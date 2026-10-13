import { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";
import { dexDtoToModel } from "@/types/mappers/dex/dexMapper";

const dto = {
  discovered: 42,
  total: 120,
  families: [
    { family: "lager", discovered: 5, total: 9 },
    { family: "unknownFamily", discovered: 1, total: 1 },
    { family: "stout", discovered: 0, total: 0 },
  ],
  beers: [{ beerId: 11, firstCheckinAt: "2026-05-10T08:15:00.000Z", lastCheckinAt: "2026-06-11T09:45:30.000Z" }],
};

describe("dexDtoToModel", () => {
  it("copies the totals and keeps the family order", () => {
    const dex = dexDtoToModel(dto);

    expect(dex.discovered).toBe(42);
    expect(dex.total).toBe(120);
    expect(dex.families.map((item) => item.family)).toEqual([
      BeerFamilyEnum.LAGER,
      BeerFamilyEnum.STOUT,
    ]);
  });

  it("drops the families the client does not know and keeps the counts of the others", () => {
    const dex = dexDtoToModel(dto);

    expect(dex.families).toEqual([
      { family: BeerFamilyEnum.LAGER, discovered: 5, total: 9 },
      { family: BeerFamilyEnum.STOUT, discovered: 0, total: 0 },
    ]);
  });

  it("keeps the check-in dates of each discovered beer as ISO strings", () => {
    const [beer] = dexDtoToModel(dto).beers;

    expect(beer.beerId).toBe(11);
    expect(beer.firstCheckinAt).toBe("2026-05-10T08:15:00.000Z");
    expect(beer.lastCheckinAt).toBe("2026-06-11T09:45:30.000Z");
  });

  it("maps an empty dex to empty lists", () => {
    expect(dexDtoToModel({ discovered: 0, total: 120, families: [], beers: [] })).toEqual({
      discovered: 0,
      total: 120,
      families: [],
      beers: [],
    });
  });
});
