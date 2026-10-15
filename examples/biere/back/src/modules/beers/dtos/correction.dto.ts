import type { CharacteristicValue } from "@/modules/beers/dtos/correction-record.dto";
import type { BeerCharacteristicEnum } from "@/modules/beers/enums/beer-characteristic.enum";
import type { CorrectionStatusEnum } from "@/modules/beers/enums/correction-status.enum";

export interface CorrectionDto {
  readonly id: number;
  readonly beerId: number;
  readonly beerName: string;
  readonly characteristic: BeerCharacteristicEnum;
  readonly currentValue: CharacteristicValue | null;
  readonly proposedValue: CharacteristicValue;
  readonly reason: string;
  readonly proposedBy: number;
  readonly proposedByName: string;
  readonly createdAt: string;
  readonly closesAt: string;
  readonly status: CorrectionStatusEnum;
  readonly resolvedAt: string | null;
  readonly agreeCount: number;
  readonly disagreeCount: number;
  readonly isMine: boolean;
}
