import { isBeerFamily } from "@/types/enums/beer/beerFamilyEnum";
import type { BeerStyleGroupDto } from "@/types/dtos/beerStyle/beerStyleGroupDto";
import type { BeerStyleGroup } from "@/types/models/beerStyle/beerStyleGroup";

export const beerStyleGroupDtosToModel = (dtos: BeerStyleGroupDto[]): BeerStyleGroup[] =>
  dtos.flatMap((dto) =>
    isBeerFamily(dto.family)
      ? [
          {
            family: dto.family,
            styles: dto.styles.map(({ id, name, description }) => ({ id, name, description })),
          },
        ]
      : [],
  );
