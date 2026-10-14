import type { BeerAromaEnum } from "@/types/enums/beer/beerAromaEnum";

export type CheckinFormValues = Readonly<{
  drankAt: string;
  place: string;
  rating: number;
  aromas: BeerAromaEnum[];
  format: string;
  price: number;
  comment: string;
  photo: File | null;
}>;
