import { Column, Entity, Index, PrimaryGeneratedColumn, Unique } from "typeorm";
import { REVIEW_TEXT_MAX_LENGTH } from "@/modules/beers/beers.constants";

@Entity({ name: "reviews" })
@Unique(["userId", "beerId"])
@Index(["beerId", "updatedAt"])
export class Review {
  @PrimaryGeneratedColumn()
  readonly id!: number;

  @Column({ type: "integer" })
  userId!: number;

  @Column({ type: "integer" })
  beerId!: number;

  @Column({ type: "real" })
  rating!: number;

  @Column({ type: "varchar", length: REVIEW_TEXT_MAX_LENGTH })
  text!: string;

  @Column({ type: "integer", nullable: true })
  sweetness!: number | null;

  @Column({ type: "integer", nullable: true })
  acidity!: number | null;

  @Column({ type: "integer", nullable: true })
  body!: number | null;

  @Column({ type: "datetime" })
  createdAt!: Date;

  @Column({ type: "datetime" })
  updatedAt!: Date;
}
