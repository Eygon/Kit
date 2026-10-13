import type { VenueQuery } from "@/types/models/venue/venueQuery";

export const venueKeys = {
  all: () => ["venues"] as const,
  lists: () => [...venueKeys.all(), "list"] as const,
  list: (query: VenueQuery) => [...venueKeys.lists(), query] as const,
  beers: (venueId: number | null) => [...venueKeys.all(), "beers", venueId] as const,
};
