import { Transform } from "class-transformer";
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";
import { normalizeLineEndings } from "@/common/text/normalize-line-endings";
import {
  BEER_ABV_MAX_DECIMAL_PLACES,
  BEER_DESCRIPTION_MAX_LENGTH,
  BEER_NAME_MAX_LENGTH,
  BEER_NAME_MIN_LENGTH,
  BEER_PROPOSAL_ABV_MAX_PERCENT,
  BREWERY_NAME_MAX_LENGTH,
  BREWERY_NAME_MIN_LENGTH,
  COUNTRY_CODES,
} from "@/modules/beers/beers.constants";

const WHITESPACE_RUNS = /\s+/g;

const BEER_STYLE_ID_MIN = 1;

const toSingleLine = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.replace(WHITESPACE_RUNS, " ").trim() : value;

const normalizeText = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? normalizeLineEndings(value).trim() : value;

export class CreateBeerDto {
  @Transform(toSingleLine)
  @IsString()
  @MinLength(BEER_NAME_MIN_LENGTH)
  @MaxLength(BEER_NAME_MAX_LENGTH)
  readonly name!: string;

  @Transform(toSingleLine)
  @IsString()
  @MinLength(BREWERY_NAME_MIN_LENGTH)
  @MaxLength(BREWERY_NAME_MAX_LENGTH)
  readonly breweryName!: string;

  @IsIn(COUNTRY_CODES)
  readonly country!: string;

  @IsInt()
  @Min(BEER_STYLE_ID_MIN)
  readonly styleId!: number;

  @IsNumber({ maxDecimalPlaces: BEER_ABV_MAX_DECIMAL_PLACES })
  @Min(0)
  @Max(BEER_PROPOSAL_ABV_MAX_PERCENT)
  readonly abv!: number;

  @IsOptional()
  @Transform(normalizeText)
  @IsString()
  @MaxLength(BEER_DESCRIPTION_MAX_LENGTH)
  readonly description?: string;
}
