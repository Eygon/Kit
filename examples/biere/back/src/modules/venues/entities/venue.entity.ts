import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { VenueTypeEnum } from "@/modules/venues/enums/venue-type.enum";
import {
  VENUE_ADDRESS_MAX_LENGTH,
  VENUE_CITY_MAX_LENGTH,
  VENUE_DESCRIPTION_MAX_LENGTH,
  VENUE_NAME_MAX_LENGTH,
} from "@/modules/venues/venues.constants";

@Entity({ name: "venues" })
export class Venue {
  @PrimaryGeneratedColumn()
  readonly id!: number;

  @Column({ type: "varchar", length: VENUE_NAME_MAX_LENGTH, unique: true })
  name!: string;

  @Column({ type: "simple-enum", enum: VenueTypeEnum })
  type!: VenueTypeEnum;

  @Column({ type: "varchar", length: VENUE_CITY_MAX_LENGTH, nullable: true })
  city!: string | null;

  @Column({ type: "varchar", length: VENUE_ADDRESS_MAX_LENGTH })
  address!: string;

  @Column({ type: "real" })
  latitude!: number;

  @Column({ type: "real" })
  longitude!: number;

  @Column({ type: "varchar", length: VENUE_DESCRIPTION_MAX_LENGTH, nullable: true })
  description!: string | null;

  @Column({ type: "varchar", length: VENUE_NAME_MAX_LENGTH, unique: true })
  nameKey!: string;

  @Column({ type: "varchar", length: VENUE_NAME_MAX_LENGTH, default: "" })
  searchName!: string;

  @Column({ type: "varchar", length: VENUE_CITY_MAX_LENGTH, default: "" })
  searchCity!: string;
}
