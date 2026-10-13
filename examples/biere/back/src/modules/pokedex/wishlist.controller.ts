import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post } from "@nestjs/common";
import { CurrentUserId } from "@/common/security/current-user-id.decorator";
import { AddWishlistItemDto } from "@/modules/pokedex/dtos/add-wishlist-item.dto";
import type { WishlistItemDto } from "@/modules/pokedex/dtos/wishlist-item.dto";
import { PokedexService } from "@/modules/pokedex/pokedex.service";

@Controller("me/wishlist")
export class WishlistController {
  constructor(private readonly pokedexService: PokedexService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  getAll(@CurrentUserId() userId: number): Promise<WishlistItemDto[]> {
    return this.pokedexService.getWishlist(userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  add(@CurrentUserId() userId: number, @Body() dto: AddWishlistItemDto): Promise<WishlistItemDto> {
    return this.pokedexService.addToWishlist(userId, dto);
  }

  @Delete(":beerId")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUserId() userId: number, @Param("beerId", ParseIntPipe) beerId: number): Promise<void> {
    return this.pokedexService.removeFromWishlist(userId, beerId);
  }
}
