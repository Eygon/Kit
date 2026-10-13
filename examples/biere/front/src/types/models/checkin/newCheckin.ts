import type { BeerAromaEnum } from "@/types/enums/beer/beerAromaEnum";

export interface NewCheckin {
  beerId: number;
  drankAt: string;
  place: string;
  format: string;
  rating: number | null;
  aromas: BeerAromaEnum[];
  price: number | null;
  comment: string;
}
