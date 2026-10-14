import type { CollectionBeerDto } from "@/types/dtos/collection/collectionBeerDto";

export interface CollectionDetailDto {
  id: number | null;
  kind: string;
  name: string;
  ownerId: number;
  beers: CollectionBeerDto[];
}
