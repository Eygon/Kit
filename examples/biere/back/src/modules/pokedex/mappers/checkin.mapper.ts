import type { CheckinDto } from "@/modules/pokedex/dtos/checkin.dto";
import type { CheckinPageDto } from "@/modules/pokedex/dtos/checkin-page.dto";
import type { CreatedCheckinDto } from "@/modules/pokedex/dtos/created-checkin.dto";
import type { CheckinRecordDto } from "@/modules/tastings/dtos/checkin-record.dto";
import type { CheckinRecordSliceDto } from "@/modules/tastings/dtos/checkin-record-slice.dto";

export const toCheckinDto = (record: CheckinRecordDto, beerName: string): CheckinDto => ({
  id: record.id,
  beerId: record.beerId,
  beerName,
  drankAt: record.drankAt,
  place: record.place,
  rating: record.rating,
  aromas: record.aromas,
  format: record.format,
  price: record.price,
  comment: record.comment,
  photoId: record.photoId,
});

export const toCreatedCheckinDto = (
  record: CheckinRecordDto,
  beerName: string,
  isFirstDiscovery: boolean,
): CreatedCheckinDto => ({
  checkin: toCheckinDto(record, beerName),
  isFirstDiscovery,
});

export const toCheckinPageDto = (
  slice: CheckinRecordSliceDto,
  namesById: ReadonlyMap<number, string>,
  page: number,
  size: number,
): CheckinPageDto => ({
  items: slice.items.map((record) => toCheckinDto(record, namesById.get(record.beerId) ?? "")),
  total: slice.total,
  page,
  size,
});
