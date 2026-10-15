import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { CORRECTION_REASON_MAX_LENGTH, CORRECTION_VALUE_MAX_LENGTH } from "@/modules/beers/beers.constants";
import { BeerCharacteristicEnum } from "@/modules/beers/enums/beer-characteristic.enum";
import { CorrectionStatusEnum } from "@/modules/beers/enums/correction-status.enum";

@Entity({ name: "beer_corrections" })
@Index(["beerId", "characteristic"])
@Index(["status", "closesAt"])
export class BeerCorrection {
  @PrimaryGeneratedColumn()
  readonly id!: number;

  @Column({ type: "integer" })
  beerId!: number;

  @Column({ type: "simple-enum", enum: BeerCharacteristicEnum })
  characteristic!: BeerCharacteristicEnum;

  @Column({ type: "varchar", length: CORRECTION_VALUE_MAX_LENGTH })
  proposedValue!: string;

  @Column({ type: "varchar", length: CORRECTION_REASON_MAX_LENGTH })
  reason!: string;

  @Column({ type: "integer" })
  proposedBy!: number;

  @Column({ type: "datetime" })
  createdAt!: Date;

  @Column({ type: "datetime" })
  closesAt!: Date;

  @Column({ type: "simple-enum", enum: CorrectionStatusEnum, default: CorrectionStatusEnum.OPEN })
  status!: CorrectionStatusEnum;

  @Column({ type: "datetime", nullable: true })
  resolvedAt!: Date | null;

  @Column({ type: "varchar", length: CORRECTION_VALUE_MAX_LENGTH, nullable: true })
  previousValue!: string | null;
}
