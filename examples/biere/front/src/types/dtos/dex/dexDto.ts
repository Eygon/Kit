import type { DexBeerDto } from "@/types/dtos/dex/dexBeerDto";
import type { DexFamilyDto } from "@/types/dtos/dex/dexFamilyDto";

export interface DexDto {
  discovered: number;
  total: number;
  families: DexFamilyDto[];
  beers: DexBeerDto[];
}
