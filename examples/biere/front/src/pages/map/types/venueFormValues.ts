import type { VenueTypeEnum } from "@/types/enums/venue/venueTypeEnum";

export type VenueFormValues = {
  name: string;
  type: VenueTypeEnum;
  address: string;
  city: string;
  description: string;
};

export type VenueFormErrorKeys = Partial<Record<"name" | "address", string>>;
