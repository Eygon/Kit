import type { BeerStyleDto } from "@/types/dtos/beerStyle/beerStyleDto";

export interface BeerStyleGroupDto {
  family: string;
  styles: BeerStyleDto[];
}
