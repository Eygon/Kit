import type { CheckinDto } from "@/types/dtos/checkin/checkinDto";
import { isBeerAroma } from "@/types/enums/beer/beerAromaEnum";
import { isBeerFormat } from "@/types/enums/beer/beerFormatEnum";
import type { Checkin } from "@/types/models/checkin/checkin";

export const checkinDtoToModel = (dto: CheckinDto): Checkin => ({
  id: dto.id,
  beerId: dto.beerId,
  beerName: dto.beerName,
  drankAt: dto.drankAt,
  place: dto.place,
  rating: dto.rating,
  aromas: dto.aromas.filter(isBeerAroma),
  format: isBeerFormat(dto.format) ? dto.format : null,
  price: dto.price,
  comment: dto.comment,
  photoId: dto.photoId,
  venueId: dto.venueId ?? null,
});
