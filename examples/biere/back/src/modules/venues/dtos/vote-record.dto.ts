import type { VoteSenseEnum } from "@/modules/venues/enums/vote-sense.enum";

export interface VoteRecordDto {
  readonly userId: number | null;
  readonly sense: VoteSenseEnum;
  readonly votedAt: Date;
}
