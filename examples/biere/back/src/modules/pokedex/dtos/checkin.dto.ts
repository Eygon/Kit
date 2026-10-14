import type { BeerAromaEnum } from "@/modules/beers/enums/beer-aroma.enum";
import type { BeerFormatEnum } from "@/modules/beers/enums/beer-format.enum";

export interface CheckinDto {
  readonly id: number;
  readonly beerId: number;
  readonly beerName: string;
  readonly drankAt: string;
  readonly place: string;
  readonly venueId: number | null;
  readonly rating: number | null;
  readonly aromas: readonly BeerAromaEnum[];
  readonly format: BeerFormatEnum;
  readonly price: number | null;
  readonly comment: string;
  readonly photoId: string | null;
}
