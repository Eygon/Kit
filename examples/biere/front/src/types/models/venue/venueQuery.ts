import type { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";
import type { VenueTypeEnum } from "@/types/enums/venue/venueTypeEnum";
import type { GeoPosition } from "@/types/models/venue/geoPosition";
import type { MapBounds } from "@/types/models/venue/mapBounds";

export interface VenueQuery {
  bounds: MapBounds | null;
  types: VenueTypeEnum[];
  family: BeerFamilyEnum | null;
  beerId: number | null;
  confirmedOnly: boolean;
  undiscovered: boolean;
  position: GeoPosition | null;
  radiusKm: number | null;
  q: string;
}
