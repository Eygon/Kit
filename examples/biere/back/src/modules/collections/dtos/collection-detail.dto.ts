import type { CollectionBeerDto } from "@/modules/collections/dtos/collection-beer.dto";
import type { CollectionKindEnum } from "@/modules/collections/enums/collection-kind.enum";

export interface CollectionDetailDto {
  readonly id: number | null;
  readonly kind: CollectionKindEnum;
  readonly name: string;
  readonly ownerId: number;
  readonly beers: readonly CollectionBeerDto[];
}
