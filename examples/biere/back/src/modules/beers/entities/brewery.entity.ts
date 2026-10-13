import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { BREWERY_CITY_MAX_LENGTH, BREWERY_NAME_MAX_LENGTH, COUNTRY_CODE_LENGTH } from "@/modules/beers/beers.constants";

@Entity({ name: "breweries" })
export class Brewery {
  @PrimaryGeneratedColumn()
  readonly id!: number;

  @Column({ type: "varchar", length: BREWERY_NAME_MAX_LENGTH, unique: true })
  name!: string;

  @Column({ type: "varchar", length: COUNTRY_CODE_LENGTH })
  country!: string;

  @Column({ type: "varchar", length: BREWERY_CITY_MAX_LENGTH })
  city!: string;
}
