import type { CollectionKindEnum } from "@/types/enums/collection/collectionKindEnum";

export interface CollectionSummary {
  id: number | null;
  kind: CollectionKindEnum;
  name: string;
  beerCount: number;
}
