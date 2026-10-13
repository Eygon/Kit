import { HttpStatus, ParseIntPipe, RequestMethod } from "@nestjs/common";
import { HTTP_CODE_METADATA, METHOD_METADATA, PATH_METADATA, ROUTE_ARGS_METADATA } from "@nestjs/common/constants";
import { RouteParamtypes } from "@nestjs/common/enums/route-paramtypes.enum";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readCurrentUserId } from "@/common/security/current-user-id.decorator";
import type { CreateVenueDto } from "@/modules/venues/dtos/create-venue.dto";
import type { CreateVoteDto } from "@/modules/venues/dtos/create-vote.dto";
import type { ReportVenueBeerDto } from "@/modules/venues/dtos/report-venue-beer.dto";
import type { VenueBeerDto } from "@/modules/venues/dtos/venue-beer.dto";
import type { VenueDto } from "@/modules/venues/dtos/venue.dto";
import type { VenueBeersQueryDto } from "@/modules/venues/dtos/venue-beers-query.dto";
import type { VenuesQueryDto } from "@/modules/venues/dtos/venues-query.dto";
import { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";
import { VoteSenseEnum } from "@/modules/venues/enums/vote-sense.enum";
import { AvailabilityStatusEnum } from "@/modules/venues/enums/availability-status.enum";
import { VenueTypeEnum } from "@/modules/venues/enums/venue-type.enum";
import { VenuesController } from "@/modules/venues/venues.controller";
import { VenuesService } from "@/modules/venues/venues.service";

interface ArgumentBinding {
  readonly index: number;
  readonly data?: unknown;
  readonly factory?: unknown;
  readonly pipes: readonly unknown[];
}

const bindingsOf = (action: string): Record<string, ArgumentBinding> =>
  Reflect.getMetadata(ROUTE_ARGS_METADATA, VenuesController, action);

const currentUserBindingOf = (action: string): ArgumentBinding | undefined =>
  Object.values(bindingsOf(action)).find((binding) => binding.factory === readCurrentUserId);

const VENUE: VenueDto = {
  id: 7,
  name: "La Fine Mousse",
  type: VenueTypeEnum.BAR,
  city: "Paris",
  address: "6 avenue Jean Aicard, 75011 Paris",
  latitude: 48.8655,
  longitude: 2.3802,
  description: "Un bar.",
  distanceKm: null,
  status: AvailabilityStatusEnum.CONFIRMED,
};

const VENUE_BEER: VenueBeerDto = {
  beerId: 3,
  beerName: "Orval",
  breweryName: "Brasserie d'Orval",
  styleName: "Trappiste pale",
  family: BeerFamilyEnum.TRAPPIST,
  status: AvailabilityStatusEnum.CONFIRMED,
  lastConfirmedAt: "2026-03-10T18:30:00.000Z",
  recentVoterCount: 3,
  nextVoteAt: null,
};

describe("VenuesController", () => {
  const service = { getVenues: vi.fn(), getVenue: vi.fn(), getVenueBeers: vi.fn(), vote: vi.fn(), createVenue: vi.fn(), reportBeer: vi.fn() };
  let controller: VenuesController;

  beforeEach(async () => {
    vi.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [VenuesController],
      providers: [{ provide: VenuesService, useValue: service }],
    }).compile();
    controller = moduleRef.get(VenuesController);
  });

  it("lists the venues of the query returned by the service", async () => {
    service.getVenues.mockResolvedValue([VENUE]);
    const query: VenuesQueryDto = { type: [VenueTypeEnum.BAR] };

    expect(await controller.getAll(query)).toEqual([VENUE]);
    expect(service.getVenues).toHaveBeenCalledWith(query);
  });

  it("returns one venue by id", async () => {
    service.getVenue.mockResolvedValue(VENUE);

    expect(await controller.getOne(7)).toBe(VENUE);
    expect(service.getVenue).toHaveBeenCalledWith(7);
  });

  it("is mounted on venues and declares 200 on both actions", () => {
    expect(Reflect.getMetadata(PATH_METADATA, VenuesController)).toBe("venues");
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, VenuesController.prototype.getAll)).toBe(HttpStatus.OK);
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, VenuesController.prototype.getOne)).toBe(HttpStatus.OK);
    expect(Reflect.getMetadata(PATH_METADATA, VenuesController.prototype.getOne)).toBe(":id");
  });

  it("binds the id through a pipe", () => {
    const args: Record<string, { pipes: unknown[] }> = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      VenuesController,
      "getOne",
    );

    expect(Object.values(args)[0].pipes).toHaveLength(1);
  });

  it("returns the beers of the venue read by the service for the current user and the query", async () => {
    service.getVenueBeers.mockResolvedValue([VENUE_BEER]);
    const query: VenueBeersQueryDto = { family: BeerFamilyEnum.TRAPPIST };

    expect(await controller.getBeers(5, 7, query)).toEqual([VENUE_BEER]);
    expect(service.getVenueBeers).toHaveBeenCalledWith(5, 7, query);
  });

  it("serves the beers of a venue on :id/beers with a 200", () => {
    expect(Reflect.getMetadata(PATH_METADATA, VenuesController.prototype.getBeers)).toBe(":id/beers");
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, VenuesController.prototype.getBeers)).toBe(HttpStatus.OK);
  });

  it("binds the current user first, the id through a ParseIntPipe second and the query third on the beers action", () => {
    const bindings = bindingsOf("getBeers");

    expect(Object.values(bindings)).toHaveLength(3);
    expect(currentUserBindingOf("getBeers")?.index).toBe(0);
    expect(bindings[`${RouteParamtypes.PARAM}:1`]).toMatchObject({ index: 1, data: "id", pipes: [ParseIntPipe] });
    expect(bindings[`${RouteParamtypes.QUERY}:2`]).toMatchObject({ index: 2 });
  });

  it("records the vote of the current user through the service and returns the updated beer", async () => {
    service.vote.mockResolvedValue(VENUE_BEER);
    const dto: CreateVoteDto = { sense: VoteSenseEnum.STILL };

    expect(await controller.vote(5, 7, 3, dto)).toBe(VENUE_BEER);
    expect(service.vote).toHaveBeenCalledWith(5, 7, 3, dto);
  });

  it("serves the vote on a POST :id/beers/:beerId/votes with a 201", () => {
    const handler = VenuesController.prototype.vote;

    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(":id/beers/:beerId/votes");
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.POST);
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(HttpStatus.CREATED);
  });

  it("binds the current user first, both ids through a ParseIntPipe then the body on the vote action", () => {
    const bindings = bindingsOf("vote");

    expect(Object.values(bindings)).toHaveLength(4);
    expect(currentUserBindingOf("vote")?.index).toBe(0);
    expect(bindings[`${RouteParamtypes.PARAM}:1`]).toMatchObject({ index: 1, data: "id", pipes: [ParseIntPipe] });
    expect(bindings[`${RouteParamtypes.PARAM}:2`]).toMatchObject({ index: 2, data: "beerId", pipes: [ParseIntPipe] });
    expect(bindings[`${RouteParamtypes.BODY}:3`]).toMatchObject({ index: 3 });
  });

  it("creates a venue through the service and returns the created venue", async () => {
    service.createVenue.mockResolvedValue(VENUE);
    const dto: CreateVenueDto = {
      name: "La Fine Mousse",
      type: VenueTypeEnum.BAR,
      address: "6 avenue Jean Aicard, 75011 Paris",
      latitude: 48.8655,
      longitude: 2.3802,
    };

    expect(await controller.create(dto)).toBe(VENUE);
    expect(service.createVenue).toHaveBeenCalledWith(dto);
  });

  it("serves the venue creation on a POST with a 201 and binds the body", () => {
    const handler = VenuesController.prototype.create;
    const args: Record<string, { pipes: unknown[] }> = Reflect.getMetadata(ROUTE_ARGS_METADATA, VenuesController, "create");

    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.POST);
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe("/");
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(HttpStatus.CREATED);
    expect(Object.values(args)).toHaveLength(1);
  });

  it("reports a beer at a venue through the service and returns the new link", async () => {
    service.reportBeer.mockResolvedValue(VENUE_BEER);
    const dto: ReportVenueBeerDto = { beerId: 3 };

    expect(await controller.reportBeer(7, dto)).toBe(VENUE_BEER);
    expect(service.reportBeer).toHaveBeenCalledWith(7, dto);
  });

  it("serves the beer report on a POST :id/beers with a 201", () => {
    const handler = VenuesController.prototype.reportBeer;

    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(":id/beers");
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.POST);
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(HttpStatus.CREATED);
  });

  it("binds the id through a pipe and the body on the beer report action", () => {
    const args: Record<string, { pipes: unknown[] }> = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      VenuesController,
      "reportBeer",
    );

    expect(Object.values(args)).toHaveLength(2);
    expect(Object.values(args).filter((arg) => arg.pipes.length === 1)).toHaveLength(1);
  });
});
