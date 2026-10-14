import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { BEER_PAGE_SIZE_DEFAULT, REVIEW_PAGE_SIZE } from "@/modules/beers/beers.constants";
import { BeersRepository } from "@/modules/beers/beers.repository";
import type { BeerDto } from "@/modules/beers/dtos/beer.dto";
import type { ReviewDto } from "@/modules/beers/dtos/review.dto";
import type { ReviewPageDto } from "@/modules/beers/dtos/review-page.dto";
import type { ReviewsQueryDto } from "@/modules/beers/dtos/reviews-query.dto";
import type { UpsertReviewDto } from "@/modules/beers/dtos/upsert-review.dto";
import type { CatalogTotalsDto } from "@/modules/beers/dtos/catalog-totals.dto";
import type { BeerFilters } from "@/modules/beers/dtos/beer-filters.dto";
import type { BeerPageDto } from "@/modules/beers/dtos/beer-page.dto";
import type { BeerStyleGroupDto } from "@/modules/beers/dtos/beer-style-group.dto";
import type { BeersQueryDto } from "@/modules/beers/dtos/beers-query.dto";
import type { BeerDetailDto } from "@/modules/beers/dtos/beer-detail.dto";
import { BeerSortEnum } from "@/modules/beers/enums/beer-sort.enum";
import { BeerStatusEnum } from "@/modules/beers/enums/beer-status.enum";
import { toBeerDetailDto, toCatalogBeerDto } from "@/modules/beers/mappers/beer.mapper";
import { toNewReview, toReviewDto, toReviewPageDto } from "@/modules/beers/mappers/review.mapper";
import { TastingsService } from "@/modules/tastings/tastings.service";
import { UsersService } from "@/modules/users/users.service";

const FIRST_PAGE = 1;

const toFilters = (query: BeersQueryDto): BeerFilters => ({
  family: query.family,
  styleIds: query.style,
  countries: query.country,
  formats: query.format,
  abvMin: query.abvMin,
  abvMax: query.abvMax,
  minRating: query.minRating,
});

@Injectable()
export class BeersService {
  constructor(
    private readonly beersRepository: BeersRepository,
    private readonly tastingsService: TastingsService,
    private readonly usersService: UsersService,
  ) {}

  async getBeers(userId: number, query: BeersQueryDto): Promise<BeerPageDto> {
    const page = query.page ?? FIRST_PAGE;
    const size = query.size ?? BEER_PAGE_SIZE_DEFAULT;
    const search = query.q?.trim() ?? "";
    const queryFilters = toFilters(query);
    if (queryFilters.abvMin !== undefined && queryFilters.abvMax !== undefined && queryFilters.abvMin > queryFilters.abvMax) {
      throw new BadRequestException("abvMin must not be greater than abvMax.");
    }
    const filters = { ...queryFilters, ...(await this.getStatusFilters(userId, query.status)) };
    const [slice, facets] = await Promise.all([
      this.beersRepository.findPage(search, filters, query.sort ?? BeerSortEnum.NAME, page, size),
      this.beersRepository.findFacets(search, filters),
    ]);
    const beerIds = slice.items.map((beer) => beer.id);
    const [states, summaries] = await Promise.all([
      this.tastingsService.getBeerStates(userId, beerIds),
      this.beersRepository.findRatingSummaries(beerIds),
    ]);
    const stateByBeerId = new Map(states.map((state) => [state.beerId, state]));
    const summaryByBeerId = new Map(summaries.map((summary) => [summary.beerId, summary]));
    const items = slice.items.map((beer) => toCatalogBeerDto(beer, stateByBeerId.get(beer.id), summaryByBeerId.get(beer.id)));
    return { items, total: slice.total, page, size, facets };
  }

  async getBeerForUser(userId: number, id: number): Promise<BeerDetailDto> {
    const beer = await this.getBeer(id);
    const [[state], [summary], stats] = await Promise.all([
      this.tastingsService.getBeerStates(userId, [id]),
      this.beersRepository.findRatingSummaries([id]),
      this.beersRepository.findReviewStats(id),
    ]);
    return toBeerDetailDto(toCatalogBeerDto(beer, state, summary), stats);
  }

  async getReviewPage(userId: number, beerId: number, query: ReviewsQueryDto): Promise<ReviewPageDto> {
    await this.getBeer(beerId);
    const page = query.page ?? FIRST_PAGE;
    const [mine, slice, users] = await Promise.all([
      this.beersRepository.findReview(userId, beerId),
      this.beersRepository.findReviewPage(beerId, userId, page, REVIEW_PAGE_SIZE),
      this.usersService.getUsers(),
    ]);
    const authorsById = new Map(users.map((user) => [user.id, user]));
    return toReviewPageDto(mine, slice, authorsById, userId, page, REVIEW_PAGE_SIZE);
  }

  async saveMyReview(userId: number, beerId: number, dto: UpsertReviewDto): Promise<ReviewDto> {
    await this.getBeer(beerId);
    const existing = await this.beersRepository.findReview(userId, beerId);
    if (existing === null && (await this.tastingsService.isFirstCheckin(userId, beerId))) {
      throw new ForbiddenException("You must check in this beer before reviewing it.");
    }
    const record = await this.beersRepository.upsertReview(toNewReview(dto, userId, beerId, new Date()));
    const author = await this.usersService.getUser(userId);
    return toReviewDto(record, author, userId);
  }

  async deleteMyReview(userId: number, beerId: number): Promise<void> {
    await this.getBeer(beerId);
    if (!(await this.beersRepository.deleteReview(userId, beerId))) {
      throw new NotFoundException(`You have not reviewed beer ${beerId}.`);
    }
  }

  async getBeer(id: number): Promise<BeerDto> {
    const beer = await this.beersRepository.findById(id);
    if (beer === null) {
      throw new NotFoundException(`Beer ${id} not found.`);
    }
    return beer;
  }

  getBeersByIds(ids: readonly number[]): Promise<BeerDto[]> {
    return this.beersRepository.findByIds(ids);
  }

  async getCatalogTotals(): Promise<CatalogTotalsDto> {
    const facets = await this.beersRepository.findFacets("", {});
    return { total: facets.families.reduce((sum, family) => sum + family.count, 0), families: facets.families };
  }

  getStyleGroups(): Promise<BeerStyleGroupDto[]> {
    return this.beersRepository.findStyleGroups();
  }

  private async getStatusFilters(userId: number, status: BeerStatusEnum | undefined): Promise<BeerFilters> {
    switch (status) {
      case BeerStatusEnum.DRUNK:
        return { beerIds: await this.tastingsService.getDrunkBeerIds(userId) };
      case BeerStatusEnum.WISHLIST:
        return { beerIds: await this.tastingsService.getWishlistBeerIds(userId) };
      case BeerStatusEnum.UNTASTED:
        return { excludedBeerIds: await this.tastingsService.getDrunkBeerIds(userId) };
      case undefined:
        return {};
    }
  }
}
