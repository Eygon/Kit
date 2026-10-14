import type { CollectionKindEnum } from "@/modules/collections/enums/collection-kind.enum";

export interface CollectionSummaryDto {
  readonly id: number | null;
  readonly kind: CollectionKindEnum;
  readonly name: string;
  readonly beerCount: number;
}
