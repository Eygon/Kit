import type { VenueVisitDto } from "@/modules/tastings/dtos/venue-visit.dto";
import type { CreateVenueDto } from "@/modules/venues/dtos/create-venue.dto";
import { normalizeSearchText } from "@/common/text/normalize-search-text";
import type { VenueDto } from "@/modules/venues/dtos/venue.dto";
import type { VenueRecordDto } from "@/modules/venues/dtos/venue-record.dto";
import type { Venue } from "@/modules/venues/entities/venue.entity";
import type { AvailabilityStatusEnum } from "@/modules/venues/enums/availability-status.enum";

const NAME_KEY_LOCALE = "fr";

export const toVenueRecordDto = (entity: Venue): VenueRecordDto => ({
  id: entity.id,
  name: entity.name,
  type: entity.type,
  city: entity.city ?? "",
  address: entity.address,
  latitude: entity.latitude,
  longitude: entity.longitude,
  description: entity.description ?? "",
});

export const toVenueDto = (
  record: VenueRecordDto,
  status: AvailabilityStatusEnum,
  distanceKm: number | null,
  visit: VenueVisitDto | undefined,
  isApproximateMatch: boolean,
): VenueDto => ({
  id: record.id,
  name: record.name,
  type: record.type,
  city: record.city,
  address: record.address,
  latitude: record.latitude,
  longitude: record.longitude,
  description: record.description,
  distanceKm,
  status,
  checkinCount: visit?.checkinCount ?? 0,
  lastCheckinAt: visit?.lastCheckinAt ?? null,
  isApproximateMatch,
});

export const toVenueSearchKeys = (name: string, city: string | null): Pick<Venue, "searchName" | "searchCity"> => ({
  searchName: normalizeSearchText(name),
  searchCity: normalizeSearchText(city ?? ""),
});

export const toNewVenue = (dto: CreateVenueDto): Omit<Venue, "id"> => {
  const name = dto.name.trim();
  return {
    name,
    type: dto.type,
    city: dto.city ?? null,
    address: dto.address.trim(),
    latitude: dto.latitude,
    longitude: dto.longitude,
    description: dto.description ?? null,
    nameKey: name.toLocaleLowerCase(NAME_KEY_LOCALE),
    ...toVenueSearchKeys(name, dto.city ?? null),
  };
};
