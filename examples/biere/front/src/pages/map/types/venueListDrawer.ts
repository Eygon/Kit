import type { Venue } from "@/types/models/venue/venue";

export type VenueListDrawerProps = Readonly<{
  venues: Venue[];
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
  onSelectVenue: (venue: Venue) => void;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}>;
