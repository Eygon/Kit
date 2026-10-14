import type { BeerVenueDto } from "@/types/dtos/venue/beerVenueDto";
import { AvailabilityStatusEnum, isAvailabilityStatus } from "@/types/enums/venue/availabilityStatusEnum";
import { isVenueType } from "@/types/enums/venue/venueTypeEnum";
import type { BeerVenue } from "@/types/models/venue/beerVenue";

export const beerVenueDtoToModel = (dto: BeerVenueDto): BeerVenue => ({
  venueId: dto.venueId,
  venueName: dto.venueName,
  venueType: isVenueType(dto.venueType) ? dto.venueType : null,
  city: dto.city,
  address: dto.address,
  latitude: dto.latitude,
  longitude: dto.longitude,
  status: isAvailabilityStatus(dto.status) ? dto.status : AvailabilityStatusEnum.UNKNOWN,
  lastConfirmedAt: dto.lastConfirmedAt === null ? null : new Date(dto.lastConfirmedAt),
  recentVoterCount: dto.recentVoterCount,
  distanceKm: dto.distanceKm,
});
