import type { AvailabilityStatusEnum } from "@/types/enums/venue/availabilityStatusEnum";
import type { VenueTypeEnum } from "@/types/enums/venue/venueTypeEnum";

export interface BeerVenue {
  venueId: number;
  venueName: string;
  venueType: VenueTypeEnum | null;
  city: string;
  address: string;
  latitude: number;
  longitude: number;
  status: AvailabilityStatusEnum;
  lastConfirmedAt: Date | null;
  recentVoterCount: number;
  distanceKm: number | null;
}
