import type { VenueBeerDto } from "@/types/dtos/venue/venueBeerDto";
import { isBeerFamily } from "@/types/enums/beer/beerFamilyEnum";
import { AvailabilityStatusEnum, isAvailabilityStatus } from "@/types/enums/venue/availabilityStatusEnum";
import type { VenueBeer } from "@/types/models/venue/venueBeer";
import { toDateOrNull } from "@/utils/date/toDateOrNull";

export const venueBeerDtoToModel = (dto: VenueBeerDto): VenueBeer => ({
  beerId: dto.beerId,
  beerName: dto.beerName,
  breweryName: dto.breweryName,
  styleName: dto.styleName,
  family: isBeerFamily(dto.family) ? dto.family : null,
  status: isAvailabilityStatus(dto.status) ? dto.status : AvailabilityStatusEnum.UNKNOWN,
  lastConfirmedAt: toDateOrNull(dto.lastConfirmedAt),
  recentVoterCount: dto.recentVoterCount,
  nextVoteAt: toDateOrNull(dto.nextVoteAt),
  drunk: dto.drunk,
  checkinCount: dto.checkinCount,
  lastCheckinAt: toDateOrNull(dto.lastCheckinAt),
});
