import type { BeerQuery } from "@/types/models/beer/beerQuery";

export type BeerFiltersDrawerProps = Readonly<{
  appliedQuery: BeerQuery;
  onApply: (query: BeerQuery) => void;
}>;
