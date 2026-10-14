import type { CreateVenueDto } from "@/types/dtos/venue/createVenueDto";
import type { NewVenue } from "@/types/models/venue/newVenue";

export const newVenueToDto = (newVenue: NewVenue): CreateVenueDto => ({
  name: newVenue.name,
  type: newVenue.type,
  address: newVenue.address,
  city: newVenue.city,
  description: newVenue.description,
  latitude: newVenue.latitude,
  longitude: newVenue.longitude,
});
