import type { BeerDto } from "@/modules/beers/dtos/beer.dto";
import type { CatalogTotalsDto } from "@/modules/beers/dtos/catalog-totals.dto";
import { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";
import type { DexBeerDto } from "@/modules/pokedex/dtos/dex-beer.dto";
import type { DexFamilyDto } from "@/modules/pokedex/dtos/dex-family.dto";
import type { DexDto } from "@/modules/pokedex/dtos/dex.dto";
import type { DiscoveryDto } from "@/modules/tastings/dtos/discovery.dto";

const toDexBeerDto = (discovery: DiscoveryDto): DexBeerDto => ({
  beerId: discovery.beerId,
  firstCheckinAt: discovery.firstCheckinAt,
  lastCheckinAt: discovery.lastCheckinAt,
});

const toDexFamilyDto = (
  family: BeerFamilyEnum,
  totalsByFamily: ReadonlyMap<string, number>,
  discoveredBeers: readonly BeerDto[],
): DexFamilyDto => ({
  family,
  discovered: discoveredBeers.filter((beer) => beer.family === family).length,
  total: totalsByFamily.get(family) ?? 0,
});

export const toDexDto = (
  totals: CatalogTotalsDto,
  discoveries: readonly DiscoveryDto[],
  discoveredBeers: readonly BeerDto[],
): DexDto => {
  const totalsByFamily = new Map(totals.families.map((facet) => [facet.value, facet.count]));
  return {
    discovered: discoveries.length,
    total: totals.total,
    families: Object.values(BeerFamilyEnum).map((family) => toDexFamilyDto(family, totalsByFamily, discoveredBeers)),
    beers: discoveries.map(toDexBeerDto),
  };
};
