import type { BeerAromaEnum } from "@/types/enums/beer/beerAromaEnum";

export interface NewCheckin {
  beerId: number;
  drankAt: string;
  place: string;
  venueId: number | null;
  format: string;
  rating: number | null;
  aromas: BeerAromaEnum[];
  price: number | null;
  comment: string;
  photo?: File | null;
}
