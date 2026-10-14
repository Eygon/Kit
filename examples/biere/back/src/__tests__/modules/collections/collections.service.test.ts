import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { plainToInstance } from "class-transformer";
import { validate as runValidation } from "class-validator";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toCollectionBeerDto, toCollectionDetailDto } from "@/modules/collections/mappers/collection.mapper";
import { CollectionsService } from "@/modules/collections/collections.service";
import { AddCollectionBeerDto } from "@/modules/collections/dtos/add-collection-beer.dto";
import { MyCollectionsQueryDto } from "@/modules/collections/dtos/my-collections-query.dto";
import { SaveCollectionDto } from "@/modules/collections/dtos/save-collection.dto";
import { CollectionsRepository } from "@/modules/collections/collections.repository";
import { BeersService } from "@/modules/beers/beers.service";
import { SocialService } from "@/modules/social/social.service";
import { TastingsService } from "@/modules/tastings/tastings.service";
import { UsersService } from "@/modules/users/users.service";

const ALICE = 1;
const BOB = 2;
const UNKNOWN_USER = 99;
const SUMMARY = { id: 5, kind: "custom", name: "Trappistes", beerCount: 0 };

describe("CollectionsService", () => {
  const collectionsRepository = {
    countByUser: vi.fn(),
    existsByName: vi.fn(),
    create: vi.fn(),
    findSummariesByUser: vi.fn(),
    findOwned: vi.fn(),
    rename: vi.fn(),
    deleteWithItems: vi.fn(),
  };
  const usersService = { getUser: vi.fn() };
  const socialService = { isFollowing: vi.fn() };
  const tastingsService = { getWishlistBeerIds: vi.fn() };

  const buildService = async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        CollectionsService,
        { provide: CollectionsRepository, useValue: collectionsRepository },
        { provide: UsersService, useValue: usersService },
        { provide: SocialService, useValue: socialService },
        { provide: TastingsService, useValue: tastingsService },
        { provide: BeersService, useValue: {} },
      ],
    }).compile();
    return moduleRef.get(CollectionsService);
  };

  beforeEach(() => {
    vi.resetAllMocks();
    collectionsRepository.countByUser.mockResolvedValue(0);
    collectionsRepository.existsByName.mockResolvedValue(false);
    collectionsRepository.create.mockResolvedValue(SUMMARY);
    collectionsRepository.findSummariesByUser.mockResolvedValue([SUMMARY]);
    collectionsRepository.findOwned.mockResolvedValue(SUMMARY);
    collectionsRepository.rename.mockResolvedValue({ ...SUMMARY, name: "Abbayes" });
    collectionsRepository.deleteWithItems.mockResolvedValue(undefined);
    usersService.getUser.mockResolvedValue({ id: BOB });
    socialService.isFollowing.mockResolvedValue(true);
    tastingsService.getWishlistBeerIds.mockResolvedValue([10, 11]);
  });

  it("creates the collection and answers its summary", async () => {
    const service = await buildService();

    const result = await service.createCollection(ALICE, { name: "Trappistes" });

    expect(result).toEqual(SUMMARY);
    expect(collectionsRepository.existsByName).toHaveBeenCalledWith(ALICE, "Trappistes");
    expect(collectionsRepository.create).toHaveBeenCalledWith(ALICE, { name: "Trappistes" });
  });

  it("accepts the 20th collection", async () => {
    collectionsRepository.countByUser.mockResolvedValue(19);
    const service = await buildService();

    await expect(service.createCollection(ALICE, { name: "Trappistes" })).resolves.toEqual(SUMMARY);
  });

  it("answers a conflict and writes nothing when the user already has 20 collections", async () => {
    collectionsRepository.countByUser.mockResolvedValue(20);
    const service = await buildService();

    const attempt = service.createCollection(ALICE, { name: "Trappistes" });

    await expect(attempt).rejects.toBeInstanceOf(ConflictException);
    await expect(attempt).rejects.toThrow("You cannot have more than 20 collections.");
    expect(collectionsRepository.create).not.toHaveBeenCalled();
  });

  it("answers a conflict and writes nothing when the name is already taken", async () => {
    collectionsRepository.existsByName.mockResolvedValue(true);
    const service = await buildService();

    const attempt = service.createCollection(ALICE, { name: "trappistes" });

    await expect(attempt).rejects.toBeInstanceOf(ConflictException);
    await expect(attempt).rejects.toThrow('A collection named "trappistes" already exists.');
    expect(collectionsRepository.create).not.toHaveBeenCalled();
  });

  it("checks the limit before the name", async () => {
    collectionsRepository.countByUser.mockResolvedValue(20);
    collectionsRepository.existsByName.mockResolvedValue(true);
    const service = await buildService();

    await expect(service.createCollection(ALICE, { name: "Trappistes" })).rejects.toThrow(
      "You cannot have more than 20 collections.",
    );
    expect(collectionsRepository.existsByName).not.toHaveBeenCalled();
  });

  const WISHLIST = { id: null, kind: "wishlist", name: "", beerCount: 2 };

  it("lists the wishlist first with its beer count, then the collections of the user", async () => {
    const service = await buildService();

    const result = await service.getUserCollections(ALICE, BOB);

    expect(result).toEqual([WISHLIST, SUMMARY]);
    expect(usersService.getUser).toHaveBeenCalledWith(BOB);
    expect(socialService.isFollowing).toHaveBeenCalledWith(ALICE, BOB);
    expect(tastingsService.getWishlistBeerIds).toHaveBeenCalledWith(BOB);
    expect(collectionsRepository.findSummariesByUser).toHaveBeenCalledWith(BOB);
  });

  it("answers the wishlist alone with a count of 0 when the user has nothing", async () => {
    tastingsService.getWishlistBeerIds.mockResolvedValue([]);
    collectionsRepository.findSummariesByUser.mockResolvedValue([]);
    const service = await buildService();

    await expect(service.getUserCollections(ALICE, BOB)).resolves.toEqual([{ ...WISHLIST, beerCount: 0 }]);
  });

  it("lets a user read their own collections without asking the follow state", async () => {
    socialService.isFollowing.mockResolvedValue(false);
    const service = await buildService();

    await expect(service.getUserCollections(ALICE, ALICE)).resolves.toEqual([WISHLIST, SUMMARY]);
    expect(socialService.isFollowing).not.toHaveBeenCalled();
  });

  it("answers 403 and reads nothing when the reader does not follow the user", async () => {
    socialService.isFollowing.mockResolvedValue(false);
    const service = await buildService();

    const attempt = service.getUserCollections(ALICE, BOB);

    await expect(attempt).rejects.toBeInstanceOf(ForbiddenException);
    await expect(attempt).rejects.toThrow("You must follow this user to see their collections.");
    expect(tastingsService.getWishlistBeerIds).not.toHaveBeenCalled();
    expect(collectionsRepository.findSummariesByUser).not.toHaveBeenCalled();
  });

  it("answers 404 before 403 when the user is unknown and not followed", async () => {
    usersService.getUser.mockRejectedValue(new NotFoundException(`User ${UNKNOWN_USER} not found.`));
    socialService.isFollowing.mockResolvedValue(false);
    const service = await buildService();

    await expect(service.getUserCollections(ALICE, UNKNOWN_USER)).rejects.toBeInstanceOf(NotFoundException);
    expect(socialService.isFollowing).not.toHaveBeenCalled();
  });
});

describe("CollectionsService rename and delete", () => {
  const collectionsRepository = {
    existsByName: vi.fn(),
    findOwned: vi.fn(),
    rename: vi.fn(),
    deleteWithItems: vi.fn(),
  };
  const RENAMED = { ...SUMMARY, name: "Abbayes" };

  const buildService = async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        CollectionsService,
        { provide: CollectionsRepository, useValue: collectionsRepository },
        { provide: UsersService, useValue: {} },
        { provide: SocialService, useValue: {} },
        { provide: TastingsService, useValue: {} },
        { provide: BeersService, useValue: {} },
      ],
    }).compile();
    return moduleRef.get(CollectionsService);
  };

  beforeEach(() => {
    vi.resetAllMocks();
    collectionsRepository.findOwned.mockResolvedValue(SUMMARY);
    collectionsRepository.existsByName.mockResolvedValue(false);
    collectionsRepository.rename.mockResolvedValue(RENAMED);
    collectionsRepository.deleteWithItems.mockResolvedValue(undefined);
  });

  it("renames the collection and answers its summary", async () => {
    const service = await buildService();

    const result = await service.renameCollection(ALICE, SUMMARY.id, { name: "Abbayes" });

    expect(result).toEqual(RENAMED);
    expect(collectionsRepository.findOwned).toHaveBeenCalledWith(ALICE, SUMMARY.id);
    expect(collectionsRepository.existsByName).toHaveBeenCalledWith(ALICE, "Abbayes", SUMMARY.id);
    expect(collectionsRepository.rename).toHaveBeenCalledWith(SUMMARY.id, "Abbayes");
  });

  it("answers 404 and writes nothing when the collection is not owned or unknown", async () => {
    collectionsRepository.findOwned.mockResolvedValue(null);
    collectionsRepository.existsByName.mockResolvedValue(true);
    const service = await buildService();

    const attempt = service.renameCollection(ALICE, SUMMARY.id, { name: "Abbayes" });

    await expect(attempt).rejects.toBeInstanceOf(NotFoundException);
    await expect(attempt).rejects.toThrow(`Collection ${SUMMARY.id} not found.`);
    expect(collectionsRepository.existsByName).not.toHaveBeenCalled();
    expect(collectionsRepository.rename).not.toHaveBeenCalled();
  });

  it("answers a conflict and writes nothing when another collection already has the name", async () => {
    collectionsRepository.existsByName.mockResolvedValue(true);
    const service = await buildService();

    const attempt = service.renameCollection(ALICE, SUMMARY.id, { name: "abbayes" });

    await expect(attempt).rejects.toBeInstanceOf(ConflictException);
    await expect(attempt).rejects.toThrow('A collection named "abbayes" already exists.');
    expect(collectionsRepository.rename).not.toHaveBeenCalled();
  });

  it("deletes the collection with its beers", async () => {
    const service = await buildService();

    await expect(service.deleteCollection(ALICE, SUMMARY.id)).resolves.toBeUndefined();
    expect(collectionsRepository.findOwned).toHaveBeenCalledWith(ALICE, SUMMARY.id);
    expect(collectionsRepository.deleteWithItems).toHaveBeenCalledWith(SUMMARY.id);
  });

  it("answers 404 and deletes nothing when the collection is not owned or unknown", async () => {
    collectionsRepository.findOwned.mockResolvedValue(null);
    const service = await buildService();

    const attempt = service.deleteCollection(ALICE, SUMMARY.id);

    await expect(attempt).rejects.toBeInstanceOf(NotFoundException);
    await expect(attempt).rejects.toThrow(`Collection ${SUMMARY.id} not found.`);
    expect(collectionsRepository.deleteWithItems).not.toHaveBeenCalled();
  });
});

describe("CollectionsService beers", () => {
  const ORVAL = 4;
  const TRAPPISTES = { id: 5, kind: "custom", name: "Trappistes", beerCount: 3 };
  const BLONDES = { id: 6, kind: "custom", name: "Blondes", beerCount: 0 };
  const collectionsRepository = {
    findOwned: vi.fn(),
    existsItem: vi.fn(),
    countItems: vi.fn(),
    addItem: vi.fn(),
    removeItem: vi.fn(),
    findSummariesByUser: vi.fn(),
    findCollectionIdsContaining: vi.fn(),
  };
  const beersService = { getBeer: vi.fn() };
  const tastingsService = { getWishlistBeerIds: vi.fn(), getBeerStates: vi.fn() };

  const buildService = async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        CollectionsService,
        { provide: CollectionsRepository, useValue: collectionsRepository },
        { provide: UsersService, useValue: {} },
        { provide: SocialService, useValue: {} },
        { provide: TastingsService, useValue: tastingsService },
        { provide: BeersService, useValue: beersService },
      ],
    }).compile();
    return moduleRef.get(CollectionsService);
  };

  beforeEach(() => {
    vi.resetAllMocks();
    collectionsRepository.findOwned.mockResolvedValue(TRAPPISTES);
    collectionsRepository.existsItem.mockResolvedValue(false);
    collectionsRepository.countItems.mockResolvedValue(3);
    collectionsRepository.addItem.mockResolvedValue(undefined);
    collectionsRepository.removeItem.mockResolvedValue(true);
    collectionsRepository.findSummariesByUser.mockResolvedValue([TRAPPISTES, BLONDES]);
    collectionsRepository.findCollectionIdsContaining.mockResolvedValue([TRAPPISTES.id]);
    beersService.getBeer.mockResolvedValue({ id: ORVAL });
    tastingsService.getWishlistBeerIds.mockResolvedValue([ORVAL, 11]);
    tastingsService.getBeerStates.mockResolvedValue([{ beerId: ORVAL, drunk: false, checkinCount: 0, inWishlist: true }]);
  });

  it("adds the beer and answers the summary with the beer count raised by one", async () => {
    const service = await buildService();

    const result = await service.addBeer(ALICE, TRAPPISTES.id, { beerId: ORVAL });

    expect(result).toEqual({ ...TRAPPISTES, beerCount: 4 });
    expect(collectionsRepository.findOwned).toHaveBeenCalledWith(ALICE, TRAPPISTES.id);
    expect(beersService.getBeer).toHaveBeenCalledWith(ORVAL);
    expect(collectionsRepository.existsItem).toHaveBeenCalledWith(TRAPPISTES.id, ORVAL);
    expect(collectionsRepository.countItems).toHaveBeenCalledWith(TRAPPISTES.id);
    expect(collectionsRepository.addItem).toHaveBeenCalledWith(TRAPPISTES.id, ORVAL);
  });

  it("accepts the 200th beer", async () => {
    collectionsRepository.countItems.mockResolvedValue(199);
    const service = await buildService();

    await expect(service.addBeer(ALICE, TRAPPISTES.id, { beerId: ORVAL })).resolves.toEqual({
      ...TRAPPISTES,
      beerCount: 200,
    });
  });

  it("answers 404 and checks nothing else when the collection is not owned or unknown", async () => {
    collectionsRepository.findOwned.mockResolvedValue(null);
    const service = await buildService();

    const attempt = service.addBeer(ALICE, TRAPPISTES.id, { beerId: ORVAL });

    await expect(attempt).rejects.toBeInstanceOf(NotFoundException);
    await expect(attempt).rejects.toThrow(`Collection ${TRAPPISTES.id} not found.`);
    expect(beersService.getBeer).not.toHaveBeenCalled();
    expect(collectionsRepository.addItem).not.toHaveBeenCalled();
  });

  it("answers 404 and writes nothing when the beer is unknown, even if the collection is full", async () => {
    beersService.getBeer.mockRejectedValue(new NotFoundException(`Beer ${ORVAL} not found.`));
    collectionsRepository.countItems.mockResolvedValue(200);
    collectionsRepository.existsItem.mockResolvedValue(true);
    const service = await buildService();

    const attempt = service.addBeer(ALICE, TRAPPISTES.id, { beerId: ORVAL });

    await expect(attempt).rejects.toBeInstanceOf(NotFoundException);
    await expect(attempt).rejects.toThrow(`Beer ${ORVAL} not found.`);
    expect(collectionsRepository.existsItem).not.toHaveBeenCalled();
    expect(collectionsRepository.addItem).not.toHaveBeenCalled();
  });

  it("answers a conflict and writes nothing when the beer is already in the collection", async () => {
    collectionsRepository.existsItem.mockResolvedValue(true);
    const service = await buildService();

    const attempt = service.addBeer(ALICE, TRAPPISTES.id, { beerId: ORVAL });

    await expect(attempt).rejects.toBeInstanceOf(ConflictException);
    await expect(attempt).rejects.toThrow(`Beer ${ORVAL} is already in this collection.`);
    expect(collectionsRepository.addItem).not.toHaveBeenCalled();
  });

  it("answers a conflict and writes nothing when the collection already holds 200 beers", async () => {
    collectionsRepository.countItems.mockResolvedValue(200);
    const service = await buildService();

    const attempt = service.addBeer(ALICE, TRAPPISTES.id, { beerId: ORVAL });

    await expect(attempt).rejects.toBeInstanceOf(ConflictException);
    await expect(attempt).rejects.toThrow("A collection cannot hold more than 200 beers.");
    expect(collectionsRepository.addItem).not.toHaveBeenCalled();
  });

  it("checks the presence before the size", async () => {
    collectionsRepository.existsItem.mockResolvedValue(true);
    collectionsRepository.countItems.mockResolvedValue(200);
    const service = await buildService();

    await expect(service.addBeer(ALICE, TRAPPISTES.id, { beerId: ORVAL })).rejects.toThrow(
      `Beer ${ORVAL} is already in this collection.`,
    );
    expect(collectionsRepository.countItems).not.toHaveBeenCalled();
  });

  it("removes the beer from the collection", async () => {
    const service = await buildService();

    await expect(service.removeBeer(ALICE, TRAPPISTES.id, ORVAL)).resolves.toBeUndefined();
    expect(collectionsRepository.findOwned).toHaveBeenCalledWith(ALICE, TRAPPISTES.id);
    expect(collectionsRepository.removeItem).toHaveBeenCalledWith(TRAPPISTES.id, ORVAL);
  });

  it("answers 404 and removes nothing when the collection is not owned or unknown", async () => {
    collectionsRepository.findOwned.mockResolvedValue(null);
    const service = await buildService();

    const attempt = service.removeBeer(ALICE, TRAPPISTES.id, ORVAL);

    await expect(attempt).rejects.toBeInstanceOf(NotFoundException);
    await expect(attempt).rejects.toThrow(`Collection ${TRAPPISTES.id} not found.`);
    expect(collectionsRepository.removeItem).not.toHaveBeenCalled();
  });

  it("answers 404 when the beer is not in the collection", async () => {
    collectionsRepository.removeItem.mockResolvedValue(false);
    const service = await buildService();

    const attempt = service.removeBeer(ALICE, TRAPPISTES.id, ORVAL);

    await expect(attempt).rejects.toBeInstanceOf(NotFoundException);
    await expect(attempt).rejects.toThrow(`Beer ${ORVAL} is not in collection ${TRAPPISTES.id}.`);
  });

  it("checks the wishlist and the collections holding the beer when a beer is asked", async () => {
    const service = await buildService();

    const result = await service.getMyCollections(ALICE, ORVAL);

    expect(result).toEqual([
      { id: null, kind: "wishlist", name: "", beerCount: 2, containsBeer: true },
      { ...TRAPPISTES, containsBeer: true },
      { ...BLONDES, containsBeer: false },
    ]);
    expect(beersService.getBeer).toHaveBeenCalledWith(ORVAL);
    expect(tastingsService.getBeerStates).toHaveBeenCalledWith(ALICE, [ORVAL]);
    expect(collectionsRepository.findCollectionIdsContaining).toHaveBeenCalledWith(ALICE, ORVAL);
    expect(collectionsRepository.findSummariesByUser).toHaveBeenCalledWith(ALICE);
  });

  it("leaves the wishlist unchecked when the beer is not wished", async () => {
    tastingsService.getBeerStates.mockResolvedValue([{ beerId: ORVAL, drunk: true, checkinCount: 1, inWishlist: false }]);
    collectionsRepository.findCollectionIdsContaining.mockResolvedValue([BLONDES.id]);
    const service = await buildService();

    const result = await service.getMyCollections(ALICE, ORVAL);

    expect(result.map((collection) => collection.containsBeer)).toEqual([false, false, true]);
  });

  it("leaves everything unchecked and asks nothing about a beer when none is asked", async () => {
    const service = await buildService();

    const result = await service.getMyCollections(ALICE);

    expect(result).toEqual([
      { id: null, kind: "wishlist", name: "", beerCount: 2, containsBeer: false },
      { ...TRAPPISTES, containsBeer: false },
      { ...BLONDES, containsBeer: false },
    ]);
    expect(beersService.getBeer).not.toHaveBeenCalled();
    expect(tastingsService.getBeerStates).not.toHaveBeenCalled();
    expect(collectionsRepository.findCollectionIdsContaining).not.toHaveBeenCalled();
  });

  it("answers 404 and reads no collection when the asked beer is unknown", async () => {
    beersService.getBeer.mockRejectedValue(new NotFoundException(`Beer ${ORVAL} not found.`));
    const service = await buildService();

    await expect(service.getMyCollections(ALICE, ORVAL)).rejects.toBeInstanceOf(NotFoundException);
    expect(collectionsRepository.findSummariesByUser).not.toHaveBeenCalled();
  });
});

describe("CollectionsService detail", () => {
  const ORVAL = 4;
  const DUVEL = 5;
  const UNKNOWN_BEER = 999;
  const ORVAL_ADDED_AT = "2026-02-01T10:00:00.000Z";
  const DUVEL_ADDED_AT = "2026-03-01T10:00:00.000Z";
  const TRAPPISTES = { id: 5, kind: "custom", name: "Trappistes", beerCount: 2 };
  const ITEMS = [
    { beerId: DUVEL, addedAt: DUVEL_ADDED_AT },
    { beerId: ORVAL, addedAt: ORVAL_ADDED_AT },
  ];
  const BEERS = [
    { id: ORVAL, name: "Orval", styleName: "Trappiste", family: "ale", breweryName: "Orval" },
    { id: DUVEL, name: "Duvel", styleName: "Blonde forte", family: "ale", breweryName: "Moortgat" },
  ];
  const DETAIL_BEERS = [
    { beerId: DUVEL, beerName: "Duvel", styleName: "Blonde forte", family: "ale", drunkByMe: false, addedAt: DUVEL_ADDED_AT },
    { beerId: ORVAL, beerName: "Orval", styleName: "Trappiste", family: "ale", drunkByMe: true, addedAt: ORVAL_ADDED_AT },
  ];
  const collectionsRepository = { findOwned: vi.fn(), findItems: vi.fn() };
  const usersService = { getUser: vi.fn() };
  const socialService = { isFollowing: vi.fn() };
  const tastingsService = { getWishlist: vi.fn(), getBeerStates: vi.fn() };
  const beersService = { getBeersByIds: vi.fn() };

  const buildService = async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        CollectionsService,
        { provide: CollectionsRepository, useValue: collectionsRepository },
        { provide: UsersService, useValue: usersService },
        { provide: SocialService, useValue: socialService },
        { provide: TastingsService, useValue: tastingsService },
        { provide: BeersService, useValue: beersService },
      ],
    }).compile();
    return moduleRef.get(CollectionsService);
  };

  beforeEach(() => {
    vi.resetAllMocks();
    usersService.getUser.mockResolvedValue({ id: BOB });
    socialService.isFollowing.mockResolvedValue(true);
    collectionsRepository.findOwned.mockResolvedValue(TRAPPISTES);
    collectionsRepository.findItems.mockResolvedValue(ITEMS);
    tastingsService.getWishlist.mockResolvedValue(ITEMS);
    tastingsService.getBeerStates.mockResolvedValue([
      { beerId: ORVAL, drunk: true, checkinCount: 2, inWishlist: false },
      { beerId: DUVEL, drunk: false, checkinCount: 0, inWishlist: false },
    ]);
    beersService.getBeersByIds.mockResolvedValue(BEERS);
  });

  it("reads the beers of the collection of Bob in the order of the items, drunk by the reader", async () => {
    const service = await buildService();

    const result = await service.getCollectionDetail(ALICE, BOB, TRAPPISTES.id);

    expect(result).toEqual({ id: TRAPPISTES.id, kind: "custom", name: "Trappistes", ownerId: BOB, beers: DETAIL_BEERS });
    expect(collectionsRepository.findOwned).toHaveBeenCalledWith(BOB, TRAPPISTES.id);
    expect(collectionsRepository.findItems).toHaveBeenCalledWith(TRAPPISTES.id);
    expect(beersService.getBeersByIds).toHaveBeenCalledWith([DUVEL, ORVAL]);
    expect(tastingsService.getBeerStates).toHaveBeenCalledWith(ALICE, [DUVEL, ORVAL]);
  });

  it("lets a user read their own collection without asking the follow state", async () => {
    socialService.isFollowing.mockResolvedValue(false);
    usersService.getUser.mockResolvedValue({ id: ALICE });
    const service = await buildService();

    const result = await service.getCollectionDetail(ALICE, ALICE, TRAPPISTES.id);

    expect(result.ownerId).toBe(ALICE);
    expect(socialService.isFollowing).not.toHaveBeenCalled();
  });

  it("answers 404 and reads nothing else when the user is unknown", async () => {
    usersService.getUser.mockRejectedValue(new NotFoundException("User 99 not found."));
    socialService.isFollowing.mockResolvedValue(false);
    const service = await buildService();

    await expect(service.getCollectionDetail(ALICE, UNKNOWN_USER, TRAPPISTES.id)).rejects.toBeInstanceOf(NotFoundException);
    expect(collectionsRepository.findOwned).not.toHaveBeenCalled();
  });

  it("answers 404 before 403 when the collection is not his, even if the reader does not follow him", async () => {
    collectionsRepository.findOwned.mockResolvedValue(null);
    socialService.isFollowing.mockResolvedValue(false);
    const service = await buildService();

    const attempt = service.getCollectionDetail(ALICE, BOB, TRAPPISTES.id);

    await expect(attempt).rejects.toBeInstanceOf(NotFoundException);
    await expect(attempt).rejects.toThrow("Collection 5 not found.");
    expect(socialService.isFollowing).not.toHaveBeenCalled();
  });

  it("answers 403 and reads no beer when the reader does not follow the owner", async () => {
    socialService.isFollowing.mockResolvedValue(false);
    const service = await buildService();

    const attempt = service.getCollectionDetail(ALICE, BOB, TRAPPISTES.id);

    await expect(attempt).rejects.toBeInstanceOf(ForbiddenException);
    await expect(attempt).rejects.toThrow("You must follow this user to see their collections.");
    expect(collectionsRepository.findItems).not.toHaveBeenCalled();
    expect(tastingsService.getBeerStates).not.toHaveBeenCalled();
  });

  it("answers an empty list for an empty collection", async () => {
    collectionsRepository.findItems.mockResolvedValue([]);
    beersService.getBeersByIds.mockResolvedValue([]);
    tastingsService.getBeerStates.mockResolvedValue([]);
    const service = await buildService();

    const result = await service.getCollectionDetail(ALICE, BOB, TRAPPISTES.id);

    expect(result.beers).toEqual([]);
  });

  it("leaves out an item whose beer is no longer in the catalog", async () => {
    collectionsRepository.findItems.mockResolvedValue([{ beerId: UNKNOWN_BEER, addedAt: DUVEL_ADDED_AT }, ...ITEMS]);
    const service = await buildService();

    const result = await service.getCollectionDetail(ALICE, BOB, TRAPPISTES.id);

    expect(result.beers).toEqual(DETAIL_BEERS);
  });

  it("reads the wishlist of Bob as a collection with a null id, drunk by the reader", async () => {
    const service = await buildService();

    const result = await service.getWishlistDetail(ALICE, BOB);

    expect(result).toEqual({ id: null, kind: "wishlist", name: "", ownerId: BOB, beers: DETAIL_BEERS });
    expect(tastingsService.getWishlist).toHaveBeenCalledWith(BOB);
    expect(tastingsService.getBeerStates).toHaveBeenCalledWith(ALICE, [DUVEL, ORVAL]);
  });

  it("lets a user read their own wishlist without asking the follow state", async () => {
    socialService.isFollowing.mockResolvedValue(false);
    const service = await buildService();

    const result = await service.getWishlistDetail(ALICE, ALICE);

    expect(result.ownerId).toBe(ALICE);
    expect(socialService.isFollowing).not.toHaveBeenCalled();
  });

  it("answers 404 for the wishlist of an unknown user before 403", async () => {
    usersService.getUser.mockRejectedValue(new NotFoundException("User 99 not found."));
    socialService.isFollowing.mockResolvedValue(false);
    const service = await buildService();

    await expect(service.getWishlistDetail(ALICE, UNKNOWN_USER)).rejects.toBeInstanceOf(NotFoundException);
    expect(socialService.isFollowing).not.toHaveBeenCalled();
  });

  it("answers 403 for the wishlist when the reader does not follow the owner", async () => {
    socialService.isFollowing.mockResolvedValue(false);
    const service = await buildService();

    await expect(service.getWishlistDetail(ALICE, BOB)).rejects.toBeInstanceOf(ForbiddenException);
    expect(tastingsService.getWishlist).not.toHaveBeenCalled();
  });
});

describe("collection detail mappers", () => {
  const beer = { id: 4, name: "Orval", styleName: "Trappiste", family: "ale", breweryName: "Orval" };

  it("maps an item, its beer and the drunk flag to a collection beer", async () => {
    const result = toCollectionBeerDto({ beerId: 4, addedAt: "2026-02-01T10:00:00.000Z" }, beer as never, true);

    expect(result).toEqual({
      beerId: 4,
      beerName: "Orval",
      styleName: "Trappiste",
      family: "ale",
      drunkByMe: true,
      addedAt: "2026-02-01T10:00:00.000Z",
    });
  });

  it("maps a summary, its owner and its beers to a collection detail", async () => {
    const summary = { id: null, kind: "wishlist", name: "", beerCount: 0 };

    expect(toCollectionDetailDto(summary as never, 2, [])).toEqual({
      id: null,
      kind: "wishlist",
      name: "",
      ownerId: 2,
      beers: [],
    });
  });
});

describe("MyCollectionsQueryDto and AddCollectionBeerDto", () => {
  const validate = async <T extends object>(type: new () => T, payload: object) => {
    const instance = plainToInstance(type, payload);
    return { instance, errors: await runValidation(instance, { whitelist: true, forbidNonWhitelisted: true }) };
  };

  it.each([
    ["no beer", {}],
    ["a beer given as a query string", { beerId: "4" }],
  ])("accepts a query with %s", async (_label, payload) => {
    const { errors } = await validate(MyCollectionsQueryDto, payload);

    expect(errors).toEqual([]);
  });

  it("converts the beer of the query to a number", async () => {
    const { instance } = await validate(MyCollectionsQueryDto, { beerId: "4" });

    expect(instance.beerId).toBe(4);
  });

  it.each([
    ["zero", { beerId: "0" }],
    ["a negative id", { beerId: "-1" }],
    ["a decimal", { beerId: "1.5" }],
    ["text", { beerId: "abc" }],
    ["an unknown field", { beerId: "4", extra: 1 }],
  ])("rejects a query with %s", async (_label, payload) => {
    const { errors } = await validate(MyCollectionsQueryDto, payload);

    expect(errors).toHaveLength(1);
  });

  it.each([
    ["a beer of 1", { beerId: 1 }],
    ["a beer of 4", { beerId: 4 }],
  ])("accepts a body with %s", async (_label, payload) => {
    const { errors } = await validate(AddCollectionBeerDto, payload);

    expect(errors).toEqual([]);
  });

  it.each([
    ["no beer", {}],
    ["zero", { beerId: 0 }],
    ["a negative id", { beerId: -1 }],
    ["a decimal", { beerId: 1.5 }],
    ["text", { beerId: "4" }],
    ["an unknown field", { beerId: 4, extra: 1 }],
  ])("rejects a body with %s", async (_label, payload) => {
    const { errors } = await validate(AddCollectionBeerDto, payload);

    expect(errors).toHaveLength(1);
  });
});

describe("SaveCollectionDto", () => {
  const validate = async (payload: object) => {
    const instance = plainToInstance(SaveCollectionDto, payload);
    return { instance, errors: await runValidation(instance, { whitelist: true, forbidNonWhitelisted: true }) };
  };

  it("trims the name", async () => {
    const { instance, errors } = await validate({ name: "  Trappistes  " });

    expect(errors).toEqual([]);
    expect(instance.name).toBe("Trappistes");
  });

  it.each([
    ["an empty name", ""],
    ["a blank name", "   "],
    ["a name of 41 characters", "a".repeat(41)],
    ["a name of 41 characters between spaces", ` ${"a".repeat(41)} `],
    ["a number", 12],
  ])("rejects %s", async (_label, name) => {
    const { errors } = await validate({ name });

    expect(errors).toHaveLength(1);
  });

  it.each([
    ["a name of 1 character", "a"],
    ["a name of 40 characters", "a".repeat(40)],
    ["a name of 40 characters between spaces", ` ${"a".repeat(40)} `],
  ])("accepts %s", async (_label, name) => {
    const { errors } = await validate({ name });

    expect(errors).toEqual([]);
  });
});
