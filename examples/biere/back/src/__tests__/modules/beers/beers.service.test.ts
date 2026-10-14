import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BEER_PAGE_SIZE_DEFAULT, REVIEW_PAGE_SIZE } from "@/modules/beers/beers.constants";
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
};

const ALICE = 1;

const UNTOUCHED_CHIMAY = { ...CHIMAY, drunk: false, checkinCount: 0, inWishlist: false, averageRating: null, reviewCount: 0 };

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
    findById: vi.fn(),
    findByIds: vi.fn(),
    findStyleGroups: vi.fn(),
    findReview: vi.fn(),
    findReviewsByUsers: vi.fn(),
    upsertReview: vi.fn(),
    deleteReview: vi.fn(),
    findReviewPage: vi.fn(),
    findRatingSummaries: vi.fn(),
    findReviewStats: vi.fn(),
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

  it("returns the beers the repository finds for the ids", async () => {
    repository.findByIds.mockResolvedValue([CHIMAY]);

    expect(await service.getBeersByIds([1, 9999])).toEqual([CHIMAY]);
    expect(repository.findByIds).toHaveBeenCalledExactlyOnceWith([1, 9999]);
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

      expect(page.items).toEqual([{ ...CHIMAY, drunk: true, checkinCount: 2, inWishlist: false, averageRating: null, reviewCount: 0 }]);
      expect(tastingsService.getBeerStates).toHaveBeenCalledExactlyOnceWith(ALICE, [1]);
      expect(tastingsService.getDrunkBeerIds).not.toHaveBeenCalled();
      expect(tastingsService.getWishlistBeerIds).not.toHaveBeenCalled();
    });

    it("answers false, 0 and false for an item without state", async () => {
      tastingsService.getBeerStates.mockResolvedValue([]);

      const page = await service.getBeers(ALICE, {});

      expect(page.items).toEqual([{ ...CHIMAY, drunk: false, checkinCount: 0, inWishlist: false, averageRating: null, reviewCount: 0 }]);
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

  describe("getBeerForUser", () => {
    it("returns the beer with the state of the user, its rating summary and its statistics", async () => {
      repository.findById.mockResolvedValue(CHIMAY);
      tastingsService.getBeerStates.mockResolvedValue([{ beerId: 1, drunk: true, checkinCount: 2, inWishlist: true }]);
      repository.findRatingSummaries.mockResolvedValue([CHIMAY_SUMMARY]);

      expect(await service.getBeerForUser(ALICE, 1)).toEqual({
        ...CHIMAY,
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
      expect(repository.findFacets).toHaveBeenCalledExactlyOnceWith("", {});
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

      expect(page.mine).toMatchObject({ id: 9, authorName: "Carol", isMine: true });
      expect(page.items.map((item) => [item.id, item.authorName, item.authorAvatarColor, item.isMine])).toEqual([
        [8, "Bob", "#10B981", false],
        [7, "Alice", "#F59E0B", false],
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
});
