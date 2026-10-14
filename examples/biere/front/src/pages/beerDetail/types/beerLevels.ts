import type { LevelRange } from "@/types/models/beer/levelRange";

export type BeerLevelsProps = Readonly<{
  bitternessLevel: number | null;
  colorLevel: number | null;
  styleColorRange: LevelRange | null;
}>;
