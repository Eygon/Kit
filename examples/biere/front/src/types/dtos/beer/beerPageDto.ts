import type { BeerDto } from "@/types/dtos/beer/beerDto";
import type { BeerFacetsDto } from "@/types/dtos/beer/beerFacetsDto";

export interface BeerPageDto {
  items: BeerDto[];
  total: number;
  page: number;
  size: number;
  facets: BeerFacetsDto;
  isApproximate?: boolean;
}
