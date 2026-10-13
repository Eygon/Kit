import type { FacetCountDto } from "@/modules/beers/dtos/facet-count.dto";

export const toFacetCountDto = (row: { value: string; count: number | string }): FacetCountDto => ({
  value: row.value,
  count: Number(row.count),
});
