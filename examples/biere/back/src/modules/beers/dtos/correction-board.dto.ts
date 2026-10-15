import type { CorrectionDto } from "@/modules/beers/dtos/correction.dto";
import type { CorrectionVoteSenseEnum } from "@/modules/beers/enums/correction-vote-sense.enum";

export type VotedCorrectionDto = CorrectionDto & { readonly myVote: CorrectionVoteSenseEnum | null };

export interface CorrectionBoardDto {
  readonly open: readonly VotedCorrectionDto[];
  readonly recentlyClosed: readonly VotedCorrectionDto[];
  readonly pendingCount: number;
}

export interface CorrectionTallyDto {
  readonly correctionId: number;
  readonly sense: CorrectionVoteSenseEnum;
  readonly count: number;
}

export interface CorrectionUserVoteDto {
  readonly correctionId: number;
  readonly sense: CorrectionVoteSenseEnum;
}
