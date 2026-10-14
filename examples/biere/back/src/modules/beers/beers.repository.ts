import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Brackets, In, Not, Repository } from "typeorm";
import type { SelectQueryBuilder } from "typeorm";
import { escapeLikePattern } from "@/common/text/escape-like-pattern";
import { normalizeSearchText } from "@/common/text/normalize-search-text";
import type { BeerDto } from "@/modules/beers/dtos/beer.dto";
import type { BeerFacetsDto } from "@/modules/beers/dtos/beer-facets.dto";
import type { BeerFilters } from "@/modules/beers/dtos/beer-filters.dto";
import type { FacetCountDto } from "@/modules/beers/dtos/facet-count.dto";
import type { BeerSliceDto } from "@/modules/beers/dtos/beer-slice.dto";
import type { RatingSummaryDto } from "@/modules/beers/dtos/rating-summary.dto";
import type { ReviewStatsDto } from "@/modules/beers/dtos/review-stats.dto";
import type { ReviewRecordDto } from "@/modules/beers/dtos/review-record.dto";
import type { ReviewRecordSliceDto } from "@/modules/beers/dtos/review-record-slice.dto";
import type { BeerStyleGroupDto } from "@/modules/beers/dtos/beer-style-group.dto";
import { Beer } from "@/modules/beers/entities/beer.entity";
import { BeerStyle } from "@/modules/beers/entities/beer-style.entity";
import { Review } from "@/modules/beers/entities/review.entity";
import { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";
import { BeerFormatEnum } from "@/modules/beers/enums/beer-format.enum";
import { ReviewCriterionEnum } from "@/modules/beers/enums/review-criterion.enum";
import { BEER_SORT_ORDERS } from "@/modules/beers/enums/beer-sort.enum";
import type { BeerSortEnum } from "@/modules/beers/enums/beer-sort.enum";
import { toBeerDto } from "@/modules/beers/mappers/beer.mapper";
import { toBeerStyleGroupDtos } from "@/modules/beers/mappers/beer-style.mapper";
import { toFacetCountDto } from "@/modules/beers/mappers/facet-count.mapper";
import { toReviewRecordDto } from "@/modules/beers/mappers/review.mapper";
import { toRatingSummaryDto, toReviewStatsDto } from "@/modules/beers/mappers/review-stats.mapper";
import type { RawCriteriaRow, RawRatingBucketRow, RawRatingSummaryRow } from "@/modules/beers/mappers/review-stats.mapper";

const NO_BEER_CONDITION = "1 = 0";

const FORMATS_LIST_EXPRESSION = "(',' || beer.formats || ',')";

const toFormatPattern = (format: BeerFormatEnum): string => `%,${format},%`;

const hasCount = (facet: { readonly count: number }): boolean => facet.count > 0;

const withoutFamily = (filters: BeerFilters): BeerFilters => ({ ...filters, family: undefined, styleIds: undefined });

const withoutCountries = (filters: BeerFilters): BeerFilters => ({ ...filters, countries: undefined });

const withoutFormats = (filters: BeerFilters): BeerFilters => ({ ...filters, formats: undefined });

interface RawFacetRow {
  readonly value: string;
  readonly count: number | string;
}

@Injectable()
export class BeersRepository {
  constructor(
    @InjectRepository(Beer) private readonly beers: Repository<Beer>,
    @InjectRepository(BeerStyle) private readonly styles: Repository<BeerStyle>,
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
  ) {}

  async findStyleGroups(): Promise<BeerStyleGroupDto[]> {
    const entities = await this.styles.find({ order: { name: "ASC", id: "ASC" } });
    return toBeerStyleGroupDtos(entities);
  }

  async findPage(
    search: string,
    filters: BeerFilters,
    sort: BeerSortEnum,
    page: number,
    size: number,
  ): Promise<BeerSliceDto> {
    const query = this.beers
      .createQueryBuilder("beer")
      .leftJoinAndSelect("beer.brewery", "brewery")
      .leftJoinAndSelect("beer.style", "style");
    this.applyConditions(query, search, filters);
    BEER_SORT_ORDERS[sort].forEach((column) => query.addOrderBy(column.expression, column.direction));
    const [entities, total] = await query
      .addOrderBy("beer.id", "ASC")
      .offset((page - 1) * size)
      .limit(size)
      .getManyAndCount();
    return { items: entities.map(toBeerDto), total };
  }

  async findFacets(search: string, filters: BeerFilters): Promise<BeerFacetsDto> {
    const [families, countries, formats] = await Promise.all([
      this.findFamilyFacet(search, withoutFamily(filters)),
      this.findCountryFacet(search, withoutCountries(filters)),
      this.findFormatFacet(search, withoutFormats(filters)),
    ]);
    return { families, countries, formats };
  }

  async findById(id: number): Promise<BeerDto | null> {
    const entity = await this.beers.findOne({ where: { id }, relations: { brewery: true, style: true } });
    return entity === null ? null : toBeerDto(entity);
  }

  async findByIds(ids: readonly number[]): Promise<BeerDto[]> {
    if (ids.length === 0) {
      return [];
    }
    const entities = await this.beers.find({
      where: { id: In([...ids]) },
      relations: { brewery: true, style: true },
      order: { id: "ASC" },
    });
    return entities.map(toBeerDto);
  }

  async findReview(userId: number, beerId: number): Promise<ReviewRecordDto | null> {
    const entity = await this.reviews.findOneBy({ userId, beerId });
    return entity === null ? null : toReviewRecordDto(entity);
  }

  async findReviewPage(beerId: number, excludedUserId: number, page: number, size: number): Promise<ReviewRecordSliceDto> {
    const [entities, total] = await this.reviews.findAndCount({
      where: { beerId, userId: Not(excludedUserId) },
      order: { updatedAt: "DESC", id: "DESC" },
      skip: (page - 1) * size,
      take: size,
    });
    return { items: entities.map(toReviewRecordDto), total };
  }

  async findRatingSummaries(beerIds: readonly number[]): Promise<RatingSummaryDto[]> {
    if (beerIds.length === 0) {
      return [];
    }
    const rows = await this.reviews
      .createQueryBuilder("review")
      .select("review.beerId", "beerId")
      .addSelect("ROUND(AVG(review.rating), 1)", "averageRating")
      .addSelect("COUNT(*)", "reviewCount")
      .where("review.beerId IN (:...beerIds)", { beerIds })
      .groupBy("review.beerId")
      .orderBy("review.beerId", "ASC")
      .getRawMany<RawRatingSummaryRow>();
    return rows.map(toRatingSummaryDto);
  }

  async findReviewStats(beerId: number): Promise<ReviewStatsDto> {
    const bucketRows = await this.reviews
      .createQueryBuilder("review")
      .select("CAST(review.rating AS INTEGER)", "stars")
      .addSelect("COUNT(*)", "count")
      .where("review.beerId = :beerId", { beerId })
      .groupBy("CAST(review.rating AS INTEGER)")
      .getRawMany<RawRatingBucketRow>();
    const criteriaQuery = this.reviews.createQueryBuilder("review").where("review.beerId = :beerId", { beerId });
    Object.values(ReviewCriterionEnum).forEach((criterion) => {
      criteriaQuery.addSelect(`ROUND(AVG(review.${criterion}), 1)`, `${criterion}Average`);
      criteriaQuery.addSelect(`COUNT(review.${criterion})`, `${criterion}Count`);
    });
    const [criteriaRow] = await criteriaQuery.getRawMany<RawCriteriaRow>();
    return toReviewStatsDto(bucketRows, criteriaRow);
  }

  async upsertReview(row: Omit<Review, "id">): Promise<ReviewRecordDto> {
    await this.reviews
      .createQueryBuilder()
      .insert()
      .values(row)
      .orUpdate(["rating", "text", "sweetness", "acidity", "body", "updatedAt"], ["userId", "beerId"])
      .execute();
    const entity = await this.reviews.findOneByOrFail({ userId: row.userId, beerId: row.beerId });
    return toReviewRecordDto(entity);
  }

  async deleteReview(userId: number, beerId: number): Promise<boolean> {
    const result = await this.reviews.delete({ userId, beerId });
    return result.affected === 1;
  }

  private async findFamilyFacet(search: string, filters: BeerFilters): Promise<FacetCountDto[]> {
    const rows = await this.createFacetQuery(search, filters)
      .select("style.family", "value")
      .addSelect("COUNT(*)", "count")
      .groupBy("style.family")
      .getRawMany<RawFacetRow>();
    const families = Object.values(BeerFamilyEnum);
    return rows
      .map(toFacetCountDto)
      .sort((left, right) => families.indexOf(left.value as BeerFamilyEnum) - families.indexOf(right.value as BeerFamilyEnum));
  }

  private async findCountryFacet(search: string, filters: BeerFilters): Promise<FacetCountDto[]> {
    const rows = await this.createFacetQuery(search, filters)
      .select("beer.country", "value")
      .addSelect("COUNT(*)", "count")
      .groupBy("beer.country")
      .orderBy("COUNT(*)", "DESC")
      .addOrderBy("beer.country", "ASC")
      .getRawMany<RawFacetRow>();
    return rows.map(toFacetCountDto);
  }

  private async findFormatFacet(search: string, filters: BeerFilters): Promise<FacetCountDto[]> {
    const formats = Object.values(BeerFormatEnum);
    const query = this.createFacetQuery(search, filters);
    formats.forEach((format, index) => {
      query.addSelect(`SUM(CASE WHEN ${FORMATS_LIST_EXPRESSION} LIKE :facetFormat${index} THEN 1 ELSE 0 END)`, format);
      query.setParameter(`facetFormat${index}`, toFormatPattern(format));
    });
    const [row] = await query.getRawMany<Record<BeerFormatEnum, number | string | null>>();
    return formats
      .map((format) => toFacetCountDto({ value: format, count: row[format] ?? 0 }))
      .filter(hasCount);
  }

  private createFacetQuery(search: string, filters: BeerFilters): SelectQueryBuilder<Beer> {
    const query = this.beers.createQueryBuilder("beer").innerJoin("beer.style", "style");
    this.applyConditions(query, search, filters);
    return query;
  }

  private applyConditions(query: SelectQueryBuilder<Beer>, search: string, filters: BeerFilters): void {
    query.leftJoin(
      (subQuery) =>
        subQuery
          .select("review.beerId", "beerId")
          .addSelect("ROUND(AVG(review.rating), 1)", "averageRating")
          .addSelect("COUNT(*)", "reviewCount")
          .from(Review, "review")
          .groupBy("review.beerId"),
      "rating",
      "rating.beerId = beer.id",
    );
    const term = normalizeSearchText(search);
    if (term !== "") {
      query.andWhere("beer.searchText LIKE :pattern ESCAPE '\\'", { pattern: `%${escapeLikePattern(term)}%` });
    }
    if (filters.family !== undefined) {
      query.andWhere("style.family = :family", { family: filters.family });
    }
    if (filters.styleIds !== undefined) {
      query.andWhere("style.id IN (:...styleIds)", { styleIds: filters.styleIds });
    }
    if (filters.countries !== undefined) {
      query.andWhere("beer.country IN (:...countries)", { countries: filters.countries });
    }
    if (filters.formats !== undefined) {
      const formats = filters.formats;
      query.andWhere(
        new Brackets((brackets) =>
          formats.forEach((format, index) =>
            brackets.orWhere(`${FORMATS_LIST_EXPRESSION} LIKE :format${index}`, { [`format${index}`]: toFormatPattern(format) }),
          ),
        ),
      );
    }
    if (filters.abvMin !== undefined) {
      query.andWhere("beer.abv >= :abvMin", { abvMin: filters.abvMin });
    }
    if (filters.abvMax !== undefined) {
      query.andWhere("beer.abv <= :abvMax", { abvMax: filters.abvMax });
    }
    if (filters.minRating !== undefined) {
      query.andWhere("rating.averageRating >= :minRating", { minRating: filters.minRating });
    }
    if (filters.beerIds !== undefined) {
      if (filters.beerIds.length === 0) {
        query.andWhere(NO_BEER_CONDITION);
      } else {
        query.andWhere("beer.id IN (:...beerIds)", { beerIds: filters.beerIds });
      }
    }
    if (filters.excludedBeerIds !== undefined && filters.excludedBeerIds.length > 0) {
      query.andWhere("beer.id NOT IN (:...excludedBeerIds)", { excludedBeerIds: filters.excludedBeerIds });
    }
  }
}
