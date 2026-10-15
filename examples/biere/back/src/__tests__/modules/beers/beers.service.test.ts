import { BadRequestException, ConflictException, ForbiddenException, HttpException, HttpStatus, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BeerSourceEnum } from "@/modules/beers/enums/beer-source.enum";
import {
  BEER_PAGE_SIZE_DEFAULT,
  BEER_PROPOSAL_WINDOW_MS,
  BEER_PROPOSALS_PER_WINDOW_MAX,
  CORRECTION_WINDOW_MS,
  CORRECTIONS_PER_WINDOW_MAX,
  REVIEW_PAGE_SIZE,
} from "@/modules/beers/beers.constants";
import { BeersRepository } from "@/modules/beers/beers.repository";
import { BeersService } from "@/modules/beers/beers.service";
import { TastingsService } from "@/modules/tastings/tastings.service";
import { UsersService } from "@/modules/users/users.service";
import type { BeerDto } from "@/modules/beers/dtos/beer.dto";
import type { BeerFacetsDto } from "@/modules/beers/dtos/beer-facets.dto";
import { BeerAromaEnum } from "@/modules/beers/enums/beer-aroma.enum";
import { BeerCharacteristicEnum } from "@/modules/beers/enums/beer-characteristic.enum";
import { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";
import { BeerFormatEnum } from "@/modules/beers/enums/beer-format.enum";
import { BeerSortEnum } from "@/modules/beers/enums/beer-sort.enum";
import { BeerStatusEnum } from "@/modules/beers/enums/beer-status.enum";
import { CorrectionStatusEnum } from "@/modules/beers/enums/correction-status.enum";
import { CorrectionVoteSenseEnum } from "@/modules/beers/enums/correction-vote-sense.enum";
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
  ibu: null,
  ebc: null,
  sweetness: null,
  acidity: null,
  body: null,
  bitternessLevel: null,
  colorLevel: null,
  styleColorRange: null,
  source: BeerSourceEnum.OFFICIAL,
  createdBy: null,
};

const OPEN_STATE = { status: CorrectionStatusEnum.OPEN, resolvedAt: null, previousValue: null };

const ALICE = 1;
const BOB = 2;
const CAROL = 3;
const MEMBERS = [
  { id: ALICE, displayName: "Alice", avatarColor: "#F59E0B", avatar: AvatarEnum.HOP },
  { id: BOB, displayName: "Bob", avatarColor: "#10B981", avatar: AvatarEnum.MALT },
];
const ALICE_BEER: BeerDto = { ...CHIMAY, id: 5, name: "Brune du Mont", source: BeerSourceEnum.COMMUNITY, createdBy: ALICE };

const UNTOUCHED_CHIMAY = { ...CHIMAY, createdByName: null, drunk: false, checkinCount: 0, inWishlist: false, averageRating: null, reviewCount: 0 };

const CHIMAY_SUMMARY = { beerId: 1, averageRating: 4.3, reviewCount: 2 };

const CHIMAY_STATS = {
  ratingDistribution: [1, 2, 3, 4, 5].map((stars) => ({ stars, count: stars === 4 ? 2 : 0 })),
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
    createCorrection: vi.fn(),
    existsOpenCorrection: vi.fn(),
    countCorrectionsSince: vi.fn(),
    findOpenCorrectionsByBeer: vi.fn(),
    findCorrectionById: vi.fn(),
    findOpenCorrections: vi.fn(),
    upsertCorrectionVote: vi.fn(),
    findCorrectionTallies: vi.fn(),
    findCorrectionVotesOfUser: vi.fn(),
    findDueCorrections: vi.fn(),
    findRecentlyClosedCorrections: vi.fn(),
    resolveCorrection: vi.fn(),
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
    repository.findCorrectionTallies.mockResolvedValue([]);
    repository.findCorrectionVotesOfUser.mockResolvedValue([]);
    repository.findDueCorrections.mockResolvedValue([]);
    repository.findRecentlyClosedCorrections.mockResolvedValue([]);
    repository.resolveCorrection.mockResolvedValue(true);
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
    const DTO = { rating: 4.5, text: "Superbe amertume" };
    const RECORD = {
      id: 7,
      userId: ALICE,
      beerId: 1,
      rating: 4.5,
      text: "Superbe amertume",
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
        sweetness: null,
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
        sweetness: null,
        acidity: null,
        body: null,
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
  describe("proposeCorrection", () => {
    const NOW = new Date("2026-06-01T10:00:00.000Z");
    const CLOSES_AT = new Date("2026-06-08T10:00:00.000Z");
    const IBU_RECORD = {
      id: 12,
      beerId: 1,
      characteristic: BeerCharacteristicEnum.IBU,
      proposedValue: 35,
      reason: "Fiche du brasseur",
      proposedBy: ALICE,
      createdAt: NOW.toISOString(),
      closesAt: CLOSES_AT.toISOString(),
      ...OPEN_STATE,
    };
    const propose = (dto: { characteristic: BeerCharacteristicEnum; value: unknown; reason?: string }, userId = ALICE) =>
      service.proposeCorrection(userId, 1, dto);
    const failureOf = (dto: { characteristic: BeerCharacteristicEnum; value: unknown; reason?: string }, userId = ALICE) =>
      propose(dto, userId).catch((error: unknown) => error);

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(NOW);
      repository.findById.mockResolvedValue(CHIMAY);
      repository.countCorrectionsSince.mockResolvedValue(0);
      repository.existsOpenCorrection.mockResolvedValue(false);
      repository.createCorrection.mockResolvedValue(IBU_RECORD);
      usersService.getUser.mockResolvedValue(MEMBERS[0]);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("creates the correction and answers it open with one vote for, none against, the current value null and isMine true", async () => {
      const result = await propose({ characteristic: BeerCharacteristicEnum.IBU, value: 35, reason: "Fiche du brasseur" });

      expect(repository.createCorrection).toHaveBeenCalledExactlyOnceWith({
        beerId: 1,
        characteristic: BeerCharacteristicEnum.IBU,
        proposedValue: "35",
        reason: "Fiche du brasseur",
        proposedBy: ALICE,
        createdAt: NOW,
        closesAt: CLOSES_AT,
      });
      expect(repository.countCorrectionsSince).toHaveBeenCalledExactlyOnceWith(ALICE, new Date(NOW.getTime() - CORRECTION_WINDOW_MS));
      expect(repository.existsOpenCorrection).toHaveBeenCalledExactlyOnceWith(1, BeerCharacteristicEnum.IBU);
      expect(result).toStrictEqual({
        id: 12,
        beerId: 1,
        beerName: "Chimay Rouge",
        characteristic: "ibu",
        currentValue: null,
        proposedValue: 35,
        reason: "Fiche du brasseur",
        proposedBy: ALICE,
        proposedByName: "Alice",
        createdAt: NOW.toISOString(),
        closesAt: CLOSES_AT.toISOString(),
        status: "open",
        resolvedAt: null,
        agreeCount: 1,
        disagreeCount: 0,
        myVote: null,
        isMine: true,
      });
    });

    it("records the calling user as the proposer, names them and marks the correction as theirs", async () => {
      repository.createCorrection.mockResolvedValue({ ...IBU_RECORD, proposedBy: BOB });
      usersService.getUser.mockResolvedValue(MEMBERS[1]);

      const result = await propose({ characteristic: BeerCharacteristicEnum.IBU, value: 35, reason: "Fiche du brasseur" }, BOB);

      expect(repository.createCorrection).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ proposedBy: BOB }));
      expect(repository.countCorrectionsSince).toHaveBeenCalledExactlyOnceWith(BOB, new Date(NOW.getTime() - CORRECTION_WINDOW_MS));
      expect(usersService.getUser).toHaveBeenCalledExactlyOnceWith(BOB);
      expect(result).toMatchObject({ proposedBy: BOB, proposedByName: "Bob", isMine: true });
    });

    it("stores an absent reason as the empty text and reads the current value on the beer", async () => {
      repository.findById.mockResolvedValue({ ...CHIMAY, ibu: 20 });

      const result = await propose({ characteristic: BeerCharacteristicEnum.IBU, value: 35 });

      expect(repository.createCorrection).toHaveBeenCalledWith(expect.objectContaining({ reason: "" }));
      expect(result.currentValue).toBe(20);
    });

    it.each([
      [BeerCharacteristicEnum.ABV, 0],
      [BeerCharacteristicEnum.ABV, 0.3],
      [BeerCharacteristicEnum.ABV, 7.5],
      [BeerCharacteristicEnum.ABV, 19.9],
      [BeerCharacteristicEnum.ABV, 20],
      [BeerCharacteristicEnum.IBU, 0],
      [BeerCharacteristicEnum.IBU, 120],
      [BeerCharacteristicEnum.EBC, 2],
      [BeerCharacteristicEnum.EBC, 80],
      [BeerCharacteristicEnum.SWEETNESS, 1],
      [BeerCharacteristicEnum.ACIDITY, 1],
      [BeerCharacteristicEnum.ACIDITY, 5],
      [BeerCharacteristicEnum.BODY, 1],
      [BeerCharacteristicEnum.BODY, 3],
      [BeerCharacteristicEnum.BODY, 5],
      [BeerCharacteristicEnum.AROMAS, ["fruity"]],
      [BeerCharacteristicEnum.AROMAS, ["fruity", "citrus", "hoppy", "floral", "spicy"]],
      [BeerCharacteristicEnum.FORMATS, ["can"]],
      [BeerCharacteristicEnum.FORMATS, ["bottle", "can", "draft"]],
    ])("accepts the value of %s at its bound: %j", async (characteristic, value) => {
      await propose({ characteristic, value });

      expect(repository.createCorrection).toHaveBeenCalledTimes(1);
    });

    it.each([
      [BeerCharacteristicEnum.ABV, 7.25],
      [BeerCharacteristicEnum.ABV, 20.5],
      [BeerCharacteristicEnum.ABV, -1],
      [BeerCharacteristicEnum.ABV, ["7"]],
      [BeerCharacteristicEnum.ABV, "7"],
      [BeerCharacteristicEnum.IBU, 35.5],
      [BeerCharacteristicEnum.IBU, -1],
      [BeerCharacteristicEnum.IBU, 121],
      [BeerCharacteristicEnum.IBU, null],
      [BeerCharacteristicEnum.EBC, 1],
      [BeerCharacteristicEnum.EBC, 81],
      [BeerCharacteristicEnum.SWEETNESS, 0],
      [BeerCharacteristicEnum.SWEETNESS, 6],
      [BeerCharacteristicEnum.ACIDITY, 0],
      [BeerCharacteristicEnum.ACIDITY, 6],
      [BeerCharacteristicEnum.ACIDITY, 2.5],
      [BeerCharacteristicEnum.BODY, 0],
      [BeerCharacteristicEnum.BODY, 6],
      [BeerCharacteristicEnum.BODY, "3"],
      [BeerCharacteristicEnum.AROMAS, 5],
      [BeerCharacteristicEnum.AROMAS, []],
      [BeerCharacteristicEnum.AROMAS, ["fruity", "citrus", "hoppy", "floral", "spicy", "caramel"]],
      [BeerCharacteristicEnum.AROMAS, ["fruity", "fruity"]],
      [BeerCharacteristicEnum.AROMAS, ["unknown"]],
      [BeerCharacteristicEnum.AROMAS, [1]],
      [BeerCharacteristicEnum.AROMAS, ["can"]],
      [BeerCharacteristicEnum.FORMATS, []],
      [BeerCharacteristicEnum.FORMATS, ["bottle", "bottle"]],
      [BeerCharacteristicEnum.FORMATS, ["bottle", "can", "draft", "keg"]],
      [BeerCharacteristicEnum.FORMATS, ["fruity"]],
      [BeerCharacteristicEnum.FORMATS, "bottle"],
    ])("answers 400 for the value of %s: %j, before reading the beer and without writing", async (characteristic, value) => {
      const failure = await failureOf({ characteristic, value });

      expect(failure).toBeInstanceOf(BadRequestException);
      expect((failure as BadRequestException).message).toEqual(expect.stringContaining(characteristic));
      expect(repository.findById).not.toHaveBeenCalled();
      expect(repository.createCorrection).not.toHaveBeenCalled();
    });

    it("answers 404 for an unknown beer, without writing", async () => {
      repository.findById.mockResolvedValue(null);

      const failure = await failureOf({ characteristic: BeerCharacteristicEnum.IBU, value: 35 });

      expect(failure).toBeInstanceOf(NotFoundException);
      expect((failure as NotFoundException).message).toBe("Beer 1 not found.");
      expect(repository.countCorrectionsSince).not.toHaveBeenCalled();
      expect(repository.createCorrection).not.toHaveBeenCalled();
    });

    it("answers 403 to the author of a community beer, and lets another user propose", async () => {
      repository.findById.mockResolvedValue(ALICE_BEER);

      const failure = await failureOf({ characteristic: BeerCharacteristicEnum.IBU, value: 35 });

      expect(failure).toBeInstanceOf(ForbiddenException);
      expect((failure as ForbiddenException).message).toBe("Only other users can correct a beer they added.");
      expect(repository.createCorrection).not.toHaveBeenCalled();
      expect((await propose({ characteristic: BeerCharacteristicEnum.IBU, value: 35 }, BOB)).isMine).toBe(false);
    });

    it("answers 404 before 403, and 403 before the identical value, the quota and the conflict", async () => {
      repository.findById.mockResolvedValue({ ...ALICE_BEER, abv: 7 });
      repository.countCorrectionsSince.mockResolvedValue(CORRECTIONS_PER_WINDOW_MAX);
      repository.existsOpenCorrection.mockResolvedValue(true);

      const failure = await failureOf({ characteristic: BeerCharacteristicEnum.ABV, value: 7 });

      expect(failure).toBeInstanceOf(ForbiddenException);
      expect(repository.countCorrectionsSince).not.toHaveBeenCalled();
      expect(repository.existsOpenCorrection).not.toHaveBeenCalled();
      expect(repository.createCorrection).not.toHaveBeenCalled();
    });

    it("answers 400 for the value already carried by the beer, a number or a list compared as a set", async () => {
      repository.findById.mockResolvedValue({ ...CHIMAY, aromas: [BeerAromaEnum.FRUITY, BeerAromaEnum.HOPPY] });

      const sameNumber = await failureOf({ characteristic: BeerCharacteristicEnum.ABV, value: 7 });
      const sameSet = await failureOf({ characteristic: BeerCharacteristicEnum.AROMAS, value: ["hoppy", "fruity"] });

      expect(sameNumber).toBeInstanceOf(BadRequestException);
      expect((sameNumber as BadRequestException).message).toBe("abv is already 7.");
      expect(sameSet).toBeInstanceOf(BadRequestException);
      expect((sameSet as BadRequestException).message).toBe("aromas is already hoppy, fruity.");
      expect(repository.createCorrection).not.toHaveBeenCalled();
    });

    it("accepts a list that only overlaps the current one, or extends it, and a value on a field not filled yet", async () => {
      repository.findById.mockResolvedValue({ ...CHIMAY, aromas: [BeerAromaEnum.FRUITY, BeerAromaEnum.HOPPY] });

      await propose({ characteristic: BeerCharacteristicEnum.AROMAS, value: ["fruity"] });
      await propose({ characteristic: BeerCharacteristicEnum.AROMAS, value: ["fruity", "hoppy", "citrus"] });
      await propose({ characteristic: BeerCharacteristicEnum.AROMAS, value: ["fruity", "citrus"] });
      await propose({ characteristic: BeerCharacteristicEnum.IBU, value: 0 });

      expect(repository.createCorrection).toHaveBeenCalledTimes(4);
    });

    it("answers 400 for the identical value before the quota and the conflict", async () => {
      repository.countCorrectionsSince.mockResolvedValue(CORRECTIONS_PER_WINDOW_MAX);
      repository.existsOpenCorrection.mockResolvedValue(true);

      const failure = await failureOf({ characteristic: BeerCharacteristicEnum.ABV, value: 7 });

      expect(failure).toBeInstanceOf(BadRequestException);
      expect(repository.countCorrectionsSince).not.toHaveBeenCalled();
      expect(repository.existsOpenCorrection).not.toHaveBeenCalled();
    });

    it("answers 429 once the user made the maximum in the sliding window, before the conflict, and writes nothing", async () => {
      repository.countCorrectionsSince.mockResolvedValue(CORRECTIONS_PER_WINDOW_MAX);
      repository.existsOpenCorrection.mockResolvedValue(true);

      const failure = await failureOf({ characteristic: BeerCharacteristicEnum.IBU, value: 35 });

      expect(failure).toBeInstanceOf(HttpException);
      expect((failure as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect((failure as HttpException).message).toEqual(expect.stringContaining("10"));
      expect(repository.existsOpenCorrection).not.toHaveBeenCalled();
      expect(repository.createCorrection).not.toHaveBeenCalled();
    });

    it("accepts the last proposal of the window", async () => {
      repository.countCorrectionsSince.mockResolvedValue(CORRECTIONS_PER_WINDOW_MAX - 1);

      await propose({ characteristic: BeerCharacteristicEnum.IBU, value: 35 });

      expect(repository.createCorrection).toHaveBeenCalledTimes(1);
    });

    it("answers 409 when a proposal is already open for this beer and this characteristic, and writes nothing", async () => {
      repository.existsOpenCorrection.mockResolvedValue(true);

      const failure = await failureOf({ characteristic: BeerCharacteristicEnum.IBU, value: 35 });

      expect(failure).toBeInstanceOf(ConflictException);
      expect((failure as ConflictException).message).toBe("A correction of ibu is already open for beer 1.");
      expect(repository.createCorrection).not.toHaveBeenCalled();
    });
  });

  describe("getBeerCorrections", () => {
    const RECORDS = [
      {
        id: 12,
        beerId: 1,
        characteristic: BeerCharacteristicEnum.IBU,
        proposedValue: 35,
        reason: "",
        proposedBy: ALICE,
        createdAt: "2026-06-01T10:00:00.000Z",
        closesAt: "2026-06-08T10:00:00.000Z",
        ...OPEN_STATE,
      },
      {
        id: 13,
        beerId: 1,
        characteristic: BeerCharacteristicEnum.AROMAS,
        proposedValue: ["fruity"],
        reason: "Etiquette",
        proposedBy: BOB,
        createdAt: "2026-06-02T10:00:00.000Z",
        closesAt: "2026-06-09T10:00:00.000Z",
        ...OPEN_STATE,
      },
    ];

    it("answers 404 for an unknown beer without reading the corrections", async () => {
      repository.findById.mockResolvedValue(null);

      const failure = await service.getBeerCorrections(ALICE, 99).catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(NotFoundException);
      expect((failure as NotFoundException).message).toBe("Beer 99 not found.");
      expect(repository.findOpenCorrectionsByBeer).not.toHaveBeenCalled();
    });

    it("answers an empty list for a beer without open correction", async () => {
      repository.findById.mockResolvedValue(CHIMAY);
      repository.findOpenCorrectionsByBeer.mockResolvedValue([]);

      expect(await service.getBeerCorrections(ALICE, 1)).toEqual([]);
      expect(repository.findOpenCorrectionsByBeer).toHaveBeenCalledExactlyOnceWith(1);
    });

    it("answers the open corrections in repository order with the live current value, the proposer name and isMine", async () => {
      repository.findById.mockResolvedValue({ ...CHIMAY, aromas: [BeerAromaEnum.FRUITY, BeerAromaEnum.HOPPY] });
      repository.findOpenCorrectionsByBeer.mockResolvedValue(RECORDS);

      const result = await service.getBeerCorrections(ALICE, 1);

      expect(result.map((correction) => correction.id)).toEqual([12, 13]);
      expect(result[0]).toMatchObject({ beerName: "Chimay Rouge", currentValue: null, proposedByName: "Alice", agreeCount: 1, disagreeCount: 0, isMine: true });
      expect(result[1]).toMatchObject({ currentValue: ["fruity", "hoppy"], proposedByName: "Bob", isMine: false });
    });

    it("fails when the proposer is not a known member", async () => {
      repository.findById.mockResolvedValue(CHIMAY);
      repository.findOpenCorrectionsByBeer.mockResolvedValue([{ ...RECORDS[0], proposedBy: 77 }]);

      await expect(service.getBeerCorrections(ALICE, 1)).rejects.toThrow("Proposer 77 of correction 12 not found.");
    });
  });

  describe("getBeerCorrections with votes", () => {
    it("carries the counters of the votes and the vote of the caller, the proposer agreement being implicit", async () => {
      repository.findById.mockResolvedValue(CHIMAY);
      repository.findOpenCorrectionsByBeer.mockResolvedValue([
        { id: 12, beerId: 1, characteristic: BeerCharacteristicEnum.IBU, proposedValue: 35, reason: "", proposedBy: BOB, createdAt: "2026-06-01T10:00:00.000Z", closesAt: "2026-06-08T10:00:00.000Z", ...OPEN_STATE },
        { id: 13, beerId: 1, characteristic: BeerCharacteristicEnum.EBC, proposedValue: 20, reason: "", proposedBy: BOB, createdAt: "2026-06-01T10:00:00.000Z", closesAt: "2026-06-09T10:00:00.000Z", ...OPEN_STATE },
      ]);
      repository.findCorrectionTallies.mockResolvedValue([
        { correctionId: 12, sense: CorrectionVoteSenseEnum.AGREE, count: 2 },
        { correctionId: 12, sense: CorrectionVoteSenseEnum.DISAGREE, count: 3 },
      ]);
      repository.findCorrectionVotesOfUser.mockResolvedValue([{ correctionId: 12, sense: CorrectionVoteSenseEnum.DISAGREE }]);

      const result = await service.getBeerCorrections(ALICE, 1);

      expect(repository.findCorrectionTallies).toHaveBeenCalledExactlyOnceWith([12, 13]);
      expect(repository.findCorrectionVotesOfUser).toHaveBeenCalledExactlyOnceWith(ALICE, [12, 13]);
      expect(result[0]).toMatchObject({ id: 12, agreeCount: 3, disagreeCount: 3, myVote: "disagree" });
      expect(result[1]).toMatchObject({ id: 13, agreeCount: 1, disagreeCount: 0, myVote: null });
    });
  });

  describe("voteCorrection", () => {
    const NOW = new Date("2026-06-02T09:00:00.000Z");
    const RECORD = {
      id: 12,
      beerId: 1,
      characteristic: BeerCharacteristicEnum.IBU,
      proposedValue: 35,
      reason: "Fiche",
      proposedBy: ALICE,
      createdAt: "2026-06-01T10:00:00.000Z",
      closesAt: "2026-06-08T10:00:00.000Z",
      ...OPEN_STATE,
    };
    const vote = (userId: number, sense: CorrectionVoteSenseEnum, id = 12) => service.voteCorrection(userId, id, { sense });
    const failureOf = (userId: number, sense: CorrectionVoteSenseEnum, id = 12) => vote(userId, sense, id).catch((error: unknown) => error);

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(NOW);
      repository.findCorrectionById.mockResolvedValue(RECORD);
      repository.findById.mockResolvedValue(CHIMAY);
      repository.upsertCorrectionVote.mockResolvedValue(undefined);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("answers 404 for an unknown correction without saving anything", async () => {
      repository.findCorrectionById.mockResolvedValue(null);

      const failure = await failureOf(BOB, CorrectionVoteSenseEnum.AGREE, 99);

      expect(failure).toBeInstanceOf(NotFoundException);
      expect((failure as NotFoundException).message).toBe("Correction 99 not found.");
      expect(repository.findCorrectionById).toHaveBeenCalledExactlyOnceWith(99);
      expect(repository.upsertCorrectionVote).not.toHaveBeenCalled();
    });

    it("answers 403 to the proposer in both senses without saving anything", async () => {
      const agree = await failureOf(ALICE, CorrectionVoteSenseEnum.AGREE);
      const disagree = await failureOf(ALICE, CorrectionVoteSenseEnum.DISAGREE);

      expect(agree).toBeInstanceOf(ForbiddenException);
      expect(disagree).toBeInstanceOf(ForbiddenException);
      expect((agree as ForbiddenException).message).toBe("You cannot vote on your own correction.");
      expect(repository.upsertCorrectionVote).not.toHaveBeenCalled();
    });

    it("saves the vote of another user then answers the correction read back with the counters and the vote", async () => {
      repository.findCorrectionTallies.mockResolvedValue([{ correctionId: 12, sense: CorrectionVoteSenseEnum.AGREE, count: 1 }]);
      repository.findCorrectionVotesOfUser.mockResolvedValue([{ correctionId: 12, sense: CorrectionVoteSenseEnum.AGREE }]);

      const result = await vote(BOB, CorrectionVoteSenseEnum.AGREE);

      expect(repository.upsertCorrectionVote).toHaveBeenCalledExactlyOnceWith({ correctionId: 12, userId: BOB, sense: "agree", votedAt: NOW });
      expect(repository.upsertCorrectionVote.mock.invocationCallOrder[0]).toBeLessThan(repository.findCorrectionTallies.mock.invocationCallOrder[0]);
      expect(repository.findCorrectionTallies).toHaveBeenCalledExactlyOnceWith([12]);
      expect(repository.findCorrectionVotesOfUser).toHaveBeenCalledExactlyOnceWith(BOB, [12]);
      expect(repository.findById).toHaveBeenCalledExactlyOnceWith(1);
      expect(result).toStrictEqual({
        id: 12,
        beerId: 1,
        beerName: "Chimay Rouge",
        characteristic: "ibu",
        currentValue: null,
        proposedValue: 35,
        reason: "Fiche",
        proposedBy: ALICE,
        proposedByName: "Alice",
        createdAt: "2026-06-01T10:00:00.000Z",
        closesAt: "2026-06-08T10:00:00.000Z",
        status: "open",
        resolvedAt: null,
        agreeCount: 2,
        disagreeCount: 0,
        myVote: "agree",
        isMine: false,
      });
    });

    it("answers one agreement and one disagreement after a change of vote", async () => {
      repository.findCorrectionTallies.mockResolvedValue([{ correctionId: 12, sense: CorrectionVoteSenseEnum.DISAGREE, count: 1 }]);
      repository.findCorrectionVotesOfUser.mockResolvedValue([{ correctionId: 12, sense: CorrectionVoteSenseEnum.DISAGREE }]);

      const result = await vote(BOB, CorrectionVoteSenseEnum.DISAGREE);

      expect(repository.upsertCorrectionVote).toHaveBeenCalledExactlyOnceWith({ correctionId: 12, userId: BOB, sense: "disagree", votedAt: NOW });
      expect(result).toMatchObject({ agreeCount: 1, disagreeCount: 1, myVote: "disagree" });
    });

    it("counts the vote of the author of the beer like any other", async () => {
      repository.findCorrectionById.mockResolvedValue({ ...RECORD, beerId: 5, proposedBy: BOB });
      repository.findById.mockResolvedValue(ALICE_BEER);
      repository.findCorrectionVotesOfUser.mockResolvedValue([{ correctionId: 12, sense: CorrectionVoteSenseEnum.AGREE }]);

      const result = await vote(ALICE, CorrectionVoteSenseEnum.AGREE);

      expect(repository.upsertCorrectionVote).toHaveBeenCalledExactlyOnceWith({ correctionId: 12, userId: ALICE, sense: "agree", votedAt: NOW });
      expect(result).toMatchObject({ beerId: 5, beerName: "Brune du Mont", proposedByName: "Bob", myVote: "agree", isMine: false });
    });

    it("answers 409 for a closed correction, in either status, without saving anything", async () => {
      for (const status of [CorrectionStatusEnum.ACCEPTED, CorrectionStatusEnum.REJECTED]) {
        repository.findCorrectionById.mockResolvedValue({ ...RECORD, status });

        const failure = await failureOf(BOB, CorrectionVoteSenseEnum.AGREE);

        expect(failure).toBeInstanceOf(ConflictException);
        expect((failure as ConflictException).message).toBe("Correction 12 is closed.");
      }
      expect(repository.upsertCorrectionVote).not.toHaveBeenCalled();
    });

    it("answers 403 before 409 to the proposer of a closed correction", async () => {
      repository.findCorrectionById.mockResolvedValue({ ...RECORD, status: CorrectionStatusEnum.ACCEPTED });

      const failure = await failureOf(ALICE, CorrectionVoteSenseEnum.AGREE);

      expect(failure).toBeInstanceOf(ForbiddenException);
      expect(repository.upsertCorrectionVote).not.toHaveBeenCalled();
    });

    it("resolves the due corrections before reading the correction, then answers 409 when it has just been closed", async () => {
      repository.findDueCorrections.mockResolvedValue([RECORD]);
      repository.findCorrectionById.mockResolvedValue({ ...RECORD, status: CorrectionStatusEnum.REJECTED });
      repository.findById.mockResolvedValue(CHIMAY);
      repository.findByIds.mockResolvedValue([CHIMAY]);

      const failure = await failureOf(BOB, CorrectionVoteSenseEnum.AGREE);

      expect(failure).toBeInstanceOf(ConflictException);
      expect(repository.findDueCorrections).toHaveBeenCalledExactlyOnceWith(NOW);
      expect(repository.resolveCorrection).toHaveBeenCalledExactlyOnceWith(12, "rejected", "null", NOW, 1, null);
      expect(repository.resolveCorrection.mock.invocationCallOrder[0]).toBeLessThan(repository.findCorrectionById.mock.invocationCallOrder[0]);
      expect(repository.upsertCorrectionVote).not.toHaveBeenCalled();
    });

    it("resolves the due corrections before answering 404 for an unknown correction", async () => {
      repository.findCorrectionById.mockResolvedValue(null);

      await failureOf(BOB, CorrectionVoteSenseEnum.AGREE, 99);

      expect(repository.findDueCorrections.mock.invocationCallOrder[0]).toBeLessThan(repository.findCorrectionById.mock.invocationCallOrder[0]);
    });

    it("fails when the proposer of the correction is not a known member", async () => {
      repository.findCorrectionById.mockResolvedValue({ ...RECORD, proposedBy: 77 });

      await expect(vote(CAROL, CorrectionVoteSenseEnum.AGREE)).rejects.toThrow("Proposer 77 of correction 12 not found.");
    });
  });

  describe("getCorrectionBoard", () => {
    const RECORD_BASE = { characteristic: BeerCharacteristicEnum.IBU, proposedValue: 35, reason: "", createdAt: "2026-06-01T10:00:00.000Z", ...OPEN_STATE };
    const RECORDS = [
      { ...RECORD_BASE, id: 12, beerId: 1, proposedBy: ALICE, closesAt: "2026-06-05T10:00:00.000Z" },
      { ...RECORD_BASE, id: 13, beerId: 5, proposedBy: BOB, closesAt: "2026-06-06T10:00:00.000Z" },
      { ...RECORD_BASE, id: 14, beerId: 1, proposedBy: BOB, closesAt: "2026-06-07T10:00:00.000Z" },
    ];

    beforeEach(() => {
      repository.findOpenCorrections.mockResolvedValue(RECORDS);
      repository.findByIds.mockResolvedValue([CHIMAY, ALICE_BEER]);
    });

    it("answers an empty board without any open correction", async () => {
      repository.findOpenCorrections.mockResolvedValue([]);
      repository.findByIds.mockResolvedValue([]);

      expect(await service.getCorrectionBoard(ALICE)).toStrictEqual({ open: [], recentlyClosed: [], pendingCount: 0 });
    });

    it("answers the open corrections in repository order, each with its beer, counters and vote of the caller", async () => {
      repository.findCorrectionTallies.mockResolvedValue([
        { correctionId: 13, sense: CorrectionVoteSenseEnum.AGREE, count: 2 },
        { correctionId: 13, sense: CorrectionVoteSenseEnum.DISAGREE, count: 1 },
      ]);
      repository.findCorrectionVotesOfUser.mockResolvedValue([{ correctionId: 13, sense: CorrectionVoteSenseEnum.AGREE }]);

      const board = await service.getCorrectionBoard(ALICE);

      expect(repository.findByIds).toHaveBeenCalledExactlyOnceWith([1, 5]);
      expect(repository.findCorrectionTallies).toHaveBeenCalledExactlyOnceWith([12, 13, 14]);
      expect(repository.findCorrectionVotesOfUser).toHaveBeenCalledExactlyOnceWith(ALICE, [12, 13, 14]);
      expect(board.open.map((correction) => correction.id)).toEqual([12, 13, 14]);
      expect(board.open.map((correction) => correction.beerName)).toEqual(["Chimay Rouge", "Brune du Mont", "Chimay Rouge"]);
      expect(board.open.map((correction) => [correction.agreeCount, correction.disagreeCount, correction.myVote, correction.isMine])).toEqual([
        [1, 0, null, true],
        [3, 1, "agree", false],
        [1, 0, null, false],
      ]);
      expect(board.recentlyClosed).toEqual([]);
    });

    it("answers the recently closed corrections with their status, resolution date and previous value, the ten latest being asked", async () => {
      const closedRecord = {
        ...RECORD_BASE,
        id: 20,
        beerId: 1,
        proposedBy: BOB,
        closesAt: "2026-06-04T10:00:00.000Z",
        status: CorrectionStatusEnum.ACCEPTED,
        resolvedAt: "2026-06-04T11:00:00.000Z",
        previousValue: 20,
      };
      const rejectedRecord = { ...closedRecord, id: 21, beerId: 5, status: CorrectionStatusEnum.REJECTED, previousValue: null };
      repository.findRecentlyClosedCorrections.mockResolvedValue([closedRecord, rejectedRecord]);
      repository.findCorrectionTallies.mockResolvedValue([
        { correctionId: 20, sense: CorrectionVoteSenseEnum.AGREE, count: 1 },
        { correctionId: 21, sense: CorrectionVoteSenseEnum.DISAGREE, count: 2 },
      ]);
      repository.findCorrectionVotesOfUser.mockResolvedValue([{ correctionId: 20, sense: CorrectionVoteSenseEnum.AGREE }]);

      const board = await service.getCorrectionBoard(ALICE);

      expect(repository.findRecentlyClosedCorrections).toHaveBeenCalledExactlyOnceWith(10);
      expect(repository.findCorrectionTallies).toHaveBeenCalledExactlyOnceWith([12, 13, 14, 20, 21]);
      expect(board.open.map((correction) => correction.id)).toEqual([12, 13, 14]);
      expect(board.recentlyClosed).toStrictEqual([
        {
          id: 20,
          beerId: 1,
          beerName: "Chimay Rouge",
          characteristic: "ibu",
          currentValue: 20,
          proposedValue: 35,
          reason: "",
          proposedBy: BOB,
          proposedByName: "Bob",
          createdAt: "2026-06-01T10:00:00.000Z",
          closesAt: "2026-06-04T10:00:00.000Z",
          status: "accepted",
          resolvedAt: "2026-06-04T11:00:00.000Z",
          agreeCount: 2,
          disagreeCount: 0,
          myVote: "agree",
          isMine: false,
        },
        expect.objectContaining({ id: 21, beerName: "Brune du Mont", currentValue: null, status: "rejected", agreeCount: 1, disagreeCount: 2, myVote: null }),
      ]);
      expect(board.pendingCount).toBe(2);
    });

    it("does not count the closed corrections as pending", async () => {
      repository.findOpenCorrections.mockResolvedValue([]);
      repository.findRecentlyClosedCorrections.mockResolvedValue([
        { ...RECORD_BASE, id: 20, beerId: 1, proposedBy: BOB, closesAt: "2026-06-04T10:00:00.000Z", status: CorrectionStatusEnum.REJECTED, resolvedAt: "2026-06-04T11:00:00.000Z", previousValue: null },
      ]);

      expect(await service.getCorrectionBoard(ALICE)).toMatchObject({ open: [], pendingCount: 0 });
    });

    it("resolves the due corrections before reading the open and the closed ones", async () => {
      await service.getCorrectionBoard(ALICE);

      const resolution = repository.findDueCorrections.mock.invocationCallOrder[0];
      expect(resolution).toBeLessThan(repository.findOpenCorrections.mock.invocationCallOrder[0]);
      expect(resolution).toBeLessThan(repository.findRecentlyClosedCorrections.mock.invocationCallOrder[0]);
    });

    it("counts as pending the open corrections of others without a vote of the caller", async () => {
      repository.findCorrectionVotesOfUser.mockResolvedValue([{ correctionId: 13, sense: CorrectionVoteSenseEnum.DISAGREE }]);

      expect((await service.getCorrectionBoard(ALICE)).pendingCount).toBe(1);
    });

    it("counts none as pending when the caller has voted on every correction of the others or proposed them", async () => {
      repository.findCorrectionVotesOfUser.mockResolvedValue([{ correctionId: 12, sense: CorrectionVoteSenseEnum.AGREE }]);

      expect((await service.getCorrectionBoard(BOB)).pendingCount).toBe(0);
    });

    it("counts every correction of others as pending for a caller who voted on none", async () => {
      expect((await service.getCorrectionBoard(CAROL)).pendingCount).toBe(3);
    });

    it("fails when the beer or the proposer of a correction is unknown", async () => {
      repository.findByIds.mockResolvedValue([CHIMAY]);
      await expect(service.getCorrectionBoard(ALICE)).rejects.toThrow("Beer 5 of correction 13 not found.");

      repository.findByIds.mockResolvedValue([CHIMAY, ALICE_BEER]);
      repository.findOpenCorrections.mockResolvedValue([{ ...RECORDS[0], proposedBy: 77 }]);
      await expect(service.getCorrectionBoard(ALICE)).rejects.toThrow("Proposer 77 of correction 12 not found.");
    });
  });

  describe("resolveDueCorrections", () => {
    const NOW = new Date("2026-06-10T12:00:00.000Z");
    const DUE = {
      id: 12,
      beerId: 1,
      characteristic: BeerCharacteristicEnum.IBU,
      proposedValue: 35,
      reason: "",
      proposedBy: ALICE,
      createdAt: "2026-06-01T10:00:00.000Z",
      closesAt: "2026-06-08T10:00:00.000Z",
      ...OPEN_STATE,
    };
    const tally = (correctionId: number, agree: number, disagree: number) => [
      { correctionId, sense: CorrectionVoteSenseEnum.AGREE, count: agree },
      { correctionId, sense: CorrectionVoteSenseEnum.DISAGREE, count: disagree },
    ];

    beforeEach(() => {
      repository.findDueCorrections.mockResolvedValue([DUE]);
      repository.findByIds.mockResolvedValue([{ ...CHIMAY, ibu: 20 }]);
    });

    it("reads nothing more than the due corrections when none is due", async () => {
      repository.findDueCorrections.mockResolvedValue([]);

      await service.resolveDueCorrections(NOW);

      expect(repository.findDueCorrections).toHaveBeenCalledExactlyOnceWith(NOW);
      expect(repository.findByIds).not.toHaveBeenCalled();
      expect(repository.findCorrectionTallies).not.toHaveBeenCalled();
      expect(repository.resolveCorrection).not.toHaveBeenCalled();
    });

    it.each([
      ["the proposer and one more agreement against one disagreement", 1, 1, "accepted", { ibu: 35 }],
      ["the proposer and one more agreement against none", 1, 0, "accepted", { ibu: 35 }],
      ["three agreements against two disagreements", 2, 2, "accepted", { ibu: 35 }],
      ["the proposer alone", 0, 0, "rejected", null],
      ["the proposer against one disagreement", 0, 1, "rejected", null],
      ["two agreements against two disagreements", 1, 2, "rejected", null],
      ["three agreements against three disagreements", 2, 3, "rejected", null],
    ])("closes the correction with %s as %s", async (_label, agreeVotes, disagreeVotes, status, change) => {
      repository.findCorrectionTallies.mockResolvedValue(tally(12, agreeVotes, disagreeVotes));

      await service.resolveDueCorrections(NOW);

      expect(repository.resolveCorrection).toHaveBeenCalledExactlyOnceWith(12, status, "20", NOW, 1, change);
    });

    it("keeps the value of the beer at the closing as the previous value, null when it is not filled in", async () => {
      repository.findByIds.mockResolvedValue([CHIMAY]);
      repository.findCorrectionTallies.mockResolvedValue(tally(12, 1, 0));

      await service.resolveDueCorrections(NOW);

      expect(repository.resolveCorrection).toHaveBeenCalledExactlyOnceWith(12, "accepted", "null", NOW, 1, { ibu: 35 });
    });

    it("keeps a list as JSON and applies the list change, an empty list being null", async () => {
      const aromas = { ...DUE, id: 13, characteristic: BeerCharacteristicEnum.AROMAS, proposedValue: ["citrus"] };
      const formats = { ...DUE, id: 14, characteristic: BeerCharacteristicEnum.FORMATS, proposedValue: ["can"] };
      repository.findDueCorrections.mockResolvedValue([aromas, formats]);
      repository.findByIds.mockResolvedValue([{ ...CHIMAY, aromas: [BeerAromaEnum.FRUITY, BeerAromaEnum.HOPPY], formats: [] }]);
      repository.findCorrectionTallies.mockResolvedValue([...tally(13, 1, 0), ...tally(14, 1, 0)]);

      await service.resolveDueCorrections(NOW);

      expect(repository.resolveCorrection).toHaveBeenNthCalledWith(1, 13, "accepted", '["fruity","hoppy"]', NOW, 1, { aromas: ["citrus"] });
      expect(repository.resolveCorrection).toHaveBeenNthCalledWith(2, 14, "accepted", "null", NOW, 1, { formats: ["can"] });
    });

    it("reads the tallies and the beers once for all the due corrections, then closes each one in order", async () => {
      const second = { ...DUE, id: 13, beerId: 5, characteristic: BeerCharacteristicEnum.EBC, proposedValue: 20, proposedBy: BOB };
      const third = { ...DUE, id: 14, beerId: 1, characteristic: BeerCharacteristicEnum.BODY, proposedValue: 3 };
      repository.findDueCorrections.mockResolvedValue([DUE, second, third]);
      repository.findByIds.mockResolvedValue([CHIMAY, ALICE_BEER]);
      repository.findCorrectionTallies.mockResolvedValue([...tally(12, 0, 3), ...tally(13, 2, 1)]);

      await service.resolveDueCorrections(NOW);

      expect(repository.findByIds).toHaveBeenCalledExactlyOnceWith([1, 5]);
      expect(repository.findCorrectionTallies).toHaveBeenCalledExactlyOnceWith([12, 13, 14]);
      expect(repository.resolveCorrection.mock.calls.map(([id, status]) => [id, status])).toEqual([
        [12, "rejected"],
        [13, "accepted"],
        [14, "rejected"],
      ]);
    });

    it("goes on when another reader has already closed the correction", async () => {
      repository.findCorrectionTallies.mockResolvedValue(tally(12, 1, 0));
      repository.resolveCorrection.mockResolvedValue(false);

      await expect(service.resolveDueCorrections(NOW)).resolves.toBeUndefined();
      expect(repository.resolveCorrection).toHaveBeenCalledOnce();
    });

    it("fails without closing anything when the beer of a due correction is unknown", async () => {
      repository.findByIds.mockResolvedValue([]);

      await expect(service.resolveDueCorrections(NOW)).rejects.toThrow("Beer 1 of correction 12 not found.");
      expect(repository.resolveCorrection).not.toHaveBeenCalled();
    });
  });

  describe("resolution before reading", () => {
    const NOW = new Date("2026-06-10T12:00:00.000Z");
    const DUE = {
      id: 12,
      beerId: 1,
      characteristic: BeerCharacteristicEnum.IBU,
      proposedValue: 35,
      reason: "",
      proposedBy: BOB,
      createdAt: "2026-06-01T10:00:00.000Z",
      closesAt: "2026-06-08T10:00:00.000Z",
      ...OPEN_STATE,
    };
    const resolvedFirst = (reader: { mock: { invocationCallOrder: number[] } }): boolean =>
      repository.resolveCorrection.mock.invocationCallOrder[0] < reader.mock.invocationCallOrder[0];

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(NOW);
      repository.findDueCorrections.mockResolvedValue([DUE]);
      repository.findById.mockResolvedValue(CHIMAY);
      repository.findByIds.mockResolvedValue([CHIMAY]);
      repository.findOpenCorrectionsByBeer.mockResolvedValue([]);
      repository.findOpenCorrections.mockResolvedValue([]);
      repository.countCorrectionsSince.mockResolvedValue(0);
      repository.existsOpenCorrection.mockResolvedValue(false);
      repository.createCorrection.mockResolvedValue({ ...DUE, id: 15, proposedBy: ALICE });
      usersService.getUser.mockResolvedValue(MEMBERS[0]);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("resolves the due corrections before reading a beer", async () => {
      await service.getBeerForUser(ALICE, 1);

      expect(repository.findDueCorrections).toHaveBeenCalledExactlyOnceWith(NOW);
      expect(repository.resolveCorrection).toHaveBeenCalledOnce();
      expect(resolvedFirst(repository.findById)).toBe(true);
    });

    it("resolves the due corrections before answering 404 for an unknown beer", async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.getBeerForUser(ALICE, 99)).rejects.toThrow(NotFoundException);
      expect(repository.findDueCorrections).toHaveBeenCalledOnce();
    });

    it("resolves the due corrections before reading the corrections of a beer", async () => {
      await service.getBeerCorrections(ALICE, 1);

      expect(repository.findDueCorrections).toHaveBeenCalledExactlyOnceWith(NOW);
      expect(resolvedFirst(repository.findOpenCorrectionsByBeer)).toBe(true);
    });

    it("resolves the due corrections before validating the value of a proposal and before reading the beer", async () => {
      const failure = await service
        .proposeCorrection(ALICE, 1, { characteristic: BeerCharacteristicEnum.IBU, value: 9999 })
        .catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(BadRequestException);
      expect(repository.findDueCorrections).toHaveBeenCalledExactlyOnceWith(NOW);
      expect(repository.resolveCorrection).toHaveBeenCalledOnce();
      expect(repository.findById).not.toHaveBeenCalled();
    });

    it("resolves the due corrections before checking whether a correction of the characteristic is open", async () => {
      await service.proposeCorrection(ALICE, 1, { characteristic: BeerCharacteristicEnum.IBU, value: 35 });

      expect(resolvedFirst(repository.existsOpenCorrection)).toBe(true);
      expect(repository.createCorrection).toHaveBeenCalledOnce();
    });

    it("does not resolve anything when listing the catalogue", async () => {
      repository.findPage.mockResolvedValue({ items: [], total: 0 });

      await service.getBeers(ALICE, {});

      expect(repository.findDueCorrections).not.toHaveBeenCalled();
      expect(repository.resolveCorrection).not.toHaveBeenCalled();
    });
  });
});
