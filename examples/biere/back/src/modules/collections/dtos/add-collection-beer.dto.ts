import { IsInt, Min } from "class-validator";

export class AddCollectionBeerDto {
  @IsInt()
  @Min(1)
  readonly beerId!: number;
}
