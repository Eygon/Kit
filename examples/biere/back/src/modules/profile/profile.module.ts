import { Module } from "@nestjs/common";
import { BadgesController } from "@/modules/profile/badges.controller";
import { BeersModule } from "@/modules/beers/beers.module";
import { ProfileService } from "@/modules/profile/profile.service";
import { StatsController } from "@/modules/profile/stats.controller";
import { TastingsModule } from "@/modules/tastings/tastings.module";
import { VenuesModule } from "@/modules/venues/venues.module";

@Module({
  imports: [BeersModule, TastingsModule, VenuesModule],
  controllers: [StatsController, BadgesController],
  providers: [ProfileService],
})
export class ProfileModule {}
