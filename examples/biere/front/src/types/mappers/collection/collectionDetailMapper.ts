import type { CollectionDetailDto } from "@/types/dtos/collection/collectionDetailDto";
import { CollectionKindEnum, isCollectionKind } from "@/types/enums/collection/collectionKindEnum";
import { collectionBeerDtoToModel } from "@/types/mappers/collection/collectionBeerMapper";
import type { CollectionDetail } from "@/types/models/collection/collectionDetail";

export const collectionDetailDtoToModel = (dto: CollectionDetailDto): CollectionDetail => ({
  id: dto.id ?? null,
  kind: isCollectionKind(dto.kind) ? dto.kind : CollectionKindEnum.CUSTOM,
  name: dto.name ?? "",
  ownerId: dto.ownerId ?? 0,
  beers: (dto.beers ?? []).map(collectionBeerDtoToModel),
});
