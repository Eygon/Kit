import type { FacetCountDto } from "@/modules/beers/dtos/facet-count.dto";

export interface CatalogTotalsDto {
  readonly total: number;
  readonly families: readonly FacetCountDto[];
}
