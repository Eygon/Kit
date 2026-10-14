import type { BeerDto } from "@/modules/beers/dtos/beer.dto";
import type { CollectionBeerDto, CollectionItemRecordDto } from "@/modules/collections/dtos/collection-beer.dto";
import type { CollectionDetailDto } from "@/modules/collections/dtos/collection-detail.dto";
import type { CollectionSummaryDto } from "@/modules/collections/dtos/collection-summary.dto";
import type { SaveCollectionDto } from "@/modules/collections/dtos/save-collection.dto";
import type { CollectionItem } from "@/modules/collections/entities/collection-item.entity";
import type { Collection } from "@/modules/collections/entities/collection.entity";
import { CollectionKindEnum } from "@/modules/collections/enums/collection-kind.enum";

export const toCollectionSummaryDto = (collection: Collection, beerCount: number): CollectionSummaryDto => ({
  id: collection.id,
  kind: CollectionKindEnum.CUSTOM,
  name: collection.name,
  beerCount,
});

export const toNewCollection = (userId: number, dto: SaveCollectionDto): Pick<Collection, "userId" | "name"> => ({
  userId,
  name: dto.name,
});

export const toCollectionItemRecordDto = (entity: CollectionItem): CollectionItemRecordDto => ({
  beerId: entity.beerId,
  addedAt: entity.addedAt.toISOString(),
});

export const toCollectionBeerDto = (item: CollectionItemRecordDto, beer: BeerDto, drunkByMe: boolean): CollectionBeerDto => ({
  beerId: beer.id,
  beerName: beer.name,
  styleName: beer.styleName,
  family: beer.family,
  drunkByMe,
  addedAt: item.addedAt,
});

export const toCollectionDetailDto = (
  collection: CollectionSummaryDto,
  ownerId: number,
  beers: readonly CollectionBeerDto[],
): CollectionDetailDto => ({
  id: collection.id,
  kind: collection.kind,
  name: collection.name,
  ownerId,
  beers,
});
