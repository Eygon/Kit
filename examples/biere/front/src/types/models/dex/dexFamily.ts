import type { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";

export interface DexFamily {
  family: BeerFamilyEnum;
  discovered: number;
  total: number;
}
