import type { BeerAromaEnum } from "@/types/enums/beer/beerAromaEnum";
import type { BeerFormatEnum } from "@/types/enums/beer/beerFormatEnum";

export interface Checkin {
  id: number;
  beerId: number;
  beerName: string;
  drankAt: string;
  place: string;
  rating: number | null;
  aromas: BeerAromaEnum[];
  format: BeerFormatEnum | null;
  price: number | null;
  comment: string;
  photoId: string | null;
}
