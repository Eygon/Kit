import { MODULE_METADATA } from "@nestjs/common/constants";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";
import { AvailabilityVote } from "@/modules/venues/entities/availability-vote.entity";
import { Venue } from "@/modules/venues/entities/venue.entity";
import { VenueBeer } from "@/modules/venues/entities/venue-beer.entity";
import { BeersModule } from "@/modules/beers/beers.module";
import { BeersService } from "@/modules/beers/beers.service";
import { TastingsModule } from "@/modules/tastings/tastings.module";
import { TastingsService } from "@/modules/tastings/tastings.service";
import { BeerVenuesController } from "@/modules/venues/beer-venues.controller";
import { VenuesController } from "@/modules/venues/venues.controller";
import { VenuesModule } from "@/modules/venues/venues.module";
import { VenuesRepository } from "@/modules/venues/venues.repository";
import { VenuesService } from "@/modules/venues/venues.service";
import { inMemoryDatabase } from "@/__tests__/support/test-database";

describe("VenuesModule", () => {
  it("wires controllers, service, repository and the three entity repositories", async () => {
    const moduleRef = await Test.createTestingModule({ imports: [inMemoryDatabase(), VenuesModule] }).compile();

    expect(moduleRef.get(VenuesController)).toBeInstanceOf(VenuesController);
    expect(moduleRef.get(BeerVenuesController)).toBeInstanceOf(BeerVenuesController);
    expect(moduleRef.get(VenuesService)).toBeInstanceOf(VenuesService);
    expect(moduleRef.get(BeersService, { strict: false })).toBeInstanceOf(BeersService);
    expect(moduleRef.get(TastingsService, { strict: false })).toBeInstanceOf(TastingsService);
    expect(moduleRef.get(VenuesRepository)).toBeInstanceOf(VenuesRepository);
    [Venue, VenueBeer, AvailabilityVote].forEach((entity) => {
      expect(moduleRef.get(getRepositoryToken(entity))).toBeDefined();
    });

    await moduleRef.close();
  });

  it("declares its providers and controllers and exports only its service", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, VenuesModule)).toEqual([VenuesController, BeerVenuesController]);
    expect(Reflect.getMetadata(MODULE_METADATA.IMPORTS, VenuesModule)).toContain(BeersModule);
    expect(Reflect.getMetadata(MODULE_METADATA.IMPORTS, VenuesModule)).toContain(TastingsModule);
    expect(Reflect.getMetadata(MODULE_METADATA.PROVIDERS, VenuesModule)).toEqual([VenuesService, VenuesRepository]);
    expect(Reflect.getMetadata(MODULE_METADATA.EXPORTS, VenuesModule)).toEqual([VenuesService]);
  });
});
