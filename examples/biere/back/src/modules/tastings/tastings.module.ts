import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Checkin } from "@/modules/tastings/entities/checkin.entity";
import { Photo } from "@/modules/tastings/entities/photo.entity";
import { WishlistItem } from "@/modules/tastings/entities/wishlist-item.entity";
import { TastingsRepository } from "@/modules/tastings/tastings.repository";
import { TastingsService } from "@/modules/tastings/tastings.service";

@Module({
  imports: [TypeOrmModule.forFeature([Checkin, WishlistItem, Photo])],
  providers: [TastingsService, TastingsRepository],
  exports: [TastingsService],
})
export class TastingsModule {}
