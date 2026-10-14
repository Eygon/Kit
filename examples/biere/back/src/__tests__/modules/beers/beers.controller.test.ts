import { HttpStatus, ParseIntPipe } from "@nestjs/common";
import { HTTP_CODE_METADATA, ROUTE_ARGS_METADATA } from "@nestjs/common/constants";
import { RouteParamtypes } from "@nestjs/common/enums/route-paramtypes.enum";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BeerSourceEnum } from "@/modules/beers/enums/beer-source.enum";
import { BeersController } from "@/modules/beers/beers.controller";
import { BeersService } from "@/modules/beers/beers.service";
import type { BeerDetailDto } from "@/modules/beers/dtos/beer-detail.dto";
import type { BeerPageDto } from "@/modules/beers/dtos/beer-page.dto";
import { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";
import { ReviewCriterionEnum } from "@/modules/beers/enums/review-criterion.enum";
import { BeerSortEnum } from "@/modules/beers/enums/beer-sort.enum";

const ALICE = 1;

const CHIMAY: BeerDetailDto = {
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
  createdByName: null,
  drunk: true,
  checkinCount: 2,
  inWishlist: false,
  averageRating: 4.3,
  reviewCount: 2,
  ratingDistribution: [1, 2, 3, 4, 5].map((stars) => ({ stars, count: stars === 4 ? 2 : 0 })),
  criteria: [
    { criterion: ReviewCriterionEnum.SWEETNESS, average: null, count: 2 },
    { criterion: ReviewCriterionEnum.ACIDITY, average: null, count: 0 },
    { criterion: ReviewCriterionEnum.BODY, average: null, count: 0 },
  ],
};

describe("BeersController", () => {
  const service = { getBeers: vi.fn(), getBeerForUser: vi.fn(), createBeer: vi.fn() };
  let controller: BeersController;

  beforeEach(async () => {
    vi.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [BeersController],
      providers: [{ provide: BeersService, useValue: service }],
    }).compile();
    controller = moduleRef.get(BeersController);
  });

  it("returns the page the service builds for the query", async () => {
    const page: BeerPageDto = {
      items: [CHIMAY],
      total: 1,
      page: 2,
      size: 5,
      facets: { families: [], countries: [], formats: [] },
      isApproximate: false,
    };
    const query = { q: "chimay", sort: BeerSortEnum.ABV, page: 2, size: 5 };
    service.getBeers.mockResolvedValue(page);

    expect(await controller.getAll(ALICE, query)).toBe(page);
    expect(service.getBeers).toHaveBeenCalledExactlyOnceWith(ALICE, query);
  });

  it("returns one beer with the state of the current user", async () => {
    service.getBeerForUser.mockResolvedValue(CHIMAY);

    expect(await controller.getOne(ALICE, 1)).toBe(CHIMAY);
    expect(service.getBeerForUser).toHaveBeenCalledExactlyOnceWith(ALICE, 1);
  });

  it("creates a beer for the current user from the body and returns what the service builds", async () => {
    const body = { name: "Brune du Mont", breweryName: "Brasserie du Mont", country: "FR", styleId: 2, abv: 6.5 };
    service.createBeer.mockResolvedValue(CHIMAY);

    expect(await controller.create(ALICE, body)).toBe(CHIMAY);
    expect(service.createBeer).toHaveBeenCalledExactlyOnceWith(ALICE, body);
  });

  it("declares 201 on the creation", () => {
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, BeersController.prototype.create)).toBe(HttpStatus.CREATED);
  });

  it("parses the beer id of the route with a ParseIntPipe", () => {
    const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, BeersController, "getOne") as Record<string, { pipes: unknown[] }>;

    expect(args[`${RouteParamtypes.PARAM}:1`].pipes).toEqual([ParseIntPipe]);
  });

  it("declares 200 on every action", () => {
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, BeersController.prototype.getAll)).toBe(HttpStatus.OK);
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, BeersController.prototype.getOne)).toBe(HttpStatus.OK);
  });
});
