import type { BeerCharacteristicEnum } from "@/modules/beers/enums/beer-characteristic.enum";
import type { CorrectionStatusEnum } from "@/modules/beers/enums/correction-status.enum";

export type CharacteristicValue = number | readonly string[];

export interface CorrectionRecordDto {
  readonly id: number;
  readonly beerId: number;
  readonly characteristic: BeerCharacteristicEnum;
  readonly proposedValue: CharacteristicValue;
  readonly reason: string;
  readonly proposedBy: number;
  readonly createdAt: string;
  readonly closesAt: string;
  readonly status: CorrectionStatusEnum;
  readonly resolvedAt: string | null;
  readonly previousValue: CharacteristicValue | null;
}
