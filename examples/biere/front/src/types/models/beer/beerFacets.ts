import type { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";
import type { BeerFormatEnum } from "@/types/enums/beer/beerFormatEnum";
import type { FacetCount } from "@/types/models/beer/facetCount";

export interface BeerFacets {
  families: FacetCount<BeerFamilyEnum>[];
  countries: FacetCount[];
  formats: FacetCount<BeerFormatEnum>[];
}
