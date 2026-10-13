import type { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";
import type { VenueBeer } from "@/types/models/venue/venueBeer";

export interface VenueBeerGroup {
  family: BeerFamilyEnum | null;
  beers: VenueBeer[];
}
