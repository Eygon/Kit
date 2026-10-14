import type { BeerFacetsDto } from "@/modules/beers/dtos/beer-facets.dto";
import type { CatalogBeerDto } from "@/modules/beers/dtos/catalog-beer.dto";

export interface BeerPageDto {
  readonly items: readonly CatalogBeerDto[];
  readonly total: number;
  readonly page: number;
  readonly size: number;
  readonly facets: BeerFacetsDto;
  readonly isApproximate: boolean;
}
