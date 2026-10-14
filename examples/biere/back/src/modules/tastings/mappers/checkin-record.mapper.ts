import type { CreateCheckinDto } from "@/modules/tastings/dtos/create-checkin.dto";
import type { CheckinRecordDto } from "@/modules/tastings/dtos/checkin-record.dto";
import type { Checkin } from "@/modules/tastings/entities/checkin.entity";

export const toCheckinRecordDto = (entity: Checkin): CheckinRecordDto => ({
  id: entity.id,
  userId: entity.userId,
  beerId: entity.beerId,
  drankAt: entity.drankAt.toISOString(),
  place: entity.place,
  venueId: entity.venueId,
  rating: entity.rating,
  aromas: entity.aromas,
  format: entity.format,
  price: entity.price,
  comment: entity.comment,
  photoId: entity.photoId,
});

export const toNewCheckin = (dto: CreateCheckinDto, userId: number): Omit<Checkin, "id" | "createdAt"> => ({
  userId,
  beerId: dto.beerId,
  drankAt: new Date(dto.drankAt),
  place: dto.place.trim(),
  venueId: dto.venueId ?? null,
  rating: dto.rating ?? null,
  aromas: [...(dto.aromas ?? [])],
  format: dto.format,
  price: dto.price ?? null,
  comment: dto.comment ?? "",
  photoId: null,
});
