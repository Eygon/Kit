import { describe, expect, it } from "vitest";
import type { BeerDto } from "@/modules/beers/dtos/beer.dto";
import { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";
import { toDexDto } from "@/modules/pokedex/mappers/dex.mapper";
import type { DiscoveryDto } from "@/modules/tastings/dtos/discovery.dto";

const buildBeer = (id: number, family: BeerFamilyEnum): BeerDto => ({
  id,
  name: `Beer ${id}`,
  breweryName: "Brewery",
  country: "BE",
  styleId: 1,
  styleName: "Style",
  family,
  abv: 6,
  aromas: [],
  formats: [],
  description: "Description.",
});

const DUVEL_DISCOVERY: DiscoveryDto = { beerId: 5, firstCheckinAt: "2025-10-05T18:00:00.000Z", lastCheckinAt: "2025-10-05T18:00:00.000Z" };
const ORVAL_DISCOVERY: DiscoveryDto = { beerId: 12, firstCheckinAt: "2025-10-01T18:00:00.000Z", lastCheckinAt: "2025-10-10T18:00:00.000Z" };

describe("toDexDto", () => {
  it("lists the 18 families in the enum order with a total of 0 for a family absent from the totals", () => {
    const dex = toDexDto({ total: 15, families: [{ value: "trappist", count: 11 }, { value: "lager", count: 4 }] }, [], []);

    expect(dex.families.map((family) => family.family)).toStrictEqual(Object.values(BeerFamilyEnum));
    expect(dex.families).toHaveLength(18);
    expect(dex.families.find((family) => family.family === BeerFamilyEnum.TRAPPIST)).toStrictEqual({
      family: BeerFamilyEnum.TRAPPIST,
      discovered: 0,
      total: 11,
    });
    expect(dex.families.find((family) => family.family === BeerFamilyEnum.LAGER)).toStrictEqual({
      family: BeerFamilyEnum.LAGER,
      discovered: 0,
      total: 4,
    });
    expect(dex.families.find((family) => family.family === BeerFamilyEnum.STOUT)).toStrictEqual({
      family: BeerFamilyEnum.STOUT,
      discovered: 0,
      total: 0,
    });
  });

  it("counts the discovered beers of each family and the distinct discoveries overall", () => {
    const dex = toDexDto(
      { total: 20, families: [{ value: "trappist", count: 11 }, { value: "belgianStrong", count: 9 }] },
      [DUVEL_DISCOVERY, ORVAL_DISCOVERY],
      [buildBeer(5, BeerFamilyEnum.BELGIAN_STRONG), buildBeer(12, BeerFamilyEnum.TRAPPIST)],
    );

    expect(dex.discovered).toBe(2);
    expect(dex.total).toBe(20);
    expect(dex.families.filter((family) => family.discovered > 0)).toStrictEqual([
      { family: BeerFamilyEnum.TRAPPIST, discovered: 1, total: 11 },
      { family: BeerFamilyEnum.BELGIAN_STRONG, discovered: 1, total: 9 },
    ]);
  });

  it("keeps the discoveries in the order received, with exactly the three date fields", () => {
    const dex = toDexDto(
      { total: 20, families: [] },
      [DUVEL_DISCOVERY, ORVAL_DISCOVERY],
      [buildBeer(12, BeerFamilyEnum.TRAPPIST), buildBeer(5, BeerFamilyEnum.BELGIAN_STRONG)],
    );

    expect(dex.beers).toStrictEqual([DUVEL_DISCOVERY, ORVAL_DISCOVERY]);
  });

  it("answers no discovery and 0 for every family when nothing was drunk", () => {
    const dex = toDexDto({ total: 120, families: [{ value: "trappist", count: 11 }] }, [], []);

    expect(dex.discovered).toBe(0);
    expect(dex.total).toBe(120);
    expect(dex.beers).toStrictEqual([]);
    expect(dex.families.every((family) => family.discovered === 0)).toBe(true);
  });
});
