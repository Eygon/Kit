import { MODULE_METADATA } from "@nestjs/common/constants";
import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";
import { BeerStylesController } from "@/modules/beers/beer-styles.controller";
import { BeersController } from "@/modules/beers/beers.controller";
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

    expect(Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, BeersModule)).toEqual([BeersController, BeerStylesController]);
    expect(moduleRef.get(BeerStylesController)).toBeInstanceOf(BeerStylesController);

    await moduleRef.close();
  });
});
