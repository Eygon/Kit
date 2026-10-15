import { IsEnum } from "class-validator";
import { CorrectionVoteSenseEnum } from "@/modules/beers/enums/correction-vote-sense.enum";

export class SaveCorrectionVoteDto {
  @IsEnum(CorrectionVoteSenseEnum)
  readonly sense!: CorrectionVoteSenseEnum;
}
