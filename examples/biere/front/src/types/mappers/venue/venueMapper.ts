import type { VenueDto } from "@/types/dtos/venue/venueDto";
import { AvailabilityStatusEnum, isAvailabilityStatus } from "@/types/enums/venue/availabilityStatusEnum";
import { isVenueType } from "@/types/enums/venue/venueTypeEnum";
import type { Venue } from "@/types/models/venue/venue";

export const venueDtoToModel = (dto: VenueDto): Venue => ({
  id: dto.id,
  name: dto.name,
  type: isVenueType(dto.type) ? dto.type : null,
  city: dto.city,
  address: dto.address,
  latitude: dto.latitude,
  longitude: dto.longitude,
  description: dto.description,
  distanceKm: dto.distanceKm,
  status: isAvailabilityStatus(dto.status) ? dto.status : AvailabilityStatusEnum.UNKNOWN,
});
