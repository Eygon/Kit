import type { FacetCountDto } from "@/types/dtos/beer/facetCountDto";

export interface BeerFacetsDto {
  families: FacetCountDto[];
  countries: FacetCountDto[];
  formats: FacetCountDto[];
}
