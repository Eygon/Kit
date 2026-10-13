import type { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";
import type { BeerFormatEnum } from "@/modules/beers/enums/beer-format.enum";

export interface BeerFilters {
  readonly family?: BeerFamilyEnum;
  readonly styleIds?: readonly number[];
  readonly countries?: readonly string[];
  readonly formats?: readonly BeerFormatEnum[];
  readonly abvMin?: number;
  readonly abvMax?: number;
  readonly beerIds?: readonly number[];
  readonly excludedBeerIds?: readonly number[];
}
