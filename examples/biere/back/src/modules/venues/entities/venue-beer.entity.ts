import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { AvailabilityVote } from "@/modules/venues/entities/availability-vote.entity";
import { Venue } from "@/modules/venues/entities/venue.entity";

@Entity({ name: "venue_beers" })
@Unique(["venueId", "beerId"])
export class VenueBeer {
  @PrimaryGeneratedColumn()
  readonly id!: number;

  @Column({ type: "integer" })
  venueId!: number;

  @Column({ type: "integer" })
  beerId!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => Venue)
  @JoinColumn({ name: "venueId" })
  venue!: Venue;

  @OneToMany(() => AvailabilityVote, (vote) => vote.venueBeer)
  votes!: AvailabilityVote[];
}
