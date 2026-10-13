import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { BeerAromaEnum } from "@/modules/beers/enums/beer-aroma.enum";
import { BeerFormatEnum } from "@/modules/beers/enums/beer-format.enum";
import {
  CHECKIN_COMMENT_MAX_LENGTH,
  CHECKIN_PLACE_MAX_LENGTH,
  PHOTO_ID_LENGTH,
} from "@/modules/tastings/tastings.constants";

@Entity({ name: "checkins" })
@Index(["userId", "beerId"])
export class Checkin {
  @PrimaryGeneratedColumn()
  readonly id!: number;

  @Column({ type: "integer" })
  userId!: number;

  @Column({ type: "integer" })
  beerId!: number;

  @Column({ type: "datetime" })
  drankAt!: Date;

  @Column({ type: "varchar", length: CHECKIN_PLACE_MAX_LENGTH })
  place!: string;

  @Column({ type: "real", nullable: true })
  rating!: number | null;

  @Column({ type: "simple-array" })
  aromas!: BeerAromaEnum[];

  @Column({ type: "simple-enum", enum: BeerFormatEnum })
  format!: BeerFormatEnum;

  @Column({ type: "real", nullable: true })
  price!: number | null;

  @Column({ type: "varchar", length: CHECKIN_COMMENT_MAX_LENGTH })
  comment!: string;

  @Column({ type: "varchar", length: PHOTO_ID_LENGTH, nullable: true })
  photoId!: string | null;

  @CreateDateColumn()
  readonly createdAt!: Date;
}
