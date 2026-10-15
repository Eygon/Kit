import { normalizeSearchText } from "@/common/text/normalize-search-text";
import type { BeerDetailDto } from "@/modules/beers/dtos/beer-detail.dto";
import type { CatalogBeerDto } from "@/modules/beers/dtos/catalog-beer.dto";
import type { CreateBeerDto } from "@/modules/beers/dtos/create-beer.dto";
import type { RatingSummaryDto } from "@/modules/beers/dtos/rating-summary.dto";
import type { ReviewStatsDto } from "@/modules/beers/dtos/review-stats.dto";
import { BeerSourceEnum } from "@/modules/beers/enums/beer-source.enum";
import type { BeerUserStateDto } from "@/modules/tastings/dtos/beer-user-state.dto";
import { toBitternessLevel, toColorLevel, toLevelRange } from "@/modules/beers/beer-levels";
import type { BeerDto } from "@/modules/beers/dtos/beer.dto";
import type { BeerSearchCandidateDto } from "@/modules/beers/dtos/beer-search-candidate.dto";
import type { Beer } from "@/modules/beers/entities/beer.entity";
import type { BeerStyle } from "@/modules/beers/entities/beer-style.entity";
import type { Brewery } from "@/modules/beers/entities/brewery.entity";

export type BeerInsertRow = Omit<Beer, "id" | "brewery" | "style">;

export const toBeerDto = (entity: Beer & { brewery: Brewery; style: BeerStyle }): BeerDto => ({
  id: entity.id,
  name: entity.name,
  breweryName: entity.brewery.name,
  country: entity.country,
  styleId: entity.style.id,
  styleName: entity.style.name,
  family: entity.style.family,
  abv: entity.abv,
  ibu: entity.ibu,
  ebc: entity.ebc,
  sweetness: entity.sweetness,
  acidity: entity.acidity,
  body: entity.body,
  aromas: entity.aromas,
  formats: entity.formats,
  description: entity.description,
  bitternessLevel: toBitternessLevel(entity.ibu),
  colorLevel: toColorLevel(entity.ebc),
  styleColorRange: entity.ebc === null ? toLevelRange(entity.style.ebcMin, entity.style.ebcMax) : null,
  source: entity.createdBy === null ? BeerSourceEnum.OFFICIAL : BeerSourceEnum.COMMUNITY,
  createdBy: entity.createdBy,
});

export const toBeerSearchCandidateDto = (entity: Pick<Beer, "id" | "searchText">): BeerSearchCandidateDto => ({
  id: entity.id,
  searchText: entity.searchText,
});

export const toCatalogBeerDto = (
  beer: BeerDto,
  state: BeerUserStateDto | undefined,
  summary: RatingSummaryDto | undefined,
  createdByName: string | null,
): CatalogBeerDto => ({
  id: beer.id,
  name: beer.name,
  breweryName: beer.breweryName,
  country: beer.country,
  styleId: beer.styleId,
  styleName: beer.styleName,
  family: beer.family,
  abv: beer.abv,
  ibu: beer.ibu,
  ebc: beer.ebc,
  sweetness: beer.sweetness,
  acidity: beer.acidity,
  body: beer.body,
  aromas: beer.aromas,
  formats: beer.formats,
  description: beer.description,
  bitternessLevel: beer.bitternessLevel,
  colorLevel: beer.colorLevel,
  styleColorRange: beer.styleColorRange,
  source: beer.source,
  createdBy: beer.createdBy,
  createdByName,
  drunk: state?.drunk ?? false,
  checkinCount: state?.checkinCount ?? 0,
  inWishlist: state?.inWishlist ?? false,
  averageRating: summary?.averageRating ?? null,
  reviewCount: summary?.reviewCount ?? 0,
});

export const toBeerDetailDto = (catalog: CatalogBeerDto, stats: ReviewStatsDto): BeerDetailDto => ({
  id: catalog.id,
  name: catalog.name,
  breweryName: catalog.breweryName,
  country: catalog.country,
  styleId: catalog.styleId,
  styleName: catalog.styleName,
  family: catalog.family,
  abv: catalog.abv,
  ibu: catalog.ibu,
  ebc: catalog.ebc,
  sweetness: catalog.sweetness,
  acidity: catalog.acidity,
  body: catalog.body,
  aromas: catalog.aromas,
  formats: catalog.formats,
  description: catalog.description,
  bitternessLevel: catalog.bitternessLevel,
  colorLevel: catalog.colorLevel,
  styleColorRange: catalog.styleColorRange,
  source: catalog.source,
  createdBy: catalog.createdBy,
  createdByName: catalog.createdByName,
  drunk: catalog.drunk,
  checkinCount: catalog.checkinCount,
  inWishlist: catalog.inWishlist,
  averageRating: catalog.averageRating,
  reviewCount: catalog.reviewCount,
  ratingDistribution: stats.ratingDistribution,
});

export const toNewBeer = (dto: CreateBeerDto, breweryId: number, userId: number, now: Date): BeerInsertRow => ({
  name: dto.name,
  breweryId,
  styleId: dto.styleId,
  abv: dto.abv,
  ibu: dto.ibu ?? null,
  ebc: dto.ebc ?? null,
  sweetness: dto.sweetness ?? null,
  acidity: dto.acidity ?? null,
  body: dto.body ?? null,
  description: dto.description ?? "",
  aromas: dto.aromas ?? [],
  formats: dto.formats ?? [],
  country: dto.country,
  searchText: normalizeSearchText(`${dto.name} ${dto.breweryName}`),
  createdBy: userId,
  createdAt: now,
});
