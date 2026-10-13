import type { FacetCountDto } from "@/types/dtos/beer/facetCountDto";
import type { FacetCount } from "@/types/models/beer/facetCount";

export const facetCountDtosToModel = <TValue extends string>(
  dtos: FacetCountDto[],
  isValue: (value: unknown) => value is TValue,
): FacetCount<TValue>[] =>
  dtos.flatMap((dto) => (isValue(dto.value) ? [{ value: dto.value, count: dto.count }] : []));
