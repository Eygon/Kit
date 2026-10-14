import type { GeoPosition } from "@/types/models/venue/geoPosition";
import type { MapBounds } from "@/types/models/venue/mapBounds";
import type { Venue } from "@/types/models/venue/venue";

export type VenueMapProps = Readonly<{
  venues: Venue[];
  userPosition: GeoPosition | null;
  focusedPosition: GeoPosition | null;
  pickedPoint: GeoPosition | null;
  isPickingPoint: boolean;
  onBoundsChange: (bounds: MapBounds) => void;
  onTilesUnavailable: () => void;
  onSelectVenue: (venue: Venue) => void;
  onPickPoint: (position: GeoPosition) => void;
}>;
