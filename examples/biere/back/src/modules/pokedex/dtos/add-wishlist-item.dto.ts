import { IsInt, Min } from "class-validator";

export class AddWishlistItemDto {
  @IsInt()
  @Min(1)
  readonly beerId!: number;
}
