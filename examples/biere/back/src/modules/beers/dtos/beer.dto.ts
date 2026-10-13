import type { BeerAromaEnum } from "@/modules/beers/enums/beer-aroma.enum";
import type { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";
import type { BeerFormatEnum } from "@/modules/beers/enums/beer-format.enum";

export interface BeerDto {
  readonly id: number;
  readonly name: string;
  readonly breweryName: string;
  readonly country: string;
  readonly styleId: number;
  readonly styleName: string;
  readonly family: BeerFamilyEnum;
  readonly abv: number;
  readonly aromas: readonly BeerAromaEnum[];
  readonly formats: readonly BeerFormatEnum[];
  readonly description: string;
}
