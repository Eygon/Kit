import { MODULE_METADATA } from "@nestjs/common/constants";
import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";
import { BadgesController } from "@/modules/profile/badges.controller";
import { BeersModule } from "@/modules/beers/beers.module";
import { ProfileModule } from "@/modules/profile/profile.module";
import { ProfileService } from "@/modules/profile/profile.service";
import { StatsController } from "@/modules/profile/stats.controller";
import { TastingsModule } from "@/modules/tastings/tastings.module";
import { VenuesModule } from "@/modules/venues/venues.module";
import { VenuesService } from "@/modules/venues/venues.service";
import { inMemoryDatabase } from "@/__tests__/support/test-database";

describe("ProfileModule", () => {
  it("wires the stats and badges controllers and the profile service on top of the beers and tastings modules", async () => {
    const moduleRef = await Test.createTestingModule({ imports: [inMemoryDatabase(), ProfileModule] }).compile();

    expect(moduleRef.get(StatsController)).toBeInstanceOf(StatsController);
    expect(moduleRef.get(BadgesController)).toBeInstanceOf(BadgesController);
    expect(moduleRef.get(ProfileService)).toBeInstanceOf(ProfileService);
    expect(Reflect.getMetadata(MODULE_METADATA.IMPORTS, ProfileModule)).toEqual([BeersModule, TastingsModule, VenuesModule]);
    expect(moduleRef.get(VenuesService, { strict: false })).toBeInstanceOf(VenuesService);
    expect(Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, ProfileModule)).toEqual([StatsController, BadgesController]);
    expect(Reflect.getMetadata(MODULE_METADATA.PROVIDERS, ProfileModule)).toEqual([ProfileService]);

    await moduleRef.close();
  });

  it("exports nothing", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.EXPORTS, ProfileModule)).toBeUndefined();
  });
});
