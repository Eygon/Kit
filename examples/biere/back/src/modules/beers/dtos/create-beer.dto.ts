import { Transform } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { normalizeLineEndings } from "@/common/text/normalize-line-endings";
import {
  BEER_ABV_MAX_DECIMAL_PLACES,
  BEER_AROMAS_MAX,
  BEER_DESCRIPTION_MAX_LENGTH,
  BEER_EBC_MAX,
  BEER_EBC_MIN,
  BEER_FORMATS_MAX,
  BEER_IBU_MAX,
  BEER_IBU_MIN,
  BEER_NAME_MAX_LENGTH,
  BEER_NAME_MIN_LENGTH,
  BEER_PROPOSAL_ABV_MAX_PERCENT,
  BEER_SCALE_MAX,
  BEER_SCALE_MIN,
  BREWERY_NAME_MAX_LENGTH,
  BREWERY_NAME_MIN_LENGTH,
  COUNTRY_CODES,
} from "@/modules/beers/beers.constants";
import { BeerAromaEnum } from "@/modules/beers/enums/beer-aroma.enum";
import { BeerFormatEnum } from "@/modules/beers/enums/beer-format.enum";

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

  @IsOptional()
  @IsInt()
  @Min(BEER_IBU_MIN)
  @Max(BEER_IBU_MAX)
  readonly ibu?: number;

  @IsOptional()
  @IsInt()
  @Min(BEER_EBC_MIN)
  @Max(BEER_EBC_MAX)
  readonly ebc?: number;

  @IsOptional()
  @IsInt()
  @Min(BEER_SCALE_MIN)
  @Max(BEER_SCALE_MAX)
  readonly sweetness?: number;

  @IsOptional()
  @IsInt()
  @Min(BEER_SCALE_MIN)
  @Max(BEER_SCALE_MAX)
  readonly acidity?: number;

  @IsOptional()
  @IsInt()
  @Min(BEER_SCALE_MIN)
  @Max(BEER_SCALE_MAX)
  readonly body?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(BEER_AROMAS_MAX)
  @ArrayUnique()
  @IsEnum(BeerAromaEnum, { each: true })
  readonly aromas?: BeerAromaEnum[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(BEER_FORMATS_MAX)
  @ArrayUnique()
  @IsEnum(BeerFormatEnum, { each: true })
  readonly formats?: BeerFormatEnum[];
}
