import type { DexBeerDto } from "@/types/dtos/dex/dexBeerDto";
import type { DexDto } from "@/types/dtos/dex/dexDto";
import type { DexFamilyDto } from "@/types/dtos/dex/dexFamilyDto";
import { isBeerFamily } from "@/types/enums/beer/beerFamilyEnum";
import type { Dex } from "@/types/models/dex/dex";
import type { DexBeer } from "@/types/models/dex/dexBeer";
import type { DexFamily } from "@/types/models/dex/dexFamily";

const dexFamilyDtosToModels = (dtos: DexFamilyDto[]): DexFamily[] =>
  dtos.flatMap(({ family, discovered, total }) => (isBeerFamily(family) ? [{ family, discovered, total }] : []));

const dexBeerDtoToModel = (dto: DexBeerDto): DexBeer => ({
  beerId: dto.beerId,
  firstCheckinAt: dto.firstCheckinAt,
  lastCheckinAt: dto.lastCheckinAt,
});

export const dexDtoToModel = (dto: DexDto): Dex => ({
  discovered: dto.discovered,
  total: dto.total,
  families: dexFamilyDtosToModels(dto.families),
  beers: dto.beers.map(dexBeerDtoToModel),
});
