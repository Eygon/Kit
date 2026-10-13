import type { VenueBeerDto } from "@/types/dtos/venue/venueBeerDto";
import { isBeerFamily } from "@/types/enums/beer/beerFamilyEnum";
import { AvailabilityStatusEnum, isAvailabilityStatus } from "@/types/enums/venue/availabilityStatusEnum";
import type { VenueBeer } from "@/types/models/venue/venueBeer";

const toDateOrNull = (value: string | null): Date | null => (value === null ? null : new Date(value));

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
});
