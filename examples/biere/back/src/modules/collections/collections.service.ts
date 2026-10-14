import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { COLLECTION_BEERS_MAX, COLLECTIONS_PER_USER_MAX } from "@/modules/collections/collections.constants";
import { CollectionsRepository } from "@/modules/collections/collections.repository";
import type { CollectionBeerDto, CollectionItemRecordDto } from "@/modules/collections/dtos/collection-beer.dto";
import type { CollectionDetailDto } from "@/modules/collections/dtos/collection-detail.dto";
import type { AddCollectionBeerDto } from "@/modules/collections/dtos/add-collection-beer.dto";
import type { CollectionSummaryDto } from "@/modules/collections/dtos/collection-summary.dto";
import type { MyCollectionDto } from "@/modules/collections/dtos/my-collection.dto";
import type { SaveCollectionDto } from "@/modules/collections/dtos/save-collection.dto";
import { CollectionKindEnum } from "@/modules/collections/enums/collection-kind.enum";
import { toCollectionBeerDto, toCollectionDetailDto } from "@/modules/collections/mappers/collection.mapper";
import { BeersService } from "@/modules/beers/beers.service";
import { SocialService } from "@/modules/social/social.service";
import { TastingsService } from "@/modules/tastings/tastings.service";
import { UsersService } from "@/modules/users/users.service";

@Injectable()
export class CollectionsService {
  constructor(
    private readonly collectionsRepository: CollectionsRepository,
    private readonly usersService: UsersService,
    private readonly socialService: SocialService,
    private readonly tastingsService: TastingsService,
    private readonly beersService: BeersService,
  ) {}

  async getUserCollections(currentUserId: number, userId: number): Promise<CollectionSummaryDto[]> {
    await this.usersService.getUser(userId);
    await this.ensureCanRead(currentUserId, userId);
    const wishlistBeerIds = await this.tastingsService.getWishlistBeerIds(userId);
    const collections = await this.collectionsRepository.findSummariesByUser(userId);
    return [
      { id: null, kind: CollectionKindEnum.WISHLIST, name: "", beerCount: wishlistBeerIds.length },
      ...collections,
    ];
  }

  async getCollectionDetail(currentUserId: number, userId: number, collectionId: number): Promise<CollectionDetailDto> {
    await this.usersService.getUser(userId);
    const collection = await this.getOwnedCollection(userId, collectionId);
    await this.ensureCanRead(currentUserId, userId);
    const items = await this.collectionsRepository.findItems(collectionId);
    return toCollectionDetailDto(collection, userId, await this.toCollectionBeers(currentUserId, items));
  }

  async getWishlistDetail(currentUserId: number, userId: number): Promise<CollectionDetailDto> {
    await this.usersService.getUser(userId);
    await this.ensureCanRead(currentUserId, userId);
    const items = await this.tastingsService.getWishlist(userId);
    const wishlist = { id: null, kind: CollectionKindEnum.WISHLIST, name: "", beerCount: items.length };
    return toCollectionDetailDto(wishlist, userId, await this.toCollectionBeers(currentUserId, items));
  }

  async createCollection(userId: number, dto: SaveCollectionDto): Promise<CollectionSummaryDto> {
    if ((await this.collectionsRepository.countByUser(userId)) >= COLLECTIONS_PER_USER_MAX) {
      throw new ConflictException(`You cannot have more than ${COLLECTIONS_PER_USER_MAX} collections.`);
    }
    if (await this.collectionsRepository.existsByName(userId, dto.name)) {
      throw new ConflictException(`A collection named "${dto.name}" already exists.`);
    }
    return this.collectionsRepository.create(userId, dto);
  }

  async renameCollection(userId: number, id: number, dto: SaveCollectionDto): Promise<CollectionSummaryDto> {
    await this.getOwnedCollection(userId, id);
    if (await this.collectionsRepository.existsByName(userId, dto.name, id)) {
      throw new ConflictException(`A collection named "${dto.name}" already exists.`);
    }
    return this.collectionsRepository.rename(id, dto.name);
  }

  async deleteCollection(userId: number, id: number): Promise<void> {
    await this.getOwnedCollection(userId, id);
    await this.collectionsRepository.deleteWithItems(id);
  }

  async addBeer(userId: number, collectionId: number, dto: AddCollectionBeerDto): Promise<CollectionSummaryDto> {
    const collection = await this.getOwnedCollection(userId, collectionId);
    await this.beersService.getBeer(dto.beerId);
    if (await this.collectionsRepository.existsItem(collectionId, dto.beerId)) {
      throw new ConflictException(`Beer ${dto.beerId} is already in this collection.`);
    }
    const beerCount = await this.collectionsRepository.countItems(collectionId);
    if (beerCount >= COLLECTION_BEERS_MAX) {
      throw new ConflictException(`A collection cannot hold more than ${COLLECTION_BEERS_MAX} beers.`);
    }
    await this.collectionsRepository.addItem(collectionId, dto.beerId);
    return { ...collection, beerCount: beerCount + 1 };
  }

  async removeBeer(userId: number, collectionId: number, beerId: number): Promise<void> {
    await this.getOwnedCollection(userId, collectionId);
    if (!(await this.collectionsRepository.removeItem(collectionId, beerId))) {
      throw new NotFoundException(`Beer ${beerId} is not in collection ${collectionId}.`);
    }
  }

  async getMyCollections(userId: number, beerId?: number): Promise<MyCollectionDto[]> {
    if (beerId !== undefined) {
      await this.beersService.getBeer(beerId);
    }
    const [wishlistBeerIds, collections, wishlistContainsBeer, containingIds] = await Promise.all([
      this.tastingsService.getWishlistBeerIds(userId),
      this.collectionsRepository.findSummariesByUser(userId),
      this.isInWishlist(userId, beerId),
      this.findContainingIds(userId, beerId),
    ]);
    return [
      {
        id: null,
        kind: CollectionKindEnum.WISHLIST,
        name: "",
        beerCount: wishlistBeerIds.length,
        containsBeer: wishlistContainsBeer,
      },
      ...collections.map((collection) => ({
        ...collection,
        containsBeer: collection.id !== null && containingIds.includes(collection.id),
      })),
    ];
  }

  private async ensureCanRead(currentUserId: number, userId: number): Promise<void> {
    if (currentUserId !== userId && !(await this.socialService.isFollowing(currentUserId, userId))) {
      throw new ForbiddenException("You must follow this user to see their collections.");
    }
  }

  private async toCollectionBeers(currentUserId: number, items: readonly CollectionItemRecordDto[]): Promise<CollectionBeerDto[]> {
    const beerIds = items.map((item) => item.beerId);
    const [beers, states] = await Promise.all([
      this.beersService.getBeersByIds(beerIds),
      this.tastingsService.getBeerStates(currentUserId, beerIds),
    ]);
    const drunkBeerIds = new Set(states.filter((state) => state.drunk).map((state) => state.beerId));
    return items.flatMap((item) => {
      const beer = beers.find((candidate) => candidate.id === item.beerId);
      return beer === undefined ? [] : [toCollectionBeerDto(item, beer, drunkBeerIds.has(item.beerId))];
    });
  }

  private async findContainingIds(userId: number, beerId: number | undefined): Promise<number[]> {
    if (beerId === undefined) {
      return [];
    }
    return this.collectionsRepository.findCollectionIdsContaining(userId, beerId);
  }

  private async isInWishlist(userId: number, beerId: number | undefined): Promise<boolean> {
    if (beerId === undefined) {
      return false;
    }
    const [state] = await this.tastingsService.getBeerStates(userId, [beerId]);
    return state.inWishlist;
  }

  private async getOwnedCollection(userId: number, id: number): Promise<CollectionSummaryDto> {
    const collection = await this.collectionsRepository.findOwned(userId, id);
    if (collection === null) {
      throw new NotFoundException(`Collection ${id} not found.`);
    }
    return collection;
  }
}
