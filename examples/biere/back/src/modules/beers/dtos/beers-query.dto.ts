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
import { BEER_ABV_MAX_PERCENT, BEER_PAGE_SIZE_MAX, BEER_SEARCH_MAX_LENGTH } from "@/modules/beers/beers.constants";
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
}
