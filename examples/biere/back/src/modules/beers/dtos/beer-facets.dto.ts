import type { FacetCountDto } from "@/modules/beers/dtos/facet-count.dto";

export interface BeerFacetsDto {
  readonly families: readonly FacetCountDto[];
  readonly countries: readonly FacetCountDto[];
  readonly formats: readonly FacetCountDto[];
}
