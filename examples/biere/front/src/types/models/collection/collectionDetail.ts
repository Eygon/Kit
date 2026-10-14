import type { CollectionKindEnum } from "@/types/enums/collection/collectionKindEnum";
import type { CollectionBeer } from "@/types/models/collection/collectionBeer";

export interface CollectionDetail {
  id: number | null;
  kind: CollectionKindEnum;
  name: string;
  ownerId: number;
  beers: CollectionBeer[];
}
