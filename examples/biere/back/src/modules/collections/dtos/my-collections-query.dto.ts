import { Type } from "class-transformer";
import { IsInt, IsOptional, Min } from "class-validator";

export class MyCollectionsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  readonly beerId?: number;
}
