import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BeerFormatEnum } from "@/modules/beers/enums/beer-format.enum";
import { PhotoContentTypeEnum } from "@/modules/tastings/enums/photo-content-type.enum";
import type { CheckinRecordDto } from "@/modules/tastings/dtos/checkin-record.dto";
import type { PhotoContentDto } from "@/modules/tastings/dtos/photo-content.dto";
import type { Checkin } from "@/modules/tastings/entities/checkin.entity";
import { TastingsRepository } from "@/modules/tastings/tastings.repository";
import { TastingsService } from "@/modules/tastings/tastings.service";

const ALICE = 1;
const BOB = 2;
const BEER = 10;
const WISHLIST_RECORDS = [
  { beerId: 12, addedAt: "2026-03-15T10:00:00.000Z" },
  { beerId: 10, addedAt: "2026-03-14T10:00:00.000Z" },
];
const PHOTO_ID = "3f2b8c1e-5d4a-4e6b-9a7c-1d2e3f4a5b6c";

const BOB_CHECKIN: CheckinRecordDto = {
  id: 5,
  userId: BOB,
  beerId: BEER,
  drankAt: "2026-03-14T18:30:00.000Z",
  place: "Chez Bob",
  rating: null,
  aromas: [],
  format: BeerFormatEnum.CAN,
  price: null,
  comment: "",
  photoId: null,
};

describe("TastingsService", () => {
  const repository = { createCheckin: vi.fn(), createCheckinWithPhoto: vi.fn(), findCheckinById: vi.fn(), countCheckins: vi.fn(), findPhoto: vi.fn(), findCheckinPage: vi.fn(), deleteCheckinWithPhoto: vi.fn(), findWishlist: vi.fn(), existsWishlistItem: vi.fn(), addWishlistItem: vi.fn(), removeWishlistItem: vi.fn(), findDiscoveries: vi.fn(), findCheckinsByUser: vi.fn(), findCheckinsByUsers: vi.fn(), findBeerStates: vi.fn(), findDrunkBeerIds: vi.fn(), findWishlistBeerIds: vi.fn(), countDiscoveredBeersByUsers: vi.fn() };
  let service: TastingsService;

  beforeEach(async () => {
    vi.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [TastingsService, { provide: TastingsRepository, useValue: repository }],
    }).compile();
    service = moduleRef.get(TastingsService);
  });

  it("creates a check-in through the repository and returns the record", async () => {
    const data: Omit<Checkin, "id" | "createdAt"> = {
      userId: BOB,
      beerId: BEER,
      drankAt: new Date(BOB_CHECKIN.drankAt),
      place: "Chez Bob",
      rating: null,
      aromas: [],
      format: BeerFormatEnum.CAN,
      price: null,
      comment: "",
      photoId: null,
    };
    repository.createCheckin.mockResolvedValue(BOB_CHECKIN);

    const created = await service.createCheckin(data);

    expect(created).toBe(BOB_CHECKIN);
    expect(repository.createCheckin).toHaveBeenCalledExactlyOnceWith(data);
  });

  it("creates a check-in with its photo through the repository and returns the record", async () => {
    const data: Omit<Checkin, "id" | "createdAt"> = {
      userId: BOB,
      beerId: BEER,
      drankAt: new Date(BOB_CHECKIN.drankAt),
      place: "Chez Bob",
      rating: null,
      aromas: [],
      format: BeerFormatEnum.CAN,
      price: null,
      comment: "",
      photoId: null,
    };
    const photo = { contentType: PhotoContentTypeEnum.PNG, content: Buffer.from([0x89, 0x50]) };
    const record: CheckinRecordDto = { ...BOB_CHECKIN, photoId: "3f2b8c1e-5d4a-4e6b-9a7c-1d2e3f4a5b6c" };
    repository.createCheckinWithPhoto.mockResolvedValue(record);

    const created = await service.createCheckinWithPhoto(data, photo);

    expect(created).toBe(record);
    expect(repository.createCheckinWithPhoto).toHaveBeenCalledExactlyOnceWith(data, photo);
    expect(repository.createCheckin).not.toHaveBeenCalled();
  });

  it("says it is the first check-in when the user has none for the beer", async () => {
    repository.countCheckins.mockResolvedValue(0);

    expect(await service.isFirstCheckin(ALICE, BEER)).toBe(true);
    expect(repository.countCheckins).toHaveBeenCalledWith(ALICE, BEER);
  });

  it("says it is not the first check-in when the user already has one", async () => {
    repository.countCheckins.mockResolvedValue(1);

    expect(await service.isFirstCheckin(ALICE, BEER)).toBe(false);
  });

  it("returns a check-in owned by the user", async () => {
    repository.findCheckinById.mockResolvedValue(BOB_CHECKIN);

    expect(await service.getOwnedCheckin(BOB, BOB_CHECKIN.id)).toBe(BOB_CHECKIN);
  });

  it("throws 404 for an unknown check-in id and writes nothing", async () => {
    repository.findCheckinById.mockResolvedValue(null);

    await expect(service.getOwnedCheckin(ALICE, 99)).rejects.toThrow(new NotFoundException("Check-in 99 not found."));
    expect(repository.createCheckin).not.toHaveBeenCalled();
  });

  it("throws 403 when the check-in belongs to another user and writes nothing", async () => {
    repository.findCheckinById.mockResolvedValue(BOB_CHECKIN);

    await expect(service.getOwnedCheckin(ALICE, BOB_CHECKIN.id)).rejects.toThrow(
      new ForbiddenException("You can only access your own check-ins."),
    );
    expect(repository.createCheckin).not.toHaveBeenCalled();
  });

  it("returns the content of a stored photo from the repository", async () => {
    const photo: PhotoContentDto = { contentType: PhotoContentTypeEnum.PNG, content: Buffer.from([0x89, 0x50]) };
    repository.findPhoto.mockResolvedValue(photo);

    await expect(service.getPhoto(PHOTO_ID)).resolves.toBe(photo);
    expect(repository.findPhoto).toHaveBeenCalledExactlyOnceWith(PHOTO_ID);
  });

  it("throws NotFoundException naming the photo when the repository finds none", async () => {
    repository.findPhoto.mockResolvedValue(null);

    const failure = service.getPhoto(PHOTO_ID);

    await expect(failure).rejects.toBeInstanceOf(NotFoundException);
    await expect(failure).rejects.toThrow(`Photo ${PHOTO_ID} not found.`);
  });

  describe("getCheckinPage", () => {
    it("returns the slice the repository builds for the user, the beer and the page", async () => {
      const slice = { items: [BOB_CHECKIN], total: 1 };
      repository.findCheckinPage.mockResolvedValue(slice);

      await expect(service.getCheckinPage(BOB, BEER, 2, 20)).resolves.toBe(slice);
      expect(repository.findCheckinPage).toHaveBeenCalledExactlyOnceWith(BOB, BEER, 2, 20);
    });

    it("passes an undefined beer filter through", async () => {
      repository.findCheckinPage.mockResolvedValue({ items: [], total: 0 });

      await service.getCheckinPage(BOB, undefined, 1, 20);

      expect(repository.findCheckinPage).toHaveBeenCalledExactlyOnceWith(BOB, undefined, 1, 20);
    });
  });

  describe("deleteOwnedCheckin", () => {
    it("deletes the owned check-in with its photo id", async () => {
      const withPhoto: CheckinRecordDto = { ...BOB_CHECKIN, photoId: PHOTO_ID };
      repository.findCheckinById.mockResolvedValue(withPhoto);

      await service.deleteOwnedCheckin(BOB, withPhoto.id);

      expect(repository.deleteCheckinWithPhoto).toHaveBeenCalledExactlyOnceWith(withPhoto.id, PHOTO_ID);
    });

    it("deletes an owned check-in without a photo with a null photo id", async () => {
      repository.findCheckinById.mockResolvedValue(BOB_CHECKIN);

      await service.deleteOwnedCheckin(BOB, BOB_CHECKIN.id);

      expect(repository.deleteCheckinWithPhoto).toHaveBeenCalledExactlyOnceWith(BOB_CHECKIN.id, null);
    });

    it("throws 403 for another user's check-in and deletes nothing", async () => {
      repository.findCheckinById.mockResolvedValue(BOB_CHECKIN);

      await expect(service.deleteOwnedCheckin(ALICE, BOB_CHECKIN.id)).rejects.toThrow(
        new ForbiddenException("You can only access your own check-ins."),
      );
      expect(repository.deleteCheckinWithPhoto).not.toHaveBeenCalled();
    });

    it("throws 404 for an unknown check-in and deletes nothing", async () => {
      repository.findCheckinById.mockResolvedValue(null);

      await expect(service.deleteOwnedCheckin(ALICE, 99)).rejects.toThrow(new NotFoundException("Check-in 99 not found."));
      expect(repository.deleteCheckinWithPhoto).not.toHaveBeenCalled();
    });
  });

  describe("getWishlist", () => {
    it("returns the records of the repository in its order", async () => {
      repository.findWishlist.mockResolvedValue(WISHLIST_RECORDS);

      await expect(service.getWishlist(ALICE)).resolves.toStrictEqual(WISHLIST_RECORDS);
      expect(repository.findWishlist).toHaveBeenCalledExactlyOnceWith(ALICE);
    });
  });

  describe("addToWishlist", () => {
    it("adds a beer that is not yet in the wishlist and returns the record", async () => {
      repository.existsWishlistItem.mockResolvedValue(false);
      repository.addWishlistItem.mockResolvedValue(WISHLIST_RECORDS[0]);

      await expect(service.addToWishlist(ALICE, BEER)).resolves.toBe(WISHLIST_RECORDS[0]);
      expect(repository.existsWishlistItem).toHaveBeenCalledExactlyOnceWith(ALICE, BEER);
      expect(repository.addWishlistItem).toHaveBeenCalledExactlyOnceWith(ALICE, BEER);
    });

    it("throws 409 before any write when the beer is already in the wishlist", async () => {
      repository.existsWishlistItem.mockResolvedValue(true);

      await expect(service.addToWishlist(ALICE, BEER)).rejects.toThrow(
        new ConflictException(`Beer ${BEER} is already in the wishlist.`),
      );
      expect(repository.addWishlistItem).not.toHaveBeenCalled();
    });
  });

  describe("removeFromWishlist", () => {
    it("removes the beer from the wishlist of the user", async () => {
      repository.removeWishlistItem.mockResolvedValue(true);

      await expect(service.removeFromWishlist(ALICE, BEER)).resolves.toBeUndefined();
      expect(repository.removeWishlistItem).toHaveBeenCalledExactlyOnceWith(ALICE, BEER);
    });

    it("throws 404 when no row was deleted", async () => {
      repository.removeWishlistItem.mockResolvedValue(false);

      await expect(service.removeFromWishlist(ALICE, BEER)).rejects.toThrow(
        new NotFoundException(`Beer ${BEER} is not in the wishlist.`),
      );
    });
  });

  describe("getUserCheckins", () => {
    it("returns the check-ins the repository finds for the user", async () => {
      const records = [BOB_CHECKIN];
      repository.findCheckinsByUser.mockResolvedValue(records);

      expect(await service.getUserCheckins(ALICE)).toBe(records);
      expect(repository.findCheckinsByUser).toHaveBeenCalledExactlyOnceWith(ALICE);
    });
  });

  describe("getCheckinsByUsers", () => {
    it("returns the check-ins the repository finds for the users", async () => {
      const records = [BOB_CHECKIN];
      repository.findCheckinsByUsers.mockResolvedValue(records);

      expect(await service.getCheckinsByUsers([BOB, ALICE])).toBe(records);
      expect(repository.findCheckinsByUsers).toHaveBeenCalledExactlyOnceWith([BOB, ALICE]);
    });
  });

  describe("getDiscoveries", () => {
    it("returns the discoveries the repository finds for the user", async () => {
      const discoveries = [{ beerId: BEER, firstCheckinAt: "2025-10-01T18:00:00.000Z", lastCheckinAt: "2025-10-10T18:00:00.000Z" }];
      repository.findDiscoveries.mockResolvedValue(discoveries);

      expect(await service.getDiscoveries(ALICE)).toBe(discoveries);
      expect(repository.findDiscoveries).toHaveBeenCalledExactlyOnceWith(ALICE);
    });
  });
  describe("beer states", () => {
    it("returns the states the repository builds for the user and the beers", async () => {
      const states = [{ beerId: BEER, drunk: true, checkinCount: 2, inWishlist: false }];
      repository.findBeerStates.mockResolvedValue(states);

      expect(await service.getBeerStates(ALICE, [BEER, 11])).toBe(states);
      expect(repository.findBeerStates).toHaveBeenCalledExactlyOnceWith(ALICE, [BEER, 11]);
    });

    it("returns the ids of the beers the user drank", async () => {
      const ids = [BEER, 12];
      repository.findDrunkBeerIds.mockResolvedValue(ids);

      expect(await service.getDrunkBeerIds(ALICE)).toBe(ids);
      expect(repository.findDrunkBeerIds).toHaveBeenCalledExactlyOnceWith(ALICE);
    });

    it("returns the ids of the beers in the wishlist of the user", async () => {
      const ids = [11];
      repository.findWishlistBeerIds.mockResolvedValue(ids);

      expect(await service.getWishlistBeerIds(ALICE)).toBe(ids);
      expect(repository.findWishlistBeerIds).toHaveBeenCalledExactlyOnceWith(ALICE);
    });
  });

  describe("discovered counts", () => {
    it("maps each user id to its discovered count and leaves out a user without tasting", async () => {
      repository.countDiscoveredBeersByUsers.mockResolvedValue([
        { userId: BOB, discoveredCount: 4 },
        { userId: 3, discoveredCount: 1 },
      ]);

      const counts = await service.getDiscoveredCounts([ALICE, BOB, 3]);

      expect(counts).toEqual(
        new Map([
          [BOB, 4],
          [3, 1],
        ]),
      );
      expect(counts.has(ALICE)).toBe(false);
      expect(repository.countDiscoveredBeersByUsers).toHaveBeenCalledExactlyOnceWith([ALICE, BOB, 3]);
    });

    it("answers an empty map when nobody tasted", async () => {
      repository.countDiscoveredBeersByUsers.mockResolvedValue([]);

      expect((await service.getDiscoveredCounts([ALICE])).size).toBe(0);
    });
  });

});
