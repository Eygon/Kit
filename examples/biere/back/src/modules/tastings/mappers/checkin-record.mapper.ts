import type { CreateCheckinDto } from "@/modules/tastings/dtos/create-checkin.dto";
import type { UpdateCheckinDto } from "@/modules/tastings/dtos/update-checkin.dto";
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

export type CheckinChanges = Partial<Omit<Checkin, "id" | "userId" | "beerId" | "photoId" | "createdAt">>;

export const toCheckinChanges = (dto: UpdateCheckinDto): CheckinChanges => ({
  ...(dto.drankAt !== undefined && { drankAt: new Date(dto.drankAt) }),
  ...(dto.place !== undefined && { place: dto.place.trim() }),
  ...((dto.place !== undefined || dto.venueId !== undefined) && { venueId: dto.venueId ?? null }),
  ...(dto.rating !== undefined && { rating: dto.rating }),
  ...(dto.aromas !== undefined && { aromas: [...dto.aromas] }),
  ...(dto.format !== undefined && { format: dto.format }),
  ...(dto.price !== undefined && { price: dto.price }),
  ...(dto.comment !== undefined && { comment: dto.comment }),
});
