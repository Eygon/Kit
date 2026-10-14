import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CollectionsRepository } from "@/modules/collections/collections.repository";
import { CollectionsService } from "@/modules/collections/collections.service";
import { CollectionItem } from "@/modules/collections/entities/collection-item.entity";
import { Collection } from "@/modules/collections/entities/collection.entity";
import { MyCollectionsController } from "@/modules/collections/my-collections.controller";
import { UserCollectionsController } from "@/modules/collections/user-collections.controller";
import { BeersModule } from "@/modules/beers/beers.module";
import { SocialModule } from "@/modules/social/social.module";
import { TastingsModule } from "@/modules/tastings/tastings.module";
import { UsersModule } from "@/modules/users/users.module";

@Module({
  imports: [TypeOrmModule.forFeature([Collection, CollectionItem]), UsersModule, TastingsModule, SocialModule, BeersModule],
  controllers: [MyCollectionsController, UserCollectionsController],
  providers: [CollectionsService, CollectionsRepository],
})
export class CollectionsModule {}
