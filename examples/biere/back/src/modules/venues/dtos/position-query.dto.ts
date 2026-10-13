import { Type } from "class-transformer";
import { IsNumber, IsOptional, Max, Min } from "class-validator";
import { LATITUDE_MAX_DEGREES, LONGITUDE_MAX_DEGREES } from "@/modules/venues/venues.constants";

export class PositionQueryDto {
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
}
