import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { BEER_PAGE_SIZE_DEFAULT } from "@/modules/beers/beers.constants";
import { BeersRepository } from "@/modules/beers/beers.repository";
import type { BeerDto } from "@/modules/beers/dtos/beer.dto";
import type { CatalogTotalsDto } from "@/modules/beers/dtos/catalog-totals.dto";
import type { BeerFilters } from "@/modules/beers/dtos/beer-filters.dto";
import type { BeerPageDto } from "@/modules/beers/dtos/beer-page.dto";
import type { BeerStyleGroupDto } from "@/modules/beers/dtos/beer-style-group.dto";
import type { BeersQueryDto } from "@/modules/beers/dtos/beers-query.dto";
import type { CatalogBeerDto } from "@/modules/beers/dtos/catalog-beer.dto";
import { BeerSortEnum } from "@/modules/beers/enums/beer-sort.enum";
import { BeerStatusEnum } from "@/modules/beers/enums/beer-status.enum";
import { toCatalogBeerDto } from "@/modules/beers/mappers/beer.mapper";
import { TastingsService } from "@/modules/tastings/tastings.service";

const FIRST_PAGE = 1;

const toFilters = (query: BeersQueryDto): BeerFilters => ({
  family: query.family,
  styleIds: query.style,
  countries: query.country,
  formats: query.format,
  abvMin: query.abvMin,
  abvMax: query.abvMax,
});

@Injectable()
export class BeersService {
  constructor(
    private readonly beersRepository: BeersRepository,
    private readonly tastingsService: TastingsService,
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
    const states = await this.tastingsService.getBeerStates(
      userId,
      slice.items.map((beer) => beer.id),
    );
    const stateByBeerId = new Map(states.map((state) => [state.beerId, state]));
    const items = slice.items.map((beer) => toCatalogBeerDto(beer, stateByBeerId.get(beer.id)));
    return { items, total: slice.total, page, size, facets };
  }

  async getBeerForUser(userId: number, id: number): Promise<CatalogBeerDto> {
    const beer = await this.getBeer(id);
    const [state] = await this.tastingsService.getBeerStates(userId, [id]);
    return toCatalogBeerDto(beer, state);
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
