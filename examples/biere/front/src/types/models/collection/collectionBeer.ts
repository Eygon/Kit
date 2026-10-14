import type { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";

export interface CollectionBeer {
  beerId: number;
  beerName: string;
  styleName: string;
  family: BeerFamilyEnum | null;
  drunkByMe: boolean;
  addedAt: Date | null;
}
