import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { BEER_STYLE_DESCRIPTION_MAX_LENGTH, BEER_STYLE_NAME_MAX_LENGTH } from "@/modules/beers/beers.constants";
import { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";

@Entity({ name: "beer_styles" })
export class BeerStyle {
  @PrimaryGeneratedColumn()
  readonly id!: number;

  @Column({ type: "varchar", length: BEER_STYLE_NAME_MAX_LENGTH, unique: true })
  name!: string;

  @Column({ type: "simple-enum", enum: BeerFamilyEnum })
  family!: BeerFamilyEnum;

  @Column({ type: "varchar", length: BEER_STYLE_DESCRIPTION_MAX_LENGTH })
  description!: string;

  @Column({ type: "integer" })
  ebcMin!: number;

  @Column({ type: "integer" })
  ebcMax!: number;

  @Column({ type: "integer" })
  ibuMin!: number;

  @Column({ type: "integer" })
  ibuMax!: number;

  @Column({ type: "real" })
  abvMin!: number;

  @Column({ type: "real" })
  abvMax!: number;
}
