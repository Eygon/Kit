import type { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";

export interface CollectionItemRecordDto {
  readonly beerId: number;
  readonly addedAt: string;
}

export interface CollectionBeerDto {
  readonly beerId: number;
  readonly beerName: string;
  readonly styleName: string;
  readonly family: BeerFamilyEnum;
  readonly drunkByMe: boolean;
  readonly addedAt: string;
}
