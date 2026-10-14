import { Module } from "@nestjs/common";
import { BeersModule } from "@/modules/beers/beers.module";
import { DexController } from "@/modules/pokedex/dex.controller";
import { CheckinsController } from "@/modules/pokedex/checkins.controller";
import { PhotosController } from "@/modules/pokedex/photos.controller";
import { PokedexService } from "@/modules/pokedex/pokedex.service";
import { WishlistController } from "@/modules/pokedex/wishlist.controller";
import { TastingsModule } from "@/modules/tastings/tastings.module";
import { VenuesModule } from "@/modules/venues/venues.module";

@Module({
  imports: [BeersModule, TastingsModule, VenuesModule],
  controllers: [CheckinsController, PhotosController, WishlistController, DexController],
  providers: [PokedexService],
})
export class PokedexModule {}
