import { IsInt, Min } from "class-validator";

export class ReportVenueBeerDto {
  @IsInt()
  @Min(1)
  readonly beerId!: number;
}
