import type { BeerAromaEnum } from "@/types/enums/beer/beerAromaEnum";
import type { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";
import type { BeerFormatEnum } from "@/types/enums/beer/beerFormatEnum";

export interface Beer {
  id: number;
  name: string;
  breweryName: string;
  country: string;
  styleId: number;
  styleName: string;
  family: BeerFamilyEnum | null;
  abv: number;
  aromas: BeerAromaEnum[];
  formats: BeerFormatEnum[];
  description: string;
  drunk: boolean;
  checkinCount: number;
  inWishlist: boolean;
}
