import { isBeerFamily } from "@/types/enums/beer/beerFamilyEnum";
import { isBeerFormat } from "@/types/enums/beer/beerFormatEnum";
import type { BeerFacetsDto } from "@/types/dtos/beer/beerFacetsDto";
import { facetCountDtosToModel } from "@/types/mappers/beer/facetCountMapper";
import type { BeerFacets } from "@/types/models/beer/beerFacets";

const anyFacetValue = (value: unknown): value is string => typeof value === "string";

export const beerFacetsDtoToModel = (dto: BeerFacetsDto): BeerFacets => ({
  families: facetCountDtosToModel(dto.families, isBeerFamily),
  countries: facetCountDtosToModel(dto.countries, anyFacetValue),
  formats: facetCountDtosToModel(dto.formats, isBeerFormat),
});
