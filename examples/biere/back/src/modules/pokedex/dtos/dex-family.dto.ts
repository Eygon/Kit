import type { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";

export interface DexFamilyDto {
  readonly family: BeerFamilyEnum;
  readonly discovered: number;
  readonly total: number;
}
