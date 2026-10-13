import type { BeerStyleDto } from "@/modules/beers/dtos/beer-style.dto";
import type { BeerStyleGroupDto } from "@/modules/beers/dtos/beer-style-group.dto";
import type { BeerStyle } from "@/modules/beers/entities/beer-style.entity";
import { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";

export const toBeerStyleDto = (entity: BeerStyle): BeerStyleDto => ({
  id: entity.id,
  name: entity.name,
  description: entity.description,
});

export const toBeerStyleGroupDtos = (styles: readonly BeerStyle[]): BeerStyleGroupDto[] =>
  Object.values(BeerFamilyEnum).map((family) => ({
    family,
    styles: styles.filter((style) => style.family === family).map(toBeerStyleDto),
  }));
