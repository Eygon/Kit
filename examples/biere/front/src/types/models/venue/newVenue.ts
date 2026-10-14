import type { VenueTypeEnum } from "@/types/enums/venue/venueTypeEnum";

export interface NewVenue {
  name: string;
  type: VenueTypeEnum;
  address: string;
  city: string;
  description: string;
  latitude: number;
  longitude: number;
}
