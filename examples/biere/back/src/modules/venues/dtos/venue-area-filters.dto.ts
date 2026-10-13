import type { VenueTypeEnum } from "@/modules/venues/enums/venue-type.enum";

export interface VenueBoundsDto {
  readonly north: number;
  readonly south: number;
  readonly east: number;
  readonly west: number;
}

export interface VenueAreaFiltersDto {
  readonly bounds: VenueBoundsDto | null;
  readonly types: readonly VenueTypeEnum[];
}
