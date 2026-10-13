import type { Beer } from "@/types/models/beer/beer";

export type BeerCardProps = Readonly<{
  beer: Beer;
  discoveredAt: string | null;
}>;
