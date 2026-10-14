import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { CurrentUserId } from "@/common/security/current-user-id.decorator";
import { CollectionsService } from "@/modules/collections/collections.service";
import { AddCollectionBeerDto } from "@/modules/collections/dtos/add-collection-beer.dto";
import type { CollectionSummaryDto } from "@/modules/collections/dtos/collection-summary.dto";
import type { MyCollectionDto } from "@/modules/collections/dtos/my-collection.dto";
import { MyCollectionsQueryDto } from "@/modules/collections/dtos/my-collections-query.dto";
import { SaveCollectionDto } from "@/modules/collections/dtos/save-collection.dto";

@Controller("me/collections")
export class MyCollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  list(@CurrentUserId() userId: number, @Query() query: MyCollectionsQueryDto): Promise<MyCollectionDto[]> {
    return this.collectionsService.getMyCollections(userId, query.beerId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUserId() userId: number, @Body() dto: SaveCollectionDto): Promise<CollectionSummaryDto> {
    return this.collectionsService.createCollection(userId, dto);
  }

  @Patch(":collectionId")
  @HttpCode(HttpStatus.OK)
  rename(
    @CurrentUserId() userId: number,
    @Param("collectionId", ParseIntPipe) collectionId: number,
    @Body() dto: SaveCollectionDto,
  ): Promise<CollectionSummaryDto> {
    return this.collectionsService.renameCollection(userId, collectionId, dto);
  }

  @Delete(":collectionId")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUserId() userId: number, @Param("collectionId", ParseIntPipe) collectionId: number): Promise<void> {
    return this.collectionsService.deleteCollection(userId, collectionId);
  }

  @Post(":collectionId/beers")
  @HttpCode(HttpStatus.CREATED)
  addBeer(
    @CurrentUserId() userId: number,
    @Param("collectionId", ParseIntPipe) collectionId: number,
    @Body() dto: AddCollectionBeerDto,
  ): Promise<CollectionSummaryDto> {
    return this.collectionsService.addBeer(userId, collectionId, dto);
  }

  @Delete(":collectionId/beers/:beerId")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeBeer(
    @CurrentUserId() userId: number,
    @Param("collectionId", ParseIntPipe) collectionId: number,
    @Param("beerId", ParseIntPipe) beerId: number,
  ): Promise<void> {
    return this.collectionsService.removeBeer(userId, collectionId, beerId);
  }
}
