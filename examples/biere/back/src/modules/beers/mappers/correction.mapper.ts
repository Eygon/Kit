import { normalizeLineEndings } from "@/common/text/normalize-line-endings";
import { CORRECTION_VOTE_DURATION_MS } from "@/modules/beers/beers.constants";
import type { BeerDto } from "@/modules/beers/dtos/beer.dto";
import type { CorrectionBoardDto, VotedCorrectionDto } from "@/modules/beers/dtos/correction-board.dto";
import type { CharacteristicValue, CorrectionRecordDto } from "@/modules/beers/dtos/correction-record.dto";
import type { CreateCorrectionDto } from "@/modules/beers/dtos/create-correction.dto";
import type { Beer } from "@/modules/beers/entities/beer.entity";
import type { BeerCorrection } from "@/modules/beers/entities/beer-correction.entity";
import type { BeerCorrectionVote } from "@/modules/beers/entities/beer-correction-vote.entity";
import { BeerCharacteristicEnum } from "@/modules/beers/enums/beer-characteristic.enum";
import { CorrectionStatusEnum } from "@/modules/beers/enums/correction-status.enum";
import type { CorrectionVoteSenseEnum } from "@/modules/beers/enums/correction-vote-sense.enum";
import type { BeerAromaEnum } from "@/modules/beers/enums/beer-aroma.enum";
import type { BeerFormatEnum } from "@/modules/beers/enums/beer-format.enum";

export type NewCorrectionRow = Omit<BeerCorrection, "id" | "status" | "resolvedAt" | "previousValue">;

export type BeerCharacteristicChange = Partial<Pick<Beer, "abv" | "ibu" | "ebc" | "sweetness" | "acidity" | "body" | "aromas" | "formats">>;

export const toNewCorrection = (beerId: number, dto: CreateCorrectionDto, userId: number, now: Date): NewCorrectionRow => ({
  beerId,
  characteristic: dto.characteristic,
  proposedValue: JSON.stringify(dto.value),
  reason: normalizeLineEndings(dto.reason ?? "").trim(),
  proposedBy: userId,
  createdAt: now,
  closesAt: new Date(now.getTime() + CORRECTION_VOTE_DURATION_MS),
});

export const toNewCorrectionVote = (
  correctionId: number,
  userId: number,
  sense: CorrectionVoteSenseEnum,
  now: Date,
): Omit<BeerCorrectionVote, "id"> => ({ correctionId, userId, sense, votedAt: now });

const toIsoOrNull = (date: Date | null): string | null => (date === null ? null : date.toISOString());

const parseValueOrNull = (stored: string | null): CharacteristicValue | null =>
  stored === null ? null : (JSON.parse(stored) as CharacteristicValue | null);

export const toCorrectionRecordDto = (entity: BeerCorrection): CorrectionRecordDto => ({
  id: entity.id,
  beerId: entity.beerId,
  characteristic: entity.characteristic,
  proposedValue: JSON.parse(entity.proposedValue) as CharacteristicValue,
  reason: entity.reason,
  proposedBy: entity.proposedBy,
  createdAt: entity.createdAt.toISOString(),
  closesAt: entity.closesAt.toISOString(),
  status: entity.status,
  resolvedAt: toIsoOrNull(entity.resolvedAt),
  previousValue: parseValueOrNull(entity.previousValue),
});

export const toBeerCharacteristicChange = (characteristic: BeerCharacteristicEnum, value: CharacteristicValue): BeerCharacteristicChange => {
  switch (characteristic) {
    case BeerCharacteristicEnum.ABV:
      return { abv: value as number };
    case BeerCharacteristicEnum.IBU:
      return { ibu: value as number };
    case BeerCharacteristicEnum.EBC:
      return { ebc: value as number };
    case BeerCharacteristicEnum.SWEETNESS:
      return { sweetness: value as number };
    case BeerCharacteristicEnum.ACIDITY:
      return { acidity: value as number };
    case BeerCharacteristicEnum.BODY:
      return { body: value as number };
    case BeerCharacteristicEnum.AROMAS:
      return { aromas: [...(value as readonly BeerAromaEnum[])] };
    case BeerCharacteristicEnum.FORMATS:
      return { formats: [...(value as readonly BeerFormatEnum[])] };
  }
};

const nullWhenEmpty = (list: readonly string[]): readonly string[] | null => (list.length === 0 ? null : list);

export const readCharacteristicValue = (beer: BeerDto, characteristic: BeerCharacteristicEnum): CharacteristicValue | null => {
  switch (characteristic) {
    case BeerCharacteristicEnum.ABV:
      return beer.abv;
    case BeerCharacteristicEnum.IBU:
      return beer.ibu;
    case BeerCharacteristicEnum.EBC:
      return beer.ebc;
    case BeerCharacteristicEnum.SWEETNESS:
      return beer.sweetness;
    case BeerCharacteristicEnum.ACIDITY:
      return beer.acidity;
    case BeerCharacteristicEnum.BODY:
      return beer.body;
    case BeerCharacteristicEnum.AROMAS:
      return nullWhenEmpty(beer.aromas);
    case BeerCharacteristicEnum.FORMATS:
      return nullWhenEmpty(beer.formats);
  }
};

export const toCorrectionDto = (
  record: CorrectionRecordDto,
  beerName: string,
  currentValue: CharacteristicValue | null,
  proposedByName: string,
  userId: number,
  agreeCount: number,
  disagreeCount: number,
  myVote: CorrectionVoteSenseEnum | null,
): VotedCorrectionDto => ({
  id: record.id,
  beerId: record.beerId,
  beerName,
  characteristic: record.characteristic,
  currentValue: record.status === CorrectionStatusEnum.OPEN ? currentValue : record.previousValue,
  proposedValue: record.proposedValue,
  reason: record.reason,
  proposedBy: record.proposedBy,
  proposedByName,
  createdAt: record.createdAt,
  closesAt: record.closesAt,
  status: record.status,
  resolvedAt: record.resolvedAt,
  agreeCount,
  disagreeCount,
  myVote,
  isMine: record.proposedBy === userId,
});

export const toCorrectionBoardDto = (
  open: readonly VotedCorrectionDto[],
  recentlyClosed: readonly VotedCorrectionDto[],
  pendingCount: number,
): CorrectionBoardDto => ({ open, recentlyClosed, pendingCount });
