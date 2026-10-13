import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import {
  BEER_DESCRIPTION_MAX_LENGTH,
  BEER_NAME_MAX_LENGTH,
  BEER_SEARCH_TEXT_MAX_LENGTH,
  COUNTRY_CODE_LENGTH,
} from "@/modules/beers/beers.constants";
import { BeerStyle } from "@/modules/beers/entities/beer-style.entity";
import { Brewery } from "@/modules/beers/entities/brewery.entity";
import { BeerAromaEnum } from "@/modules/beers/enums/beer-aroma.enum";
import { BeerFormatEnum } from "@/modules/beers/enums/beer-format.enum";

@Entity({ name: "beers" })
export class Beer {
  @PrimaryGeneratedColumn()
  readonly id!: number;

  @Column({ type: "varchar", length: BEER_NAME_MAX_LENGTH, unique: true })
  name!: string;

  @Column({ type: "integer" })
  breweryId!: number;

  @Column({ type: "integer" })
  styleId!: number;

  @Column({ type: "real" })
  abv!: number;

  @Column({ type: "integer", nullable: true })
  ibu!: number | null;

  @Column({ type: "integer", nullable: true })
  ebc!: number | null;

  @Column({ type: "varchar", length: BEER_DESCRIPTION_MAX_LENGTH })
  description!: string;

  @Column({ type: "simple-array" })
  aromas!: BeerAromaEnum[];

  @Column({ type: "simple-array" })
  formats!: BeerFormatEnum[];

  @Column({ type: "varchar", length: COUNTRY_CODE_LENGTH })
  country!: string;

  @Column({ type: "varchar", length: BEER_SEARCH_TEXT_MAX_LENGTH })
  searchText!: string;

  @ManyToOne(() => Brewery)
  @JoinColumn({ name: "breweryId" })
  brewery!: Brewery;

  @ManyToOne(() => BeerStyle)
  @JoinColumn({ name: "styleId" })
  style!: BeerStyle;
}
