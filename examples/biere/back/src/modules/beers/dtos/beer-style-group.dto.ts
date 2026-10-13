import type { BeerStyleDto } from "@/modules/beers/dtos/beer-style.dto";
import type { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";

export interface BeerStyleGroupDto {
  readonly family: BeerFamilyEnum;
  readonly styles: readonly BeerStyleDto[];
}
