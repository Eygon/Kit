import { Transform } from "class-transformer";
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
  ValidateIf,
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

const isSupplied = (_dto: object, value: unknown): boolean => value !== undefined;

const trimString = ({ value }: { value: unknown }): unknown => (typeof value === "string" ? value.trim() : value);

const normalizeComment = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? normalizeLineEndings(value) : value;

export class UpdateCheckinDto {
  @ValidateIf(isSupplied)
  @IsISO8601({ strict: true })
  readonly drankAt?: string;

  @ValidateIf(isSupplied)
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(CHECKIN_PLACE_MAX_LENGTH)
  readonly place?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  readonly venueId?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(CHECKIN_RATING_MIN)
  @Max(CHECKIN_RATING_MAX)
  @IsMultipleOf(CHECKIN_RATING_STEP)
  readonly rating?: number | null;

  @ValidateIf(isSupplied)
  @IsArray()
  @ArrayMaxSize(CHECKIN_AROMAS_MAX)
  @ArrayUnique()
  @IsEnum(BeerAromaEnum, { each: true })
  readonly aromas?: BeerAromaEnum[];

  @ValidateIf(isSupplied)
  @IsEnum(BeerFormatEnum)
  readonly format?: BeerFormatEnum;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: CHECKIN_PRICE_DECIMALS })
  @Min(0)
  @Max(CHECKIN_PRICE_MAX)
  readonly price?: number | null;

  @ValidateIf(isSupplied)
  @Transform(normalizeComment)
  @IsString()
  @MaxLength(CHECKIN_COMMENT_MAX_LENGTH)
  readonly comment?: string;
}

export const hasAnySuppliedValue = (dto: UpdateCheckinDto): boolean =>
  Object.values(dto).some((value) => value !== undefined);
