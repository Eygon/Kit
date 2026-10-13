import { HttpStatus } from "@nestjs/common";
import { HTTP_CODE_METADATA, PATH_METADATA, ROUTE_ARGS_METADATA } from "@nestjs/common/constants";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BeerVenuesController } from "@/modules/venues/beer-venues.controller";
import type { BeerVenueDto } from "@/modules/venues/dtos/beer-venue.dto";
import { AvailabilityStatusEnum } from "@/modules/venues/enums/availability-status.enum";
import { VenueTypeEnum } from "@/modules/venues/enums/venue-type.enum";
import { VenuesService } from "@/modules/venues/venues.service";

const BEER_VENUE: BeerVenueDto = {
  venueId: 7,
  venueName: "La Fine Mousse",
  venueType: VenueTypeEnum.BAR,
  city: "Paris",
  address: "6 avenue Jean Aicard, 75011 Paris",
  latitude: 48.8655,
  longitude: 2.3802,
  status: AvailabilityStatusEnum.CONFIRMED,
  lastConfirmedAt: "2026-03-10T18:30:00.000Z",
  recentVoterCount: 3,
  distanceKm: 1.5,
};

describe("BeerVenuesController", () => {
  const service = { getBeerVenues: vi.fn() };

  const buildController = async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [BeerVenuesController],
      providers: [{ provide: VenuesService, useValue: service }],
    }).compile();
    return moduleRef.get(BeerVenuesController);
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns the venues of the beer read by the service with the position of the query", async () => {
    service.getBeerVenues.mockResolvedValue([BEER_VENUE]);
    const controller = await buildController();
    const query = { latitude: 48.8, longitude: 2.3 };

    expect(await controller.getAll(4, query)).toEqual([BEER_VENUE]);
    expect(service.getBeerVenues).toHaveBeenCalledWith(4, query);
  });

  it("is mounted on beers/:beerId/venues and declares 200", () => {
    expect(Reflect.getMetadata(PATH_METADATA, BeerVenuesController)).toBe("beers/:beerId/venues");
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, BeerVenuesController.prototype.getAll)).toBe(HttpStatus.OK);
  });

  it("binds the beer id through a pipe", () => {
    const args: Record<string, { pipes: unknown[] }> = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      BeerVenuesController,
      "getAll",
    );

    expect(Object.values(args).some((arg) => arg.pipes.length === 1)).toBe(true);
  });
});
