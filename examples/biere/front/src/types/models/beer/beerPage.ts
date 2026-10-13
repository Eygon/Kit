import type { Beer } from "@/types/models/beer/beer";
import type { BeerFacets } from "@/types/models/beer/beerFacets";

export interface BeerPage {
  items: Beer[];
  total: number;
  page: number;
  size: number;
  facets: BeerFacets;
}
