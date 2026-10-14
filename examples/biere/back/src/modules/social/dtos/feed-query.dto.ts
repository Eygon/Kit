import { Type } from "class-transformer";
import { IsInt, IsOptional, Min } from "class-validator";

export class FeedQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  readonly page?: number;
}
