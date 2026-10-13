import type { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";
import type { BeerStyle } from "@/types/models/beerStyle/beerStyle";

export interface BeerStyleGroup {
  family: BeerFamilyEnum;
  styles: BeerStyle[];
}
