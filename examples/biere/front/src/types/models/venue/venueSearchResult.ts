import type { Venue } from "@/types/models/venue/venue";

export interface VenueSearchResult {
  venues: Venue[];
  isApproximate: boolean;
}
