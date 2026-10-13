import type { Venue } from "@/types/models/venue/venue";

export type VenueSheetProps = Readonly<{
  venue: Venue | null;
  onClose: () => void;
}>;
