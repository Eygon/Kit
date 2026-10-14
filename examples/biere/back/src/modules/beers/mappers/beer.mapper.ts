import { REVIEW_CRITERION_MIN_REVIEWS } from "@/modules/beers/beers.constants";
import type { BeerDetailDto } from "@/modules/beers/dtos/beer-detail.dto";
import type { CatalogBeerDto } from "@/modules/beers/dtos/catalog-beer.dto";
import type { CriterionAverageDto } from "@/modules/beers/dtos/criterion-average.dto";
import type { RatingSummaryDto } from "@/modules/beers/dtos/rating-summary.dto";
import type { ReviewStatsDto } from "@/modules/beers/dtos/review-stats.dto";
import { ReviewCriterionEnum } from "@/modules/beers/enums/review-criterion.enum";
import type { BeerUserStateDto } from "@/modules/tastings/dtos/beer-user-state.dto";
import { toBitternessLevel, toColorLevel, toLevelRange } from "@/modules/beers/beer-levels";
import type { BeerDto } from "@/modules/beers/dtos/beer.dto";
import type { Beer } from "@/modules/beers/entities/beer.entity";
import type { BeerStyle } from "@/modules/beers/entities/beer-style.entity";
import type { Brewery } from "@/modules/beers/entities/brewery.entity";

export const toBeerDto = (entity: Beer & { brewery: Brewery; style: BeerStyle }): BeerDto => ({
  id: entity.id,
  name: entity.name,
  breweryName: entity.brewery.name,
  country: entity.country,
  styleId: entity.style.id,
  styleName: entity.style.name,
  family: entity.style.family,
  abv: entity.abv,
  aromas: entity.aromas,
  formats: entity.formats,
  description: entity.description,
  bitternessLevel: toBitternessLevel(entity.ibu),
  colorLevel: toColorLevel(entity.ebc),
  styleColorRange: entity.ebc === null ? toLevelRange(entity.style.ebcMin, entity.style.ebcMax) : null,
});

const CRITERION_ORDER: readonly ReviewCriterionEnum[] = Object.values(ReviewCriterionEnum);

const byCriterionOrder = (left: CriterionAverageDto, right: CriterionAverageDto): number =>
  CRITERION_ORDER.indexOf(left.criterion) - CRITERION_ORDER.indexOf(right.criterion);

const toDisplayedCriterion = (criterion: CriterionAverageDto): CriterionAverageDto => ({
  criterion: criterion.criterion,
  average: criterion.count < REVIEW_CRITERION_MIN_REVIEWS ? null : criterion.average,
  count: criterion.count,
});

export const toCatalogBeerDto = (
  beer: BeerDto,
  state: BeerUserStateDto | undefined,
  summary: RatingSummaryDto | undefined,
): CatalogBeerDto => ({
  id: beer.id,
  name: beer.name,
  breweryName: beer.breweryName,
  country: beer.country,
  styleId: beer.styleId,
  styleName: beer.styleName,
  family: beer.family,
  abv: beer.abv,
  aromas: beer.aromas,
  formats: beer.formats,
  description: beer.description,
  bitternessLevel: beer.bitternessLevel,
  colorLevel: beer.colorLevel,
  styleColorRange: beer.styleColorRange,
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
  aromas: catalog.aromas,
  formats: catalog.formats,
  description: catalog.description,
  bitternessLevel: catalog.bitternessLevel,
  colorLevel: catalog.colorLevel,
  styleColorRange: catalog.styleColorRange,
  drunk: catalog.drunk,
  checkinCount: catalog.checkinCount,
  inWishlist: catalog.inWishlist,
  averageRating: catalog.averageRating,
  reviewCount: catalog.reviewCount,
  ratingDistribution: stats.ratingDistribution,
  criteria: [...stats.criteria].sort(byCriterionOrder).map(toDisplayedCriterion),
});
