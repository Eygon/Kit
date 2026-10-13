import type { DexBeerDto } from "@/modules/pokedex/dtos/dex-beer.dto";
import type { DexFamilyDto } from "@/modules/pokedex/dtos/dex-family.dto";

export interface DexDto {
  readonly discovered: number;
  readonly total: number;
  readonly families: readonly DexFamilyDto[];
  readonly beers: readonly DexBeerDto[];
}
