import { MODULE_METADATA } from "@nestjs/common/constants";
import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";
import { DexController } from "@/modules/pokedex/dex.controller";
import { CheckinsController } from "@/modules/pokedex/checkins.controller";
import { PhotosController } from "@/modules/pokedex/photos.controller";
import { PokedexModule } from "@/modules/pokedex/pokedex.module";
import { PokedexService } from "@/modules/pokedex/pokedex.service";
import { WishlistController } from "@/modules/pokedex/wishlist.controller";
import { BeersModule } from "@/modules/beers/beers.module";
import { TastingsModule } from "@/modules/tastings/tastings.module";
import { inMemoryDatabase } from "@/__tests__/support/test-database";

describe("PokedexModule", () => {
  it("wires the controllers and the service on top of the beers and tastings modules", async () => {
    const moduleRef = await Test.createTestingModule({ imports: [inMemoryDatabase(), PokedexModule] }).compile();

    expect(moduleRef.get(CheckinsController)).toBeInstanceOf(CheckinsController);
    expect(moduleRef.get(DexController)).toBeInstanceOf(DexController);
    expect(moduleRef.get(PhotosController)).toBeInstanceOf(PhotosController);
    expect(moduleRef.get(WishlistController)).toBeInstanceOf(WishlistController);
    expect(moduleRef.get(PokedexService)).toBeInstanceOf(PokedexService);
    expect(Reflect.getMetadata(MODULE_METADATA.IMPORTS, PokedexModule)).toEqual([BeersModule, TastingsModule]);
    expect(Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, PokedexModule)).toEqual([CheckinsController, PhotosController, WishlistController, DexController]);
    expect(Reflect.getMetadata(MODULE_METADATA.PROVIDERS, PokedexModule)).toEqual([PokedexService]);

    await moduleRef.close();
  });

  it("exports nothing", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.EXPORTS, PokedexModule)).toBeUndefined();
  });
});
