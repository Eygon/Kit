import { MODULE_METADATA } from "@nestjs/common/constants";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { describe, expect, it } from "vitest";
import { BeerStylesController } from "@/modules/beers/beer-styles.controller";
import { BreweriesController } from "@/modules/beers/breweries.controller";
import { BeerCorrectionsController } from "@/modules/beers/beer-corrections.controller";
import { CorrectionsController } from "@/modules/beers/corrections.controller";
import { BeerReviewsController } from "@/modules/beers/beer-reviews.controller";
import { BeersController } from "@/modules/beers/beers.controller";
import { BeerCorrection } from "@/modules/beers/entities/beer-correction.entity";
import { BeerCorrectionVote } from "@/modules/beers/entities/beer-correction-vote.entity";
import { Review } from "@/modules/beers/entities/review.entity";
import { UsersModule } from "@/modules/users/users.module";
import { UsersService } from "@/modules/users/users.service";
import { BeersModule } from "@/modules/beers/beers.module";
import { BeersRepository } from "@/modules/beers/beers.repository";
import { BeersService } from "@/modules/beers/beers.service";
import { TastingsModule } from "@/modules/tastings/tastings.module";
import { TastingsService } from "@/modules/tastings/tastings.service";
import { inMemoryDatabase } from "@/__tests__/support/test-database";

describe("BeersModule", () => {
  it("wires controller, service and repository", async () => {
    const moduleRef = await Test.createTestingModule({ imports: [inMemoryDatabase(), BeersModule] }).compile();

    expect(moduleRef.get(BeersController)).toBeInstanceOf(BeersController);
    expect(moduleRef.get(BeersService)).toBeInstanceOf(BeersService);
    expect(moduleRef.get(BeersRepository)).toBeInstanceOf(BeersRepository);

    await moduleRef.close();
  });

  it("imports the tastings module so that the service reaches the user state", async () => {
    const moduleRef = await Test.createTestingModule({ imports: [inMemoryDatabase(), BeersModule] }).compile();

    expect(Reflect.getMetadata(MODULE_METADATA.IMPORTS, BeersModule)).toContain(TastingsModule);
    expect(moduleRef.get(TastingsService, { strict: false })).toBeInstanceOf(TastingsService);

    await moduleRef.close();
  });

  it("exports only the service to other modules", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.EXPORTS, BeersModule)).toEqual([BeersService]);
  });

  it("mounts the beer styles controller next to the beers controller", async () => {
    const moduleRef = await Test.createTestingModule({ imports: [inMemoryDatabase(), BeersModule] }).compile();

    expect(Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, BeersModule)).toEqual([
      BeersController,
      BeerStylesController,
      BeerReviewsController,
      BeerCorrectionsController,
      CorrectionsController,
      BreweriesController,
    ]);
    expect(moduleRef.get(CorrectionsController)).toBeInstanceOf(CorrectionsController);
    expect(moduleRef.get(BeerCorrectionsController)).toBeInstanceOf(BeerCorrectionsController);
    expect(moduleRef.get(BreweriesController)).toBeInstanceOf(BreweriesController);
    expect(moduleRef.get(BeerStylesController)).toBeInstanceOf(BeerStylesController);
    expect(moduleRef.get(BeerReviewsController)).toBeInstanceOf(BeerReviewsController);

    await moduleRef.close();
  });

  it("imports the users module so that the service reaches the review authors", async () => {
    const moduleRef = await Test.createTestingModule({ imports: [inMemoryDatabase(), BeersModule] }).compile();

    expect(Reflect.getMetadata(MODULE_METADATA.IMPORTS, BeersModule)).toContain(UsersModule);
    expect(moduleRef.get(UsersService, { strict: false })).toBeInstanceOf(UsersService);

    await moduleRef.close();
  });

  it("registers the review entity with the beers module", async () => {
    const moduleRef = await Test.createTestingModule({ imports: [inMemoryDatabase(), BeersModule] }).compile();

    expect(moduleRef.get(getRepositoryToken(Review), { strict: false })).toBeDefined();

    await moduleRef.close();
  });

  it("registers the correction entity with the beers module", async () => {
    const moduleRef = await Test.createTestingModule({ imports: [inMemoryDatabase(), BeersModule] }).compile();

    expect(moduleRef.get(getRepositoryToken(BeerCorrection), { strict: false })).toBeDefined();

    await moduleRef.close();
  });

  it("registers the correction vote entity with the beers module", async () => {
    const moduleRef = await Test.createTestingModule({ imports: [inMemoryDatabase(), BeersModule] }).compile();

    expect(moduleRef.get(getRepositoryToken(BeerCorrectionVote), { strict: false })).toBeDefined();

    await moduleRef.close();
  });
});
