import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BeersModule } from "@/modules/beers/beers.module";
import { Follow } from "@/modules/social/entities/follow.entity";
import { FeedController } from "@/modules/social/feed.controller";
import { MeProfileController } from "@/modules/social/me-profile.controller";
import { ProfilesController } from "@/modules/social/profiles.controller";
import { SocialRepository } from "@/modules/social/social.repository";
import { SocialService } from "@/modules/social/social.service";
import { TastingsModule } from "@/modules/tastings/tastings.module";
import { UsersModule } from "@/modules/users/users.module";

@Module({
  imports: [TypeOrmModule.forFeature([Follow]), UsersModule, TastingsModule, BeersModule],
  controllers: [ProfilesController, MeProfileController, FeedController],
  providers: [SocialService, SocialRepository],
  exports: [SocialService],
})
export class SocialModule {}
