import { Transform, Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";
import { VenueTypeEnum } from "@/modules/venues/enums/venue-type.enum";
import {
  LATITUDE_MAX_DEGREES,
  LONGITUDE_MAX_DEGREES,
  RADIUS_MAX_KM,
  VENUE_SEARCH_MAX_LENGTH,
} from "@/modules/venues/venues.constants";

const toArray = ({ value }: { value: unknown }): unknown => (Array.isArray(value) || value === undefined ? value : [value]);

const toBoolean = ({ value }: { value: unknown }): unknown => {
  if (value === "true") {
    return true;
  }
  return value === "false" ? false : value;
};

const trimString = ({ value }: { value: unknown }): unknown => (typeof value === "string" ? value.trim() : value);

export class VenuesQueryDto {
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(VENUE_SEARCH_MAX_LENGTH)
  readonly q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-LATITUDE_MAX_DEGREES)
  @Max(LATITUDE_MAX_DEGREES)
  readonly north?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-LATITUDE_MAX_DEGREES)
  @Max(LATITUDE_MAX_DEGREES)
  readonly south?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-LONGITUDE_MAX_DEGREES)
  @Max(LONGITUDE_MAX_DEGREES)
  readonly east?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-LONGITUDE_MAX_DEGREES)
  @Max(LONGITUDE_MAX_DEGREES)
  readonly west?: number;

  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsEnum(VenueTypeEnum, { each: true })
  readonly type?: VenueTypeEnum[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  readonly beer?: number;

  @IsOptional()
  @IsEnum(BeerFamilyEnum)
  readonly family?: BeerFamilyEnum;

  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  readonly style?: number[];

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  readonly confirmedOnly?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  readonly undiscovered?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  readonly visited?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-LATITUDE_MAX_DEGREES)
  @Max(LATITUDE_MAX_DEGREES)
  readonly latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-LONGITUDE_MAX_DEGREES)
  @Max(LONGITUDE_MAX_DEGREES)
  readonly longitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @Max(RADIUS_MAX_KM)
  readonly radiusKm?: number;
}
