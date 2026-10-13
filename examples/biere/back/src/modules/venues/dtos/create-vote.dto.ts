import { IsEnum } from "class-validator";
import { VoteSenseEnum } from "@/modules/venues/enums/vote-sense.enum";

export class CreateVoteDto {
  @IsEnum(VoteSenseEnum)
  readonly sense!: VoteSenseEnum;
}
