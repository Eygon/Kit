import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_PIPE } from "@nestjs/core";
import { HttpExceptionFilter } from "@/common/filters/http-exception.filter";
import { createValidationPipe } from "@/common/pipes/validation-pipe.factory";
import { CurrentUserGuard } from "@/common/security/current-user.guard";
import { AppConfigModule } from "@/config/app-config.module";
import { DatabaseModule } from "@/database/database.module";
import { BeersModule } from "@/modules/beers/beers.module";
import { HealthModule } from "@/modules/health/health.module";
import { PokedexModule } from "@/modules/pokedex/pokedex.module";
import { ProfileModule } from "@/modules/profile/profile.module";
import { TastingsModule } from "@/modules/tastings/tastings.module";
import { UsersModule } from "@/modules/users/users.module";
import { VenuesModule } from "@/modules/venues/venues.module";

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    HealthModule,
    UsersModule,
    BeersModule,
    TastingsModule,
    PokedexModule,
    VenuesModule,
    ProfileModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: CurrentUserGuard },
    { provide: APP_PIPE, useFactory: createValidationPipe },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
