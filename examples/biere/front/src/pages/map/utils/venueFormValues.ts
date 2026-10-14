import type { VenueFormErrorKeys, VenueFormValues } from "@/pages/map/types/venueFormValues";
import { VenueTypeEnum } from "@/types/enums/venue/venueTypeEnum";
import type { GeoPosition } from "@/types/models/venue/geoPosition";
import type { NewVenue } from "@/types/models/venue/newVenue";

export const VENUE_NAME_MAX_LENGTH = 80;
export const VENUE_ADDRESS_MAX_LENGTH = 160;
export const VENUE_CITY_MAX_LENGTH = 60;
export const VENUE_DESCRIPTION_MAX_LENGTH = 300;
export const PROPOSE_VENUE_FORM_ID = "propose-venue-form";
export const POINT_COORDINATE_DIGITS = 4;

export const EMPTY_VENUE_FORM: VenueFormValues = {
  name: "",
  type: VenueTypeEnum.BAR,
  address: "",
  city: "",
  description: "",
};

export const formValuesToNewVenue = (values: VenueFormValues, position: GeoPosition): NewVenue => ({
  name: values.name.trim(),
  type: values.type,
  address: values.address.trim(),
  city: values.city.trim(),
  description: values.description.trim(),
  latitude: position.latitude,
  longitude: position.longitude,
});

export const getVenueFormErrorKeys = (values: VenueFormValues): VenueFormErrorKeys => ({
  ...(values.name.trim() === "" ? { name: "pages.map.propose.nameRequired" } : {}),
  ...(values.address.trim() === "" ? { address: "pages.map.propose.addressRequired" } : {}),
});
