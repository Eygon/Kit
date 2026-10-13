import type { BeerPageDto } from "@/types/dtos/beer/beerPageDto";
import { beerDtoToModel } from "@/types/mappers/beer/beerMapper";
import { beerFacetsDtoToModel } from "@/types/mappers/beer/beerFacetsMapper";
import type { BeerPage } from "@/types/models/beer/beerPage";

export const beerPageDtoToModel = (dto: BeerPageDto): BeerPage => ({
  items: dto.items.map(beerDtoToModel),
  total: dto.total,
  page: dto.page,
  size: dto.size,
  facets: beerFacetsDtoToModel(dto.facets),
});
