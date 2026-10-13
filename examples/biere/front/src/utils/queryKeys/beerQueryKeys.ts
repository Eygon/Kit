import type { BeerQuery } from "@/types/models/beer/beerQuery";

export const beerKeys = {
  all: () => ["beers"] as const,
  catalog: (query: BeerQuery) => [...beerKeys.all(), "catalog", query] as const,
  detail: (beerId: number | null) => [...beerKeys.all(), "detail", beerId] as const,
  preview: (query: BeerQuery) => [...beerKeys.all(), "preview", query] as const,
};
