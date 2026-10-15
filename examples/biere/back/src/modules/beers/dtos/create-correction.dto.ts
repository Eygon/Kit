import { Transform } from "class-transformer";
import { IsDefined, IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { normalizeLineEndings } from "@/common/text/normalize-line-endings";
import { CORRECTION_REASON_MAX_LENGTH } from "@/modules/beers/beers.constants";
import { BeerCharacteristicEnum } from "@/modules/beers/enums/beer-characteristic.enum";

const normalizeText = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? normalizeLineEndings(value).trim() : value;

export class CreateCorrectionDto {
  @IsEnum(BeerCharacteristicEnum)
  readonly characteristic!: BeerCharacteristicEnum;

  @IsDefined()
  readonly value!: unknown;

  @IsOptional()
  @Transform(normalizeText)
  @IsString()
  @MaxLength(CORRECTION_REASON_MAX_LENGTH)
  readonly reason?: string;
}
