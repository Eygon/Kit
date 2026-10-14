import type { Venue } from "@/types/models/venue/venue";
import type { VenueQuery } from "@/types/models/venue/venueQuery";

export type VenueSearchSheetProps = Readonly<{
  filterQuery: VenueQuery;
  activeFilterCount: number;
  onSelectVenue: (venue: Venue) => void;
}>;
