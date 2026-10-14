import type { VenueQuery } from "@/types/models/venue/venueQuery";

export const venueKeys = {
  all: () => ["venues"] as const,
  lists: () => [...venueKeys.all(), "list"] as const,
  list: (query: VenueQuery) => [...venueKeys.lists(), query] as const,
  search: (query: VenueQuery) => [...venueKeys.lists(), "search", query] as const,
  beers: (venueId: number | null) => [...venueKeys.all(), "beers", venueId] as const,
  detail: (venueId: number) => [...venueKeys.all(), "detail", venueId] as const,
  forBeer: (beerId: number) => [...venueKeys.all(), "forBeer", beerId] as const,
};
