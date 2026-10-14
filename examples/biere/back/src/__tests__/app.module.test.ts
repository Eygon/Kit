import type { INestApplication } from "@nestjs/common";
import { MODULE_METADATA } from "@nestjs/common/constants";
import { APP_FILTER, APP_GUARD, APP_PIPE } from "@nestjs/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "@/app.module";
import { HttpExceptionFilter } from "@/common/filters/http-exception.filter";
import { createValidationPipe } from "@/common/pipes/validation-pipe.factory";
import { CurrentUserGuard } from "@/common/security/current-user.guard";
import { DataSeeder } from "@/database/data-seeder";
import { BeersController } from "@/modules/beers/beers.controller";
import { HealthController } from "@/modules/health/health.controller";
import { CheckinsController } from "@/modules/pokedex/checkins.controller";
import { StatsController } from "@/modules/profile/stats.controller";
import { TastingsService } from "@/modules/tastings/tastings.service";
import { UsersController } from "@/modules/users/users.controller";
import { UsersService } from "@/modules/users/users.service";
import { VenuesController } from "@/modules/venues/venues.controller";
import { createTestApp } from "@/__tests__/support/test-app";

describe("AppModule", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("wires the feature modules and the database seeder", () => {
    expect(app.get(HealthController)).toBeInstanceOf(HealthController);
    expect(app.get(BeersController)).toBeInstanceOf(BeersController);
    expect(app.get(UsersController)).toBeInstanceOf(UsersController);
    expect(app.get(UsersService)).toBeInstanceOf(UsersService);
    expect(app.get(TastingsService)).toBeInstanceOf(TastingsService);
    expect(app.get(VenuesController)).toBeInstanceOf(VenuesController);
    expect(app.get(DataSeeder)).toBeInstanceOf(DataSeeder);
  });

  it("mounts the pokedex module so the check-ins controller is served", () => {
    expect(app.get(CheckinsController)).toBeInstanceOf(CheckinsController);
  });

  it("mounts the profile module so the stats controller is served", () => {
    expect(app.get(StatsController)).toBeInstanceOf(StatsController);
  });

  it("registers the identity guard, the validation pipe and the exception filter globally", () => {
    const providers: unknown = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, AppModule);

    expect(providers).toEqual([
      { provide: APP_GUARD, useClass: CurrentUserGuard },
      { provide: APP_PIPE, useFactory: createValidationPipe },
      { provide: APP_FILTER, useClass: HttpExceptionFilter },
    ]);
  });
});
