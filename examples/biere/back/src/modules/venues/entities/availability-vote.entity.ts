import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { VenueBeer } from "@/modules/venues/entities/venue-beer.entity";
import { VoteSenseEnum } from "@/modules/venues/enums/vote-sense.enum";

@Entity({ name: "availability_votes" })
@Index(["venueBeerId", "userId"])
export class AvailabilityVote {
  @PrimaryGeneratedColumn()
  readonly id!: number;

  @Column({ type: "integer" })
  venueBeerId!: number;

  @Column({ type: "integer", nullable: true })
  userId!: number | null;

  @Column({ type: "simple-enum", enum: VoteSenseEnum })
  sense!: VoteSenseEnum;

  @Column({ type: "datetime" })
  votedAt!: Date;

  @ManyToOne(() => VenueBeer, (venueBeer) => venueBeer.votes)
  @JoinColumn({ name: "venueBeerId" })
  venueBeer!: VenueBeer;
}
