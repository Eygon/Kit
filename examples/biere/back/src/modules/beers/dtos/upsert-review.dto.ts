import { Transform } from "class-transformer";
import { IsNumber, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { normalizeLineEndings } from "@/common/text/normalize-line-endings";
import { IsMultipleOf } from "@/common/validation/is-multiple-of";
import { REVIEW_RATING_MAX, REVIEW_RATING_MIN, REVIEW_RATING_STEP, REVIEW_TEXT_MAX_LENGTH } from "@/modules/beers/beers.constants";

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
}
