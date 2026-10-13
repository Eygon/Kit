import type { BeerDto } from "@/modules/beers/dtos/beer.dto";

export interface BeerSliceDto {
  readonly items: readonly BeerDto[];
  readonly total: number;
}
