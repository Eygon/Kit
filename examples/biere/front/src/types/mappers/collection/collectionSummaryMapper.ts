import type { CollectionSummaryDto } from "@/types/dtos/collection/collectionSummaryDto";
import { CollectionKindEnum, isCollectionKind } from "@/types/enums/collection/collectionKindEnum";
import type { CollectionSummary } from "@/types/models/collection/collectionSummary";

export const collectionSummaryDtoToModel = (dto: CollectionSummaryDto): CollectionSummary => ({
  id: dto.id ?? null,
  kind: isCollectionKind(dto.kind) ? dto.kind : CollectionKindEnum.CUSTOM,
  name: dto.name ?? "",
  beerCount: dto.beerCount ?? 0,
});
