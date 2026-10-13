import type { CreateVenueDto } from "@/modules/venues/dtos/create-venue.dto";
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
  };
};
