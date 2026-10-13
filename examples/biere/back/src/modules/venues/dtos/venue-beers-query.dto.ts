import { IsEnum, IsOptional } from "class-validator";
import { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";

export class VenueBeersQueryDto {
  @IsOptional()
  @IsEnum(BeerFamilyEnum)
  readonly family?: BeerFamilyEnum;
}
