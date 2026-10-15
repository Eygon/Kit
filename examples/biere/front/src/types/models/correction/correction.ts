import type { BeerCharacteristicEnum } from "@/types/enums/beer/beerCharacteristicEnum";
import type { CharacteristicValue } from "@/types/models/beer/characteristicValue";
import type { CorrectionStatusEnum } from "@/types/enums/correction/correctionStatusEnum";
import type { CorrectionVoteSenseEnum } from "@/types/enums/correction/correctionVoteSenseEnum";

export interface Correction {
  id: number;
  beerId: number;
  beerName: string;
  characteristic: BeerCharacteristicEnum;
  currentValue: CharacteristicValue | null;
  proposedValue: CharacteristicValue;
  reason: string;
  proposedBy: number;
  proposedByName: string;
  createdAt: string;
  closesAt: string;
  status: CorrectionStatusEnum;
  resolvedAt: string | null;
  agreeCount: number;
  disagreeCount: number;
  myVote: CorrectionVoteSenseEnum | null;
  isMine: boolean;
}
