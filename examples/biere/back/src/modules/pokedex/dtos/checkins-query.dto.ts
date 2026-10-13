import { Type } from "class-transformer";
import { IsInt, IsOptional, Min } from "class-validator";

export class CheckinsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  readonly beerId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  readonly page?: number;
}
