import { isBeerAroma } from "@/types/enums/beer/beerAromaEnum";
import { BeerCharacteristicEnum, isBeerCharacteristic } from "@/types/enums/beer/beerCharacteristicEnum";
import { isBeerFormat } from "@/types/enums/beer/beerFormatEnum";
import { CorrectionStatusEnum, isCorrectionStatus } from "@/types/enums/correction/correctionStatusEnum";
import { isCorrectionVoteSense } from "@/types/enums/correction/correctionVoteSenseEnum";
import type { CorrectionDto } from "@/types/dtos/correction/correctionDto";
import type { CharacteristicValue } from "@/types/models/beer/characteristicValue";
import type { Correction } from "@/types/models/correction/correction";

const mapValue = (characteristic: BeerCharacteristicEnum, value: number | string[]): CharacteristicValue => {
  if (!Array.isArray(value)) return value;
  return characteristic === BeerCharacteristicEnum.AROMAS ? value.filter(isBeerAroma) : value.filter(isBeerFormat);
};

export const correctionDtoToModel = (dto: CorrectionDto): Correction | null => {
  if (!isBeerCharacteristic(dto.characteristic)) return null;
  return {
    id: dto.id,
    beerId: dto.beerId,
    beerName: dto.beerName,
    characteristic: dto.characteristic,
    currentValue: dto.currentValue === null ? null : mapValue(dto.characteristic, dto.currentValue),
    proposedValue: mapValue(dto.characteristic, dto.proposedValue),
    reason: dto.reason,
    proposedBy: dto.proposedBy,
    proposedByName: dto.proposedByName,
    createdAt: dto.createdAt,
    closesAt: dto.closesAt,
    status: isCorrectionStatus(dto.status) ? dto.status : CorrectionStatusEnum.OPEN,
    resolvedAt: dto.resolvedAt,
    agreeCount: dto.agreeCount,
    disagreeCount: dto.disagreeCount,
    myVote: isCorrectionVoteSense(dto.myVote) ? dto.myVote : null,
    isMine: dto.isMine,
  };
};
