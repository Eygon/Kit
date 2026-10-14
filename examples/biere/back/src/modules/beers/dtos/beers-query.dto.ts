import { Transform, Type } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { IsMultipleOf } from "@/common/validation/is-multiple-of";
import {
  BEER_ABV_MAX_PERCENT,
  BEER_PAGE_SIZE_MAX,
  BEER_SEARCH_MAX_LENGTH,
  REVIEW_RATING_MAX,
  REVIEW_RATING_MIN,
  REVIEW_RATING_STEP,
} from "@/modules/beers/beers.constants";
import { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";
import { BeerFormatEnum } from "@/modules/beers/enums/beer-format.enum";
import { BeerSortEnum } from "@/modules/beers/enums/beer-sort.enum";
import { BeerStatusEnum } from "@/modules/beers/enums/beer-status.enum";

const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/;

const toArray = ({ value }: { value: unknown }): unknown => (Array.isArray(value) || value === undefined ? value : [value]);

export class BeersQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(BEER_SEARCH_MAX_LENGTH)
  readonly q?: string;

  @IsOptional()
  @IsEnum(BeerSortEnum)
  readonly sort?: BeerSortEnum;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  readonly page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(BEER_PAGE_SIZE_MAX)
  readonly size?: number;

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
  @Transform(toArray)
  @IsArray()
  @Matches(COUNTRY_CODE_PATTERN, { each: true })
  readonly country?: string[];

  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsEnum(BeerFormatEnum, { each: true })
  readonly format?: BeerFormatEnum[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(BEER_ABV_MAX_PERCENT)
  readonly abvMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(BEER_ABV_MAX_PERCENT)
  readonly abvMax?: number;

  @IsOptional()
  @IsEnum(BeerStatusEnum)
  readonly status?: BeerStatusEnum;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(REVIEW_RATING_MIN)
  @Max(REVIEW_RATING_MAX)
  @IsMultipleOf(REVIEW_RATING_STEP)
  readonly minRating?: number;
}
