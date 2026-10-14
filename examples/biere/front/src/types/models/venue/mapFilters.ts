import type { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";
import type { VenueTypeEnum } from "@/types/enums/venue/venueTypeEnum";

export interface MapFilters {
  types: VenueTypeEnum[];
  family: BeerFamilyEnum | null;
  beerId: number | null;
  confirmedOnly: boolean;
  undiscovered: boolean;
  radiusKm: number | null;
}
