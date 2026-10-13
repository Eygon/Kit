import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BEER_PAGE_SIZE_DEFAULT } from "@/modules/beers/beers.constants";
import { BeersRepository } from "@/modules/beers/beers.repository";
import { BeersService } from "@/modules/beers/beers.service";
import { TastingsService } from "@/modules/tastings/tastings.service";
import type { BeerDto } from "@/modules/beers/dtos/beer.dto";
import type { BeerFacetsDto } from "@/modules/beers/dtos/beer-facets.dto";
import { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";
import { BeerFormatEnum } from "@/modules/beers/enums/beer-format.enum";
import { BeerSortEnum } from "@/modules/beers/enums/beer-sort.enum";
import { BeerStatusEnum } from "@/modules/beers/enums/beer-status.enum";

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
};

const ALICE = 1;

const UNTOUCHED_CHIMAY = { ...CHIMAY, drunk: false, checkinCount: 0, inWishlist: false };

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
  const repository = { findPage: vi.fn(), findFacets: vi.fn(), findById: vi.fn(), findStyleGroups: vi.fn(), findByIds: vi.fn() };
  const tastingsService = { getBeerStates: vi.fn(), getDrunkBeerIds: vi.fn(), getWishlistBeerIds: vi.fn() };
  let service: BeersService;

  beforeEach(async () => {
    vi.resetAllMocks();
    repository.findFacets.mockResolvedValue(FACETS);
    tastingsService.getBeerStates.mockResolvedValue([]);
    const moduleRef = await Test.createTestingModule({
      providers: [
        BeersService,
        { provide: BeersRepository, useValue: repository },
        { provide: TastingsService, useValue: tastingsService },
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

      expect(page.items).toEqual([{ ...CHIMAY, drunk: true, checkinCount: 2, inWishlist: false }]);
      expect(tastingsService.getBeerStates).toHaveBeenCalledExactlyOnceWith(ALICE, [1]);
      expect(tastingsService.getDrunkBeerIds).not.toHaveBeenCalled();
      expect(tastingsService.getWishlistBeerIds).not.toHaveBeenCalled();
    });

    it("answers false, 0 and false for an item without state", async () => {
      tastingsService.getBeerStates.mockResolvedValue([]);

      const page = await service.getBeers(ALICE, {});

      expect(page.items).toEqual([{ ...CHIMAY, drunk: false, checkinCount: 0, inWishlist: false }]);
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
    it("returns the beer with the state of the user", async () => {
      repository.findById.mockResolvedValue(CHIMAY);
      tastingsService.getBeerStates.mockResolvedValue([{ beerId: 1, drunk: true, checkinCount: 2, inWishlist: true }]);

      expect(await service.getBeerForUser(ALICE, 1)).toEqual({ ...CHIMAY, drunk: true, checkinCount: 2, inWishlist: true });
      expect(tastingsService.getBeerStates).toHaveBeenCalledExactlyOnceWith(ALICE, [1]);
    });

    it("answers false, 0 and false when no state comes back", async () => {
      repository.findById.mockResolvedValue(CHIMAY);
      tastingsService.getBeerStates.mockResolvedValue([]);

      expect(await service.getBeerForUser(ALICE, 1)).toEqual({ ...CHIMAY, drunk: false, checkinCount: 0, inWishlist: false });
    });

    it("throws 404 for an unknown beer, without reading any state", async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.getBeerForUser(ALICE, 9999)).rejects.toThrow(new NotFoundException("Beer 9999 not found."));
      expect(tastingsService.getBeerStates).not.toHaveBeenCalled();
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
});
