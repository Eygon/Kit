import { Transform } from "class-transformer";
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { VenueTypeEnum } from "@/modules/venues/enums/venue-type.enum";
import {
  LATITUDE_MAX_DEGREES,
  LONGITUDE_MAX_DEGREES,
  VENUE_ADDRESS_MAX_LENGTH,
  VENUE_CITY_MAX_LENGTH,
  VENUE_DESCRIPTION_MAX_LENGTH,
  VENUE_NAME_MAX_LENGTH,
} from "@/modules/venues/venues.constants";

const trimString = ({ value }: { value: unknown }): unknown => (typeof value === "string" ? value.trim() : value);

export class CreateVenueDto {
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(VENUE_NAME_MAX_LENGTH)
  readonly name!: string;

  @IsEnum(VenueTypeEnum)
  readonly type!: VenueTypeEnum;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(VENUE_ADDRESS_MAX_LENGTH)
  readonly address!: string;

  @IsNumber()
  @Min(-LATITUDE_MAX_DEGREES)
  @Max(LATITUDE_MAX_DEGREES)
  readonly latitude!: number;

  @IsNumber()
  @Min(-LONGITUDE_MAX_DEGREES)
  @Max(LONGITUDE_MAX_DEGREES)
  readonly longitude!: number;

  @IsOptional()
  @IsString()
  @MaxLength(VENUE_CITY_MAX_LENGTH)
  readonly city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(VENUE_DESCRIPTION_MAX_LENGTH)
  readonly description?: string;
}
