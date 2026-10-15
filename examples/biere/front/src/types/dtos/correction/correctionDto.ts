import type { CorrectionVoteSenseEnum } from "@/types/enums/correction/correctionVoteSenseEnum";

export interface CorrectionDto {
  id: number;
  beerId: number;
  beerName: string;
  characteristic: string;
  currentValue: number | string[] | null;
  proposedValue: number | string[];
  reason: string;
  proposedBy: number;
  proposedByName: string;
  createdAt: string;
  closesAt: string;
  status: string;
  resolvedAt: string | null;
  agreeCount: number;
  disagreeCount: number;
  myVote: CorrectionVoteSenseEnum | null;
  isMine: boolean;
}
