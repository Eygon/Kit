import { Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe } from "@nestjs/common";
import { CurrentUserId } from "@/common/security/current-user-id.decorator";
import { CollectionsService } from "@/modules/collections/collections.service";
import type { CollectionDetailDto } from "@/modules/collections/dtos/collection-detail.dto";
import type { CollectionSummaryDto } from "@/modules/collections/dtos/collection-summary.dto";

@Controller("users/:userId")
export class UserCollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Get("collections")
  @HttpCode(HttpStatus.OK)
  getCollections(
    @CurrentUserId() currentUserId: number,
    @Param("userId", ParseIntPipe) userId: number,
  ): Promise<CollectionSummaryDto[]> {
    return this.collectionsService.getUserCollections(currentUserId, userId);
  }

  @Get("collections/:collectionId")
  @HttpCode(HttpStatus.OK)
  getCollection(
    @CurrentUserId() currentUserId: number,
    @Param("userId", ParseIntPipe) userId: number,
    @Param("collectionId", ParseIntPipe) collectionId: number,
  ): Promise<CollectionDetailDto> {
    return this.collectionsService.getCollectionDetail(currentUserId, userId, collectionId);
  }

  @Get("wishlist")
  @HttpCode(HttpStatus.OK)
  getWishlist(
    @CurrentUserId() currentUserId: number,
    @Param("userId", ParseIntPipe) userId: number,
  ): Promise<CollectionDetailDto> {
    return this.collectionsService.getWishlistDetail(currentUserId, userId);
  }
}
