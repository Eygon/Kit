import type { AvailabilityStatusEnum } from "@/types/enums/venue/availabilityStatusEnum";
import type { VenueTypeEnum } from "@/types/enums/venue/venueTypeEnum";

export interface Venue {
  id: number;
  name: string;
  type: VenueTypeEnum | null;
  city: string;
  address: string;
  latitude: number;
  longitude: number;
  description: string;
  distanceKm: number | null;
  checkinCount: number;
  lastCheckinAt: Date | null;
  status: AvailabilityStatusEnum;
}
