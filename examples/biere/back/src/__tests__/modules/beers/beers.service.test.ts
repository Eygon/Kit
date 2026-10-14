import { BadRequestException, ConflictException, ForbiddenException, HttpException, HttpStatus, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BeerSourceEnum } from "@/modules/beers/enums/beer-source.enum";
import {
  BEER_PAGE_SIZE_DEFAULT,
  BEER_PROPOSAL_WINDOW_MS,
  BEER_PROPOSALS_PER_WINDOW_MAX,
  REVIEW_PAGE_SIZE,
} from "@/modules/beers/beers.constants";
import { BeersRepository } from "@/modules/beers/beers.repository";
import { BeersService } from "@/modules/beers/beers.service";
import { TastingsService } from "@/modules/tastings/tastings.service";
import { UsersService } from "@/modules/users/users.service";
import type { BeerDto } from "@/modules/beers/dtos/beer.dto";
import type { BeerFacetsDto } from "@/modules/beers/dtos/beer-facets.dto";
import { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";
import { BeerFormatEnum } from "@/modules/beers/enums/beer-format.enum";
import { BeerSortEnum } from "@/modules/beers/enums/beer-sort.enum";
import { BeerStatusEnum } from "@/modules/beers/enums/beer-status.enum";
import { AvatarEnum } from "@/modules/users/enums/avatar.enum";

const CHIMAY: BeerDto = {
  id: 1,
  name: "Chimay Rouge",
  breweryName: "Bières de Chimay",
  country: "BE",
  styleId: 2,
  styleName: "Dubbel trappiste",
  family: BeerFamilyEnum.TRAPPIST,
  abv: 7,
  aromas: [],
  formats: [],
  description: "Trappiste.",
  bitternessLevel: null,
  colorLevel: null,
  styleColorRange: null,
  source: BeerSourceEnum.OFFICIAL,
  createdBy: null,
};

const ALICE = 1;
const BOB = 2;
const MEMBERS = [
  { id: ALICE, displayName: "Alice", avatarColor: "#F59E0B", avatar: AvatarEnum.HOP },
  { id: BOB, displayName: "Bob", avatarColor: "#10B981", avatar: AvatarEnum.MALT },
];
const ALICE_BEER: BeerDto = { ...CHIMAY, id: 5, name: "Brune du Mont", source: BeerSourceEnum.COMMUNITY, createdBy: ALICE };

const UNTOUCHED_CHIMAY = { ...CHIMAY, createdByName: null, drunk: false, checkinCount: 0, inWishlist: false, averageRating: null, reviewCount: 0 };

const CHIMAY_SUMMARY = { beerId: 1, averageRating: 4.3, reviewCount: 2 };

const CHIMAY_STATS = {
  ratingDistribution: [1, 2, 3, 4, 5].map((stars) => ({ stars, count: stars === 4 ? 2 : 0 })),
  criteria: [
    { criterion: "sweetness", average: 2.7, count: 3 },
    { criterion: "acidity", average: 5, count: 2 },
    { criterion: "body", average: null, count: 0 },
  ],
};

const FACETS: BeerFacetsDto = {
  families: [{ value: "trappist", count: 11 }],
  countries: [{ value: "BE", count: 9 }],
  formats: [{ value: "bottle", count: 11 }],
};

const NO_FILTERS = {
  beerIds: undefined,
  excludedBeerIds: undefined,
  family: undefined,
  styleIds: undefined,
  countries: undefined,
  formats: undefined,
  abvMin: undefined,
  abvMax: undefined,
};

describe("BeersService", () => {
  const repository = {
    findPage: vi.fn(),
    findFacets: vi.fn(),
    findSearchCandidates: vi.fn(),
    findById: vi.fn(),
    findByIds: vi.fn(),
    findStyleGroups: vi.fn(),
    findBreweries: vi.fn(),
    findReview: vi.fn(),
    findReviewsByUsers: vi.fn(),
    upsertReview: vi.fn(),
    deleteReview: vi.fn(),
    findReviewPage: vi.fn(),
    findRatingSummaries: vi.fn(),
    findReviewStats: vi.fn(),
    existsStyle: vi.fn(),
    countCreatedSince: vi.fn(),
    findBeersByBrewery: vi.fn(),
    createBrewery: vi.fn(),
    createBeer: vi.fn(),
  };
  const tastingsService = {
    getBeerStates: vi.fn(),
    getDrunkBeerIds: vi.fn(),
    getWishlistBeerIds: vi.fn(),
    isFirstCheckin: vi.fn(),
  };
  const usersService = { getUser: vi.fn(), getUsers: vi.fn() };
  let service: BeersService;

  beforeEach(async () => {
    vi.resetAllMocks();
    repository.findFacets.mockResolvedValue(FACETS);
    tastingsService.getBeerStates.mockResolvedValue([]);
    repository.findRatingSummaries.mockResolvedValue([]);
    repository.findReviewStats.mockResolvedValue(CHIMAY_STATS);
    usersService.getUsers.mockResolvedValue(MEMBERS);
    const moduleRef = await Test.createTestingModule({
      providers: [
        BeersService,
        { provide: BeersRepository, useValue: repository },
        { provide: TastingsService, useValue: tastingsService },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();
    service = moduleRef.get(BeersService);
  });

  it("applies the defaults: page 1, default size, name sort, no search, no filter", async () => {
    repository.findPage.mockResolvedValue({ items: [CHIMAY], total: 1 });

    expect(await service.getBeers(ALICE, {})).toEqual({
      items: [UNTOUCHED_CHIMAY],
      total: 1,
      page: 1,
      size: BEER_PAGE_SIZE_DEFAULT,
      facets: FACETS,
      isApproximate: false,
    });
    expect(repository.findPage).toHaveBeenCalledWith("", NO_FILTERS, BeerSortEnum.NAME, 1, BEER_PAGE_SIZE_DEFAULT);
    expect(repository.findFacets).toHaveBeenCalledWith("", NO_FILTERS);
  });

  it("passes the trimmed search, the sort, the page and the size", async () => {
    repository.findPage.mockResolvedValue({ items: [], total: 120 });

    expect(await service.getBeers(ALICE, { q: "  chimay  ", sort: BeerSortEnum.ABV, page: 3, size: 5 })).toEqual({
      items: [],
      total: 120,
      page: 3,
      size: 5,
      facets: FACETS,
      isApproximate: false,
    });
    expect(repository.findPage).toHaveBeenCalledWith("chimay", NO_FILTERS, BeerSortEnum.ABV, 3, 5);
    expect(repository.findFacets).toHaveBeenCalledWith("chimay", NO_FILTERS);
  });

  it("turns a blank search into no search", async () => {
    repository.findPage.mockResolvedValue({ items: [], total: 0 });

    await service.getBeers(ALICE, { q: "   " });

    expect(repository.findPage).toHaveBeenCalledWith("", NO_FILTERS, BeerSortEnum.NAME, 1, BEER_PAGE_SIZE_DEFAULT);
  });

  it("hands the same filters to the page and to the facets", async () => {
    repository.findPage.mockResolvedValue({ items: [], total: 0 });
    const filters = {
      family: BeerFamilyEnum.TRAPPIST,
      styleIds: [3, 4],
      countries: ["BE", "NL"],
      formats: [BeerFormatEnum.CAN, BeerFormatEnum.DRAFT],
      abvMin: 0,
      abvMax: 14,
    };

    await service.getBeers(ALICE, {
      family: filters.family,
      style: filters.styleIds,
      country: filters.countries,
      format: filters.formats,
      abvMin: filters.abvMin,
      abvMax: filters.abvMax,
    });

    expect(repository.findPage).toHaveBeenCalledWith("", filters, BeerSortEnum.NAME, 1, BEER_PAGE_SIZE_DEFAULT);
    expect(repository.findFacets).toHaveBeenCalledWith("", filters);
  });

  it("hands the minimum rating and the rating sort to the page, and the minimum rating to the facets", async () => {
    repository.findPage.mockResolvedValue({ items: [], total: 0 });

    await service.getBeers(ALICE, { minRating: 3.5, sort: BeerSortEnum.RATING });

    expect(repository.findPage).toHaveBeenCalledWith("", { ...NO_FILTERS, minRating: 3.5 }, BeerSortEnum.RATING, 1, BEER_PAGE_SIZE_DEFAULT);
    expect(repository.findFacets).toHaveBeenCalledWith("", { ...NO_FILTERS, minRating: 3.5 });
  });

  it("accepts equal degree bounds", async () => {
    repository.findPage.mockResolvedValue({ items: [], total: 0 });

    await service.getBeers(ALICE, { abvMin: 8, abvMax: 8 });

    expect(repository.findPage).toHaveBeenCalledTimes(1);
  });

  it("rejects a minimum degree above the maximum before any query", async () => {
    await expect(service.getBeers(ALICE, { abvMin: 9, abvMax: 8 })).rejects.toThrow(
      new BadRequestException("abvMin must not be greater than abvMax."),
    );
    expect(repository.findPage).not.toHaveBeenCalled();
    expect(repository.findFacets).not.toHaveBeenCalled();
  });

  it("returns one beer", async () => {
    repository.findById.mockResolvedValue(CHIMAY);

    expect(await service.getBeer(1)).toBe(CHIMAY);
    expect(repository.findById).toHaveBeenCalledWith(1);
  });

  it("throws 404 for an unknown beer", async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.getBeer(9999)).rejects.toThrow(new NotFoundException("Beer 9999 not found."));
  });

  it("returns the style groups the repository builds", async () => {
    const groups = [{ family: BeerFamilyEnum.STOUT, styles: [{ id: 1, name: "Stout irlandais", description: "Noire" }] }];
    repository.findStyleGroups.mockResolvedValue(groups);

    expect(await service.getStyleGroups()).toBe(groups);
    expect(repository.findStyleGroups).toHaveBeenCalledTimes(1);
  });

  it("returns the breweries the repository finds", async () => {
    const breweries = [{ id: 1, name: "Alpha", country: "BE" }];
    repository.findBreweries.mockResolvedValue(breweries);

    expect(await service.getBreweries()).toBe(breweries);
    expect(repository.findBreweries).toHaveBeenCalledTimes(1);
  });

  it("returns an empty list of breweries as is", async () => {
    repository.findBreweries.mockResolvedValue([]);

    expect(await service.getBreweries()).toEqual([]);
  });

  it("returns the beers the repository finds for the ids", async () => {
    repository.findByIds.mockResolvedValue([CHIMAY]);

    expect(await service.getBeersByIds([1, 9999])).toEqual([CHIMAY]);
    expect(repository.findByIds).toHaveBeenCalledExactlyOnceWith([1, 9999]);
  });

  describe("approximate search", () => {
    const APPROXIMATE_FACETS: BeerFacetsDto = {
      families: [{ value: "trappist", count: 1 }],
      countries: [{ value: "BE", count: 1 }],
      formats: [],
    };
    const MOUSSE: BeerDto = { ...CHIMAY, id: 8, name: "Mousse du Zinc", source: BeerSourceEnum.COMMUNITY, createdBy: ALICE };
    const CANDIDATES = [
      { id: 1, searchText: "chimay rouge bieres de chimay" },
      { id: 8, searchText: "mousse du zinc brasserie du mont" },
      { id: 9, searchText: "orval brasserie dorval" },
    ];

    beforeEach(() => {
      repository.findSearchCandidates.mockResolvedValue(CANDIDATES);
    });

    it("keeps the exact page and never reads the candidates when the exact search finds something", async () => {
      repository.findPage.mockResolvedValue({ items: [CHIMAY], total: 1 });

      const page = await service.getBeers(ALICE, { q: "chimay" });

      expect(page.isApproximate).toBe(false);
      expect(page.total).toBe(1);
      expect(repository.findSearchCandidates).not.toHaveBeenCalled();
      expect(repository.findPage).toHaveBeenCalledTimes(1);
    });

    it("does not look for candidates when the search is blank", async () => {
      repository.findPage.mockResolvedValue({ items: [], total: 0 });

      const page = await service.getBeers(ALICE, { q: "   " });

      expect(page.isApproximate).toBe(false);
      expect(repository.findSearchCandidates).not.toHaveBeenCalled();
    });

    it("falls back to the close candidates with the same filters, sort, page and size, and flags the page", async () => {
      repository.findPage.mockResolvedValueOnce({ items: [], total: 0 }).mockResolvedValueOnce({ items: [MOUSSE], total: 1 });
      repository.findFacets.mockResolvedValueOnce(FACETS).mockResolvedValueOnce(APPROXIMATE_FACETS);

      const page = await service.getBeers(ALICE, { q: " mouse zinc ", country: ["BE"], abvMax: 9, sort: BeerSortEnum.ABV, page: 2, size: 5 });

      expect(page).toEqual({
        items: [{ ...UNTOUCHED_CHIMAY, ...MOUSSE, createdByName: "Alice" }],
        total: 1,
        page: 2,
        size: 5,
        facets: APPROXIMATE_FACETS,
        isApproximate: true,
      });
      const filters = { ...NO_FILTERS, countries: ["BE"], abvMax: 9 };
      expect(repository.findSearchCandidates).toHaveBeenCalledExactlyOnceWith(filters);
      expect(repository.findPage).toHaveBeenLastCalledWith("", { ...filters, beerIds: [8] }, BeerSortEnum.ABV, 2, 5);
      expect(repository.findFacets).toHaveBeenLastCalledWith("", { ...filters, beerIds: [8] });
    });

    it("keeps the status filter ids and the excluded ids in the fallback", async () => {
      tastingsService.getDrunkBeerIds.mockResolvedValue([1, 7]);
      repository.findPage.mockResolvedValueOnce({ items: [], total: 0 }).mockResolvedValueOnce({ items: [CHIMAY], total: 1 });

      await service.getBeers(ALICE, { q: "chimai", status: BeerStatusEnum.UNTASTED });

      expect(repository.findSearchCandidates).toHaveBeenCalledExactlyOnceWith({ ...NO_FILTERS, excludedBeerIds: [1, 7] });
      expect(repository.findPage).toHaveBeenLastCalledWith(
        "",
        { ...NO_FILTERS, excludedBeerIds: [1, 7], beerIds: [1] },
        BeerSortEnum.NAME,
        1,
        BEER_PAGE_SIZE_DEFAULT,
      );
    });

    it("answers the empty exact page, not flagged, when no candidate approaches the search", async () => {
      repository.findPage.mockResolvedValue({ items: [], total: 0 });

      const page = await service.getBeers(ALICE, { q: "xyzwqk" });

      expect(page).toEqual({ items: [], total: 0, page: 1, size: BEER_PAGE_SIZE_DEFAULT, facets: FACETS, isApproximate: false });
      expect(repository.findPage).toHaveBeenCalledTimes(1);
      expect(repository.findFacets).toHaveBeenCalledTimes(1);
    });

    it("answers the empty exact page, not flagged, for a term without word of 4 letters", async () => {
      repository.findPage.mockResolvedValue({ items: [], total: 0 });
      repository.findSearchCandidates.mockResolvedValue([{ id: 1, searchText: "xyz brasserie" }]);

      const page = await service.getBeers(ALICE, { q: "xyz" });

      expect(page.isApproximate).toBe(false);
      expect(page.total).toBe(0);
      expect(repository.findPage).toHaveBeenCalledTimes(1);
      expect(repository.findSearchCandidates).not.toHaveBeenCalled();
    });

    it("answers the empty exact page, not flagged, when there is no candidate at all", async () => {
      repository.findPage.mockResolvedValue({ items: [], total: 0 });
      repository.findSearchCandidates.mockResolvedValue([]);

      const page = await service.getBeers(ALICE, { q: "mouse zinc" });

      expect(page.isApproximate).toBe(false);
      expect(repository.findPage).toHaveBeenCalledTimes(1);
    });
  });

  describe("status filter and user state", () => {
    const TRAPPIST_STATE = { beerId: 1, drunk: true, checkinCount: 2, inWishlist: false };

    beforeEach(() => {
      repository.findPage.mockResolvedValue({ items: [CHIMAY], total: 1 });
      tastingsService.getDrunkBeerIds.mockResolvedValue([1, 7]);
      tastingsService.getWishlistBeerIds.mockResolvedValue([3]);
    });

    it("adds the state of the user to every item of the page, asked for the ids of the page only", async () => {
      tastingsService.getBeerStates.mockResolvedValue([TRAPPIST_STATE]);

      const page = await service.getBeers(ALICE, {});

      expect(page.items).toEqual([{ ...CHIMAY, createdByName: null, drunk: true, checkinCount: 2, inWishlist: false, averageRating: null, reviewCount: 0 }]);
      expect(tastingsService.getBeerStates).toHaveBeenCalledExactlyOnceWith(ALICE, [1]);
      expect(tastingsService.getDrunkBeerIds).not.toHaveBeenCalled();
      expect(tastingsService.getWishlistBeerIds).not.toHaveBeenCalled();
    });

    it("answers false, 0 and false for an item without state", async () => {
      tastingsService.getBeerStates.mockResolvedValue([]);

      const page = await service.getBeers(ALICE, {});

      expect(page.items).toEqual([{ ...CHIMAY, createdByName: null, drunk: false, checkinCount: 0, inWishlist: false, averageRating: null, reviewCount: 0 }]);
    });

    it("adds the rating summary of each beer of the page, asked for the ids of the page only", async () => {
      repository.findPage.mockResolvedValue({ items: [CHIMAY, { ...CHIMAY, id: 2 }], total: 2 });
      repository.findRatingSummaries.mockResolvedValue([CHIMAY_SUMMARY]);

      const page = await service.getBeers(ALICE, {});

      expect(page.items.map((item) => [item.id, item.averageRating, item.reviewCount])).toEqual([
        [1, 4.3, 2],
        [2, null, 0],
      ]);
      expect(repository.findRatingSummaries).toHaveBeenCalledExactlyOnceWith([1, 2]);
    });

    it("restricts the page and the facets to the drunk beers for the status drunk", async () => {
      await service.getBeers(ALICE, { status: BeerStatusEnum.DRUNK });

      const filters = { ...NO_FILTERS, beerIds: [1, 7] };
      expect(tastingsService.getDrunkBeerIds).toHaveBeenCalledExactlyOnceWith(ALICE);
      expect(tastingsService.getWishlistBeerIds).not.toHaveBeenCalled();
      expect(repository.findPage).toHaveBeenCalledWith("", filters, BeerSortEnum.NAME, 1, BEER_PAGE_SIZE_DEFAULT);
      expect(repository.findFacets).toHaveBeenCalledWith("", filters);
    });

    it("restricts the page and the facets to the wishlist beers for the status wishlist", async () => {
      await service.getBeers(ALICE, { status: BeerStatusEnum.WISHLIST });

      const filters = { ...NO_FILTERS, beerIds: [3] };
      expect(tastingsService.getWishlistBeerIds).toHaveBeenCalledExactlyOnceWith(ALICE);
      expect(tastingsService.getDrunkBeerIds).not.toHaveBeenCalled();
      expect(repository.findPage).toHaveBeenCalledWith("", filters, BeerSortEnum.NAME, 1, BEER_PAGE_SIZE_DEFAULT);
      expect(repository.findFacets).toHaveBeenCalledWith("", filters);
    });

    it("excludes the drunk beers from the page and the facets for the status untasted", async () => {
      await service.getBeers(ALICE, { status: BeerStatusEnum.UNTASTED });

      const filters = { ...NO_FILTERS, excludedBeerIds: [1, 7] };
      expect(tastingsService.getDrunkBeerIds).toHaveBeenCalledExactlyOnceWith(ALICE);
      expect(repository.findPage).toHaveBeenCalledWith("", filters, BeerSortEnum.NAME, 1, BEER_PAGE_SIZE_DEFAULT);
      expect(repository.findFacets).toHaveBeenCalledWith("", filters);
    });

    it("keeps the other filters next to the status", async () => {
      await service.getBeers(ALICE, { status: BeerStatusEnum.DRUNK, family: BeerFamilyEnum.TRAPPIST, abvMin: 5 });

      expect(repository.findPage).toHaveBeenCalledWith(
        "",
        { ...NO_FILTERS, family: BeerFamilyEnum.TRAPPIST, abvMin: 5, beerIds: [1, 7] },
        BeerSortEnum.NAME,
        1,
        BEER_PAGE_SIZE_DEFAULT,
      );
    });

    it("keeps the minimum rating next to the status, for the page and the facets", async () => {
      await service.getBeers(ALICE, { status: BeerStatusEnum.DRUNK, minRating: 4 });

      const filters = { ...NO_FILTERS, minRating: 4, beerIds: [1, 7] };
      expect(repository.findPage).toHaveBeenCalledWith("", filters, BeerSortEnum.NAME, 1, BEER_PAGE_SIZE_DEFAULT);
      expect(repository.findFacets).toHaveBeenCalledWith("", filters);
    });

    it("keeps the search next to the status", async () => {
      await service.getBeers(ALICE, { q: "  orval ", status: BeerStatusEnum.DRUNK });

      const filters = { ...NO_FILTERS, beerIds: [1, 7] };
      expect(repository.findPage).toHaveBeenCalledWith("orval", filters, BeerSortEnum.NAME, 1, BEER_PAGE_SIZE_DEFAULT);
      expect(repository.findFacets).toHaveBeenCalledWith("orval", filters);
    });

    it("passes an empty list to the repository when the user drank nothing", async () => {
      tastingsService.getDrunkBeerIds.mockResolvedValue([]);

      await service.getBeers(ALICE, { status: BeerStatusEnum.DRUNK });

      expect(repository.findPage).toHaveBeenCalledWith("", { ...NO_FILTERS, beerIds: [] }, BeerSortEnum.NAME, 1, BEER_PAGE_SIZE_DEFAULT);
    });

    it("rejects a degree bound error before reading the ids of the status", async () => {
      await expect(service.getBeers(ALICE, { status: BeerStatusEnum.DRUNK, abvMin: 9, abvMax: 8 })).rejects.toThrow(
        new BadRequestException("abvMin must not be greater than abvMax."),
      );
      expect(tastingsService.getDrunkBeerIds).not.toHaveBeenCalled();
      expect(repository.findPage).not.toHaveBeenCalled();
    });

    it("reads the ids of the status before the page, and the states after it", async () => {
      const order: string[] = [];
      tastingsService.getDrunkBeerIds.mockImplementation(() => {
        order.push("ids");
        return Promise.resolve([1]);
      });
      repository.findPage.mockImplementation(() => {
        order.push("page");
        return Promise.resolve({ items: [CHIMAY], total: 1 });
      });
      tastingsService.getBeerStates.mockImplementation(() => {
        order.push("states");
        return Promise.resolve([]);
      });

      await service.getBeers(ALICE, { status: BeerStatusEnum.DRUNK });

      expect(order).toEqual(["ids", "page", "states"]);
    });
  });

  describe("author name", () => {
    it("AC1 gives each item of the page the display name of its author, once for the whole page", async () => {
      repository.findPage.mockResolvedValue({
        items: [ALICE_BEER, { ...ALICE_BEER, id: 6, createdBy: BOB }, CHIMAY],
        total: 3,
      });

      const page = await service.getBeers(BOB, {});

      expect(page.items.map((item) => [item.id, item.source, item.createdBy, item.createdByName])).toEqual([
        [5, BeerSourceEnum.COMMUNITY, ALICE, "Alice"],
        [6, BeerSourceEnum.COMMUNITY, BOB, "Bob"],
        [1, BeerSourceEnum.OFFICIAL, null, null],
      ]);
      expect(usersService.getUsers).toHaveBeenCalledTimes(1);
    });

    it("answers a null author name for a community beer whose author is unknown", async () => {
      repository.findPage.mockResolvedValue({ items: [{ ...ALICE_BEER, createdBy: 99 }], total: 1 });

      const page = await service.getBeers(BOB, {});

      expect(page.items[0]).toMatchObject({ createdBy: 99, createdByName: null });
    });

    it("AC1 gives the sheet the display name of the author, read once", async () => {
      repository.findById.mockResolvedValue(ALICE_BEER);

      const sheet = await service.getBeerForUser(BOB, 5);

      expect(sheet).toMatchObject({ id: 5, source: BeerSourceEnum.COMMUNITY, createdBy: ALICE, createdByName: "Alice" });
      expect(usersService.getUsers).toHaveBeenCalledTimes(1);
    });

    it("answers a null author name on the sheet of a community beer whose author is unknown", async () => {
      repository.findById.mockResolvedValue({ ...ALICE_BEER, createdBy: 99 });

      const sheet = await service.getBeerForUser(BOB, 5);

      expect(sheet).toMatchObject({ id: 5, source: BeerSourceEnum.COMMUNITY, createdBy: 99, createdByName: null });
    });

    it("AC2 gives the sheet of an official beer no author", async () => {
      repository.findById.mockResolvedValue(CHIMAY);

      expect(await service.getBeerForUser(BOB, 1)).toMatchObject({ source: BeerSourceEnum.OFFICIAL, createdBy: null, createdByName: null });
    });

    it("reads no user for an unknown beer", async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.getBeerForUser(BOB, 9999)).rejects.toThrow(NotFoundException);
      expect(usersService.getUsers).not.toHaveBeenCalled();
    });
  });

  describe("getBeerForUser", () => {
    it("returns the beer with the state of the user, its rating summary and its statistics", async () => {
      repository.findById.mockResolvedValue(CHIMAY);
      tastingsService.getBeerStates.mockResolvedValue([{ beerId: 1, drunk: true, checkinCount: 2, inWishlist: true }]);
      repository.findRatingSummaries.mockResolvedValue([CHIMAY_SUMMARY]);

      expect(await service.getBeerForUser(ALICE, 1)).toEqual({
        ...CHIMAY,
        createdByName: null,
        drunk: true,
        checkinCount: 2,
        inWishlist: true,
        averageRating: 4.3,
        reviewCount: 2,
        ratingDistribution: CHIMAY_STATS.ratingDistribution,
        criteria: [
          { criterion: "sweetness", average: 2.7, count: 3 },
          { criterion: "acidity", average: null, count: 2 },
          { criterion: "body", average: null, count: 0 },
        ],
      });
      expect(tastingsService.getBeerStates).toHaveBeenCalledExactlyOnceWith(ALICE, [1]);
      expect(repository.findRatingSummaries).toHaveBeenCalledExactlyOnceWith([1]);
      expect(repository.findReviewStats).toHaveBeenCalledExactlyOnceWith(1);
    });

    it("answers false, 0, false, a null average and 0 reviews when no state and no summary come back", async () => {
      repository.findById.mockResolvedValue(CHIMAY);
      tastingsService.getBeerStates.mockResolvedValue([]);

      expect(await service.getBeerForUser(ALICE, 1)).toMatchObject({
        ...CHIMAY,
        drunk: false,
        checkinCount: 0,
        inWishlist: false,
        averageRating: null,
        reviewCount: 0,
      });
    });

    it("throws 404 for an unknown beer, without reading any state, summary or statistic", async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.getBeerForUser(ALICE, 9999)).rejects.toThrow(new NotFoundException("Beer 9999 not found."));
      expect(tastingsService.getBeerStates).not.toHaveBeenCalled();
      expect(repository.findRatingSummaries).not.toHaveBeenCalled();
      expect(repository.findReviewStats).not.toHaveBeenCalled();
    });
  });

  describe("getCatalogTotals", () => {
    it("takes the families facet of the whole catalog and sums its counts for the total", async () => {
      repository.findFacets.mockResolvedValue({
        families: [
          { value: "lager", count: 4 },
          { value: "trappist", count: 11 },
        ],
        countries: [{ value: "BE", count: 100 }],
        formats: [{ value: "bottle", count: 100 }],
      });

      expect(await service.getCatalogTotals()).toEqual({
        total: 15,
        families: [
          { value: "lager", count: 4 },
          { value: "trappist", count: 11 },
        ],
      });
      expect(repository.findFacets).toHaveBeenCalledExactlyOnceWith("", { officialOnly: true });
    });

    it("answers a total of 0 and no family for an empty catalog", async () => {
      repository.findFacets.mockResolvedValue({ families: [], countries: [], formats: [] });

      expect(await service.getCatalogTotals()).toEqual({ total: 0, families: [] });
    });
  });

  it("forwards the ids it is given to the repository", async () => {
    repository.findByIds.mockResolvedValue([CHIMAY]);

    expect(await service.getBeersByIds([1, 99])).toEqual([CHIMAY]);
    expect(repository.findByIds).toHaveBeenCalledWith([1, 99]);
  });

  it("returns an empty list when the repository finds no beer", async () => {
    repository.findByIds.mockResolvedValue([]);

    expect(await service.getBeersByIds([])).toEqual([]);
  });

  describe("getReviewsByUsers", () => {
    const RECORD = {
      id: 7,
      userId: 2,
      beerId: 1,
      rating: 4.5,
      text: "Superbe amertume",
      sweetness: null,
      acidity: null,
      body: null,
      createdAt: "2026-03-01T10:00:00.000Z",
      updatedAt: "2026-03-02T10:00:00.000Z",
    };

    it("returns the reviews the repository finds for the users, untouched", async () => {
      repository.findReviewsByUsers.mockResolvedValue([RECORD]);

      expect(await service.getReviewsByUsers([2, 3])).toStrictEqual([RECORD]);
      expect(repository.findReviewsByUsers).toHaveBeenCalledExactlyOnceWith([2, 3]);
    });

    it("returns an empty list when the repository finds no review", async () => {
      repository.findReviewsByUsers.mockResolvedValue([]);

      expect(await service.getReviewsByUsers([])).toStrictEqual([]);
    });
  });

  describe("saveMyReview", () => {
    const AUTHOR = { id: ALICE, displayName: "Alice", avatarColor: "#F59E0B", avatar: AvatarEnum.HOP };
    const DTO = { rating: 4.5, text: "Superbe amertume", sweetness: 2 };
    const RECORD = {
      id: 7,
      userId: ALICE,
      beerId: 1,
      rating: 4.5,
      text: "Superbe amertume",
      sweetness: 2,
      acidity: null,
      body: null,
      createdAt: "2026-03-01T10:00:00.000Z",
      updatedAt: "2026-03-01T10:00:00.000Z",
    };

    beforeEach(() => {
      repository.findById.mockResolvedValue(CHIMAY);
      repository.findReview.mockResolvedValue(null);
      repository.upsertReview.mockResolvedValue(RECORD);
      tastingsService.isFirstCheckin.mockResolvedValue(false);
      usersService.getUser.mockResolvedValue(AUTHOR);
    });

    it("creates the review of a user who tasted the beer and answers it with its author and isMine", async () => {
      expect(await service.saveMyReview(ALICE, 1, DTO)).toEqual({
        id: 7,
        beerId: 1,
        authorId: ALICE,
        authorName: "Alice",
        authorAvatarColor: "#F59E0B",
        authorAvatar: "hop",
        rating: 4.5,
        text: "Superbe amertume",
        sweetness: 2,
        acidity: null,
        body: null,
        createdAt: "2026-03-01T10:00:00.000Z",
        updatedAt: "2026-03-01T10:00:00.000Z",
        isMine: true,
      });
      expect(repository.findReview).toHaveBeenCalledWith(ALICE, 1);
      expect(tastingsService.isFirstCheckin).toHaveBeenCalledWith(ALICE, 1);
      expect(usersService.getUser).toHaveBeenCalledWith(ALICE);
      expect(repository.upsertReview).toHaveBeenCalledExactlyOnceWith({
        userId: ALICE,
        beerId: 1,
        rating: 4.5,
        text: "Superbe amertume",
        sweetness: 2,
        acidity: null,
        body: null,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it("answers 404 for an unknown beer, before any other read, and writes nothing", async () => {
      repository.findById.mockResolvedValue(null);
      tastingsService.isFirstCheckin.mockResolvedValue(true);

      await expect(service.saveMyReview(ALICE, 99, DTO)).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.findReview).not.toHaveBeenCalled();
      expect(tastingsService.isFirstCheckin).not.toHaveBeenCalled();
      expect(repository.upsertReview).not.toHaveBeenCalled();
    });

    it("answers 403 with its message when there is no review and no tasting, and writes nothing", async () => {
      tastingsService.isFirstCheckin.mockResolvedValue(true);

      const failure = await service.saveMyReview(ALICE, 1, DTO).catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(ForbiddenException);
      expect((failure as ForbiddenException).message).toBe("You must check in this beer before reviewing it.");
      expect(repository.upsertReview).not.toHaveBeenCalled();
      expect(usersService.getUser).not.toHaveBeenCalled();
    });

    it("replaces an existing review without asking for a tasting", async () => {
      repository.findReview.mockResolvedValue(RECORD);
      tastingsService.isFirstCheckin.mockResolvedValue(true);

      const review = await service.saveMyReview(ALICE, 1, { rating: 3 });

      expect(review.isMine).toBe(true);
      expect(tastingsService.isFirstCheckin).not.toHaveBeenCalled();
      expect(repository.upsertReview).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ rating: 3, text: "", sweetness: null, acidity: null, body: null }),
      );
    });
  });

  describe("deleteMyReview", () => {
    beforeEach(() => {
      repository.findById.mockResolvedValue(CHIMAY);
      repository.deleteReview.mockResolvedValue(true);
    });

    it("deletes the review of the user on the beer and answers nothing, without asking for a tasting", async () => {
      tastingsService.isFirstCheckin.mockResolvedValue(true);

      expect(await service.deleteMyReview(ALICE, 1)).toBeUndefined();
      expect(repository.deleteReview).toHaveBeenCalledExactlyOnceWith(ALICE, 1);
      expect(tastingsService.isFirstCheckin).not.toHaveBeenCalled();
    });

    it("answers 404 for an unknown beer and deletes nothing", async () => {
      repository.findById.mockResolvedValue(null);

      const failure = await service.deleteMyReview(ALICE, 99).catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(NotFoundException);
      expect((failure as NotFoundException).message).toBe("Beer 99 not found.");
      expect(repository.deleteReview).not.toHaveBeenCalled();
    });

    it("answers 404 with its message when the user has no review on the beer", async () => {
      repository.deleteReview.mockResolvedValue(false);

      const failure = await service.deleteMyReview(ALICE, 1).catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(NotFoundException);
      expect((failure as NotFoundException).message).toBe("You have not reviewed beer 1.");
    });
  });

  describe("getReviewPage", () => {
    const USERS = [
      { id: 1, displayName: "Alice", avatarColor: "#F59E0B", avatar: AvatarEnum.HOP },
      { id: 2, displayName: "Bob", avatarColor: "#10B981", avatar: AvatarEnum.MALT },
      { id: 3, displayName: "Carol", avatarColor: "#8B5CF6", avatar: AvatarEnum.GLASS },
    ];
    const record = (id: number, userId: number) => ({
      id,
      userId,
      beerId: 1,
      rating: 4,
      text: `avis ${id}`,
      sweetness: null,
      acidity: null,
      body: null,
      createdAt: "2026-03-01T10:00:00.000Z",
      updatedAt: "2026-03-02T10:00:00.000Z",
    });

    beforeEach(() => {
      repository.findById.mockResolvedValue(CHIMAY);
      repository.findReview.mockResolvedValue(null);
      repository.findReviewPage.mockResolvedValue({ items: [], total: 0 });
      usersService.getUsers.mockResolvedValue(USERS);
    });

    it("serves my review and the reviews of the others with their authors, the total, the page and the size", async () => {
      repository.findReview.mockResolvedValue(record(9, 3));
      repository.findReviewPage.mockResolvedValue({ items: [record(8, 2), record(7, 1)], total: 2 });

      const page = await service.getReviewPage(3, 1, {});

      expect(page.mine).toMatchObject({ id: 9, authorName: "Carol", authorAvatar: "glass", isMine: true });
      expect(page.items.map((item) => [item.id, item.authorName, item.authorAvatarColor, item.authorAvatar, item.isMine])).toEqual([
        [8, "Bob", "#10B981", "malt", false],
        [7, "Alice", "#F59E0B", "hop", false],
      ]);
      expect([page.total, page.page, page.size]).toEqual([2, 1, REVIEW_PAGE_SIZE]);
      expect(REVIEW_PAGE_SIZE).toBe(10);
      expect(repository.findReview).toHaveBeenCalledExactlyOnceWith(3, 1);
      expect(repository.findReviewPage).toHaveBeenCalledExactlyOnceWith(1, 3, 1, REVIEW_PAGE_SIZE);
    });

    it("reads the requested page and serves it back", async () => {
      repository.findReviewPage.mockResolvedValue({ items: [record(5, 2)], total: 11 });

      const page = await service.getReviewPage(3, 1, { page: 2 });

      expect(repository.findReviewPage).toHaveBeenCalledExactlyOnceWith(1, 3, 2, REVIEW_PAGE_SIZE);
      expect([page.page, page.total, page.items.length]).toEqual([2, 11, 1]);
    });

    it("serves a null mine, an empty list and a total of 0 for a beer without review", async () => {
      expect(await service.getReviewPage(3, 1, {})).toEqual({ mine: null, items: [], total: 0, page: 1, size: REVIEW_PAGE_SIZE });
    });

    it("answers 404 for an unknown beer and reads nothing else", async () => {
      repository.findById.mockResolvedValue(null);

      const failure = await service.getReviewPage(3, 99, {}).catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(NotFoundException);
      expect((failure as NotFoundException).message).toBe("Beer 99 not found.");
      expect(repository.findReview).not.toHaveBeenCalled();
      expect(repository.findReviewPage).not.toHaveBeenCalled();
      expect(usersService.getUsers).not.toHaveBeenCalled();
    });
  });

  describe("createBeer", () => {
    const NOW = new Date("2026-05-01T10:00:00.000Z");
    const DTO = { name: "Brune du Mont", breweryName: "Brasserie du Mont", country: "FR", styleId: 7, abv: 6.5 };
    const BREWERIES = [
      { id: 3, name: "Brasserie Duyck", country: "FR" },
      { id: 4, name: "Brasserie du Mont", country: "FR" },
    ];
    const CREATED: BeerDto = { ...CHIMAY, id: 99, name: "Brune du Mont", breweryName: "Brasserie du Mont" };

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(NOW);
      repository.existsStyle.mockResolvedValue(true);
      repository.countCreatedSince.mockResolvedValue(0);
      repository.findBreweries.mockResolvedValue(BREWERIES);
      repository.findBeersByBrewery.mockResolvedValue([]);
      repository.createBrewery.mockResolvedValue({ id: 8, name: "Brasserie du Mont", country: "FR" });
      repository.createBeer.mockResolvedValue(99);
      repository.findById.mockResolvedValue(CREATED);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    const failureOf = (dto: typeof DTO = DTO): Promise<unknown> => service.createBeer(ALICE, dto).catch((error: unknown) => error);

    it("answers 404 for an unknown style and checks nothing else", async () => {
      repository.existsStyle.mockResolvedValue(false);

      const failure = await failureOf();

      expect(failure).toBeInstanceOf(NotFoundException);
      expect((failure as NotFoundException).message).toBe("Beer style 7 not found.");
      expect(repository.existsStyle).toHaveBeenCalledExactlyOnceWith(7);
      expect(repository.countCreatedSince).not.toHaveBeenCalled();
      expect(repository.findBreweries).not.toHaveBeenCalled();
      expect(repository.createBeer).not.toHaveBeenCalled();
    });

    it("answers 429 once the user created the maximum in the sliding window, and creates nothing", async () => {
      repository.countCreatedSince.mockResolvedValue(BEER_PROPOSALS_PER_WINDOW_MAX);

      const failure = await failureOf();

      expect(failure).toBeInstanceOf(HttpException);
      expect((failure as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect((failure as HttpException).message).toEqual(expect.stringContaining("10"));
      expect(repository.countCreatedSince).toHaveBeenCalledExactlyOnceWith(ALICE, new Date(NOW.getTime() - BEER_PROPOSAL_WINDOW_MS));
      expect(repository.createBrewery).not.toHaveBeenCalled();
      expect(repository.createBeer).not.toHaveBeenCalled();
    });

    it("accepts the last creation of the window", async () => {
      repository.countCreatedSince.mockResolvedValue(BEER_PROPOSALS_PER_WINDOW_MAX - 1);

      expect((await service.createBeer(ALICE, DTO)).id).toBe(99);
    });

    it("answers 404 before 429 when the style is unknown and the limit is reached", async () => {
      repository.existsStyle.mockResolvedValue(false);
      repository.countCreatedSince.mockResolvedValue(BEER_PROPOSALS_PER_WINDOW_MAX);

      expect(await failureOf()).toBeInstanceOf(NotFoundException);
    });

    it("answers 429 before 409 when the limit is reached and the beer already exists", async () => {
      repository.countCreatedSince.mockResolvedValue(BEER_PROPOSALS_PER_WINDOW_MAX);
      repository.findBeersByBrewery.mockResolvedValue([CREATED]);

      const failure = await failureOf();

      expect((failure as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(repository.findBreweries).not.toHaveBeenCalled();
    });

    it("answers 409 for the same name and the same brewery whatever the case, accents, sharp s and spaces", async () => {
      repository.findBreweries.mockResolvedValue([{ id: 3, name: "Brasserie Duyck", country: "FR" }]);
      repository.findBeersByBrewery.mockResolvedValue([{ ...CHIMAY, id: 5, name: "Jenlain Ambrée STRAßE" }]);

      const failure = await failureOf({ ...DTO, name: "jenlain  ambree strasse", breweryName: "BRASSERIE DUYCK" });

      expect(failure).toBeInstanceOf(ConflictException);
      expect((failure as ConflictException).message).toEqual(expect.stringContaining("jenlain ambree strasse"));
      expect(repository.findBeersByBrewery).toHaveBeenCalledExactlyOnceWith(3);
      expect(repository.createBrewery).not.toHaveBeenCalled();
      expect(repository.createBeer).not.toHaveBeenCalled();
    });

    it("also answers 409 against a community beer of the brewery, wherever it is in the list", async () => {
      repository.findBeersByBrewery.mockResolvedValue([
        { ...CHIMAY, id: 5, name: "Other" },
        { ...CREATED, id: 6, name: "BRUNE DU MONT" },
      ]);

      expect(await failureOf()).toBeInstanceOf(ConflictException);
      expect(repository.createBeer).not.toHaveBeenCalled();
    });

    it("accepts the same name at another brewery and reuses the existing brewery without creating one", async () => {
      repository.findBeersByBrewery.mockResolvedValue([{ ...CHIMAY, id: 5, name: "Other beer" }]);

      const created = await service.createBeer(ALICE, { ...DTO, breweryName: "brasserie DU mont", name: "Chimay Rouge" });

      expect(created.id).toBe(99);
      expect(repository.findBeersByBrewery).toHaveBeenCalledExactlyOnceWith(4);
      expect(repository.createBrewery).not.toHaveBeenCalled();
      expect(repository.createBeer).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ breweryId: 4, name: "Chimay Rouge", createdBy: ALICE }),
      );
    });

    it("creates the brewery with the country of the beer when its name is unknown, without looking for duplicates", async () => {
      repository.findBreweries.mockResolvedValue([BREWERIES[0]]);

      await service.createBeer(ALICE, DTO);

      expect(repository.findBeersByBrewery).not.toHaveBeenCalled();
      expect(repository.createBrewery).toHaveBeenCalledExactlyOnceWith({ name: "Brasserie du Mont", country: "FR", city: "" });
      expect(repository.createBeer).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ breweryId: 8 }));
    });

    it("saves the row built for the user and the current instant, then reads the beer back for the user", async () => {
      repository.findBreweries.mockResolvedValue([BREWERIES[0]]);
      repository.createBeer.mockResolvedValue(42);
      repository.findById.mockResolvedValue({ ...CREATED, id: 42 });

      const result = await service.createBeer(ALICE, { ...DTO, description: "Une brune." });

      expect(repository.createBeer).toHaveBeenCalledExactlyOnceWith({
        name: "Brune du Mont",
        breweryId: 8,
        styleId: 7,
        abv: 6.5,
        ibu: null,
        ebc: null,
        description: "Une brune.",
        aromas: [],
        formats: [],
        country: "FR",
        searchText: "brune du mont brasserie du mont",
        createdBy: ALICE,
        createdAt: NOW,
      });
      expect(repository.findById).toHaveBeenCalledWith(42);
      expect(result).toMatchObject({ id: 42, name: "Brune du Mont", drunk: false, checkinCount: 0, inWishlist: false, reviewCount: 0 });
      expect(result.ratingDistribution).toHaveLength(5);
    });
  });
});
