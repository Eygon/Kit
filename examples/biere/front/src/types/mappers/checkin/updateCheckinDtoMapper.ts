import type { UpdateCheckinDto } from "@/types/dtos/checkin/updateCheckinDto";
import type { CheckinChanges } from "@/types/models/checkin/checkinChanges";

export const buildUpdateCheckinDto = (changes: CheckinChanges): UpdateCheckinDto => {
  const dto: UpdateCheckinDto = {};
  if (changes.drankAt !== undefined) dto.drankAt = changes.drankAt;
  if (changes.place !== undefined) dto.place = changes.place;
  if (changes.venueId !== undefined) dto.venueId = changes.venueId;
  if (changes.rating !== undefined) dto.rating = changes.rating;
  if (changes.aromas !== undefined) dto.aromas = changes.aromas;
  if (changes.format !== undefined) dto.format = changes.format;
  if (changes.price !== undefined) dto.price = changes.price;
  if (changes.comment !== undefined) dto.comment = changes.comment;
  return dto;
};
