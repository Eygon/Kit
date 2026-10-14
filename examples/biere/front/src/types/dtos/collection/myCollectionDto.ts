import type { CollectionSummaryDto } from "@/types/dtos/collection/collectionSummaryDto";

export interface MyCollectionDto extends CollectionSummaryDto {
  containsBeer: boolean;
}
