import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { IsMultipleOf } from "@/common/validation/is-multiple-of";
import { normalizeLineEndings } from "@/common/text/normalize-line-endings";
import { BeerAromaEnum } from "@/modules/beers/enums/beer-aroma.enum";
import { BeerFormatEnum } from "@/modules/beers/enums/beer-format.enum";
import {
  CHECKIN_AROMAS_MAX,
  CHECKIN_COMMENT_MAX_LENGTH,
  CHECKIN_PLACE_MAX_LENGTH,
  CHECKIN_PRICE_DECIMALS,
  CHECKIN_PRICE_MAX,
  CHECKIN_RATING_MAX,
  CHECKIN_RATING_MIN,
  CHECKIN_RATING_STEP,
} from "@/modules/tastings/tastings.constants";

const AROMA_SEPARATOR = ",";

const trimString = ({ value }: { value: unknown }): unknown => (typeof value === "string" ? value.trim() : value);

const normalizeComment = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? normalizeLineEndings(value) : value;

const splitAromas = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== "string") {
    return value;
  }
  return value === "" ? [] : value.split(AROMA_SEPARATOR);
};

export class CreateCheckinDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  readonly beerId!: number;

  @IsISO8601({ strict: true })
  readonly drankAt!: string;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(CHECKIN_PLACE_MAX_LENGTH)
  readonly place!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  readonly venueId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(CHECKIN_RATING_MIN)
  @Max(CHECKIN_RATING_MAX)
  @IsMultipleOf(CHECKIN_RATING_STEP)
  readonly rating?: number;

  @IsOptional()
  @Transform(splitAromas)
  @IsArray()
  @ArrayMaxSize(CHECKIN_AROMAS_MAX)
  @ArrayUnique()
  @IsEnum(BeerAromaEnum, { each: true })
  readonly aromas?: BeerAromaEnum[];

  @IsEnum(BeerFormatEnum)
  readonly format!: BeerFormatEnum;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: CHECKIN_PRICE_DECIMALS })
  @Min(0)
  @Max(CHECKIN_PRICE_MAX)
  readonly price?: number;

  @IsOptional()
  @Transform(normalizeComment)
  @IsString()
  @MaxLength(CHECKIN_COMMENT_MAX_LENGTH)
  readonly comment?: string;
}
