import type { BeerAromaEnum } from "@/types/enums/beer/beerAromaEnum";

export interface CheckinChanges {
  drankAt?: string;
  place?: string;
  venueId?: number | null;
  rating?: number | null;
  aromas?: BeerAromaEnum[];
  format?: string;
  price?: number | null;
  comment?: string;
}
