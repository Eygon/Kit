import type { DexBeer } from "@/types/models/dex/dexBeer";
import type { DexFamily } from "@/types/models/dex/dexFamily";

export interface Dex {
  discovered: number;
  total: number;
  families: DexFamily[];
  beers: DexBeer[];
}
