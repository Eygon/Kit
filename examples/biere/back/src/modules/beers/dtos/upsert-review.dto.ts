import { Transform } from "class-transformer";
import { IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { normalizeLineEndings } from "@/common/text/normalize-line-endings";
import { IsMultipleOf } from "@/common/validation/is-multiple-of";
import {
  REVIEW_CRITERION_MAX,
  REVIEW_CRITERION_MIN,
  REVIEW_RATING_MAX,
  REVIEW_RATING_MIN,
  REVIEW_RATING_STEP,
  REVIEW_TEXT_MAX_LENGTH,
} from "@/modules/beers/beers.constants";

const normalizeText = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? normalizeLineEndings(value).trim() : value;

export class UpsertReviewDto {
  @IsNumber()
  @Min(REVIEW_RATING_MIN)
  @Max(REVIEW_RATING_MAX)
  @IsMultipleOf(REVIEW_RATING_STEP)
  readonly rating!: number;

  @IsOptional()
  @Transform(normalizeText)
  @IsString()
  @MaxLength(REVIEW_TEXT_MAX_LENGTH)
  readonly text?: string;

  @IsOptional()
  @IsInt()
  @Min(REVIEW_CRITERION_MIN)
  @Max(REVIEW_CRITERION_MAX)
  readonly sweetness?: number | null;

  @IsOptional()
  @IsInt()
  @Min(REVIEW_CRITERION_MIN)
  @Max(REVIEW_CRITERION_MAX)
  readonly acidity?: number | null;

  @IsOptional()
  @IsInt()
  @Min(REVIEW_CRITERION_MIN)
  @Max(REVIEW_CRITERION_MAX)
  readonly body?: number | null;
}
