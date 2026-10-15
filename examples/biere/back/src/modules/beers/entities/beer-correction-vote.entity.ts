import { Column, Entity, PrimaryGeneratedColumn, Unique } from "typeorm";
import { CorrectionVoteSenseEnum } from "@/modules/beers/enums/correction-vote-sense.enum";

@Entity({ name: "beer_correction_votes" })
@Unique(["correctionId", "userId"])
export class BeerCorrectionVote {
  @PrimaryGeneratedColumn()
  readonly id!: number;

  @Column({ type: "integer" })
  correctionId!: number;

  @Column({ type: "integer" })
  userId!: number;

  @Column({ type: "simple-enum", enum: CorrectionVoteSenseEnum })
  sense!: CorrectionVoteSenseEnum;

  @Column({ type: "datetime" })
  votedAt!: Date;
}
