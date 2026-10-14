import type { MyCollectionDto } from "@/types/dtos/collection/myCollectionDto";
import { collectionSummaryDtoToModel } from "@/types/mappers/collection/collectionSummaryMapper";
import type { CollectionSummary } from "@/types/models/collection/collectionSummary";

export type MyCollection = CollectionSummary & Readonly<{ containsBeer: boolean }>;

export const myCollectionDtoToModel = (dto: MyCollectionDto): MyCollection => ({
  ...collectionSummaryDtoToModel(dto),
  containsBeer: dto.containsBeer ?? false,
});
