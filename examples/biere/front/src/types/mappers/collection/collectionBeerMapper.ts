import type { CollectionBeerDto } from "@/types/dtos/collection/collectionBeerDto";
import { isBeerFamily } from "@/types/enums/beer/beerFamilyEnum";
import type { CollectionBeer } from "@/types/models/collection/collectionBeer";

export const collectionBeerDtoToModel = (dto: CollectionBeerDto): CollectionBeer => ({
  beerId: dto.beerId ?? 0,
  beerName: dto.beerName ?? "",
  styleName: dto.styleName ?? "",
  family: isBeerFamily(dto.family) ? dto.family : null,
  drunkByMe: dto.drunkByMe ?? false,
  addedAt: dto.addedAt ? new Date(dto.addedAt) : null,
});
