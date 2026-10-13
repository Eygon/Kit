import type { AvailabilityStatusEnum } from "@/modules/venues/enums/availability-status.enum";
import type { VenueTypeEnum } from "@/modules/venues/enums/venue-type.enum";

export interface BeerVenueDto {
  readonly venueId: number;
  readonly venueName: string;
  readonly venueType: VenueTypeEnum;
  readonly city: string;
  readonly address: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly status: AvailabilityStatusEnum;
  readonly lastConfirmedAt: string | null;
  readonly recentVoterCount: number;
  readonly distanceKm: number | null;
}
