import { Test, type TestingModule } from "@nestjs/testing";
import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import type { Repository } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Photo } from "@/modules/tastings/entities/photo.entity";
import { PhotoContentTypeEnum } from "@/modules/tastings/enums/photo-content-type.enum";
import { Checkin } from "@/modules/tastings/entities/checkin.entity";
import { WishlistItem } from "@/modules/tastings/entities/wishlist-item.entity";
import { TastingsRepository } from "@/modules/tastings/tastings.repository";
import { BeerAromaEnum } from "@/modules/beers/enums/beer-aroma.enum";
import { BeerFormatEnum } from "@/modules/beers/enums/beer-format.enum";
import { inMemoryDatabase } from "@/__tests__/support/test-database";

const ALICE = 1;
const BOB = 2;
const BEER = 10;
const OTHER_BEER = 11;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const PNG_CONTENT = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01, 0x02]);

const newCheckin = (
  userId: number,
  beerId: number,
  overrides: Partial<Omit<Checkin, "id" | "createdAt">> = {},
): Omit<Checkin, "id" | "createdAt"> => ({
  userId,
  beerId,
  drankAt: new Date("2026-03-14T18:30:00.000Z"),
  place: "Chez Alice",
  rating: null,
  aromas: [],
  format: BeerFormatEnum.BOTTLE,
  price: null,
  comment: "",
  photoId: null,
  ...overrides,
});

describe("TastingsRepository", () => {
  let moduleRef: TestingModule;
  let repository: TastingsRepository;
  let checkins: Repository<Checkin>;
  let wishlistItems: Repository<WishlistItem>;
  let photos: Repository<Photo>;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [inMemoryDatabase(), TypeOrmModule.forFeature([Checkin, WishlistItem, Photo])],
      providers: [TastingsRepository],
    }).compile();
    repository = moduleRef.get(TastingsRepository);
    checkins = moduleRef.get(getRepositoryToken(Checkin));
    wishlistItems = moduleRef.get(getRepositoryToken(WishlistItem));
    photos = moduleRef.get(getRepositoryToken(Photo));
  });

  beforeEach(async () => {
    await checkins.clear();
    await photos.clear();
    await wishlistItems.clear();
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it("starts with empty checkins and wishlist_items tables", async () => {
    expect(await checkins.count()).toBe(0);
    expect(await wishlistItems.count()).toBe(0);
  });

  it("reads a saved check-in back by id with null rating and price, empty comment and no photo", async () => {
    const created = await repository.createCheckin(newCheckin(ALICE, BEER, { aromas: [BeerAromaEnum.FRUITY, BeerAromaEnum.HOPPY] }));

    const found = await repository.findCheckinById(created.id);

    expect(created.id).toEqual(expect.any(Number));
    expect(found).toStrictEqual({
      id: created.id,
      userId: ALICE,
      beerId: BEER,
      drankAt: "2026-03-14T18:30:00.000Z",
      place: "Chez Alice",
      rating: null,
      aromas: [BeerAromaEnum.FRUITY, BeerAromaEnum.HOPPY],
      format: BeerFormatEnum.BOTTLE,
      price: null,
      comment: "",
      photoId: null,
    });
  });

  it("keeps a rating, a price and a photo id when they are given", async () => {
    const photoId = "3f2b8c1e-5d4a-4e6b-9a7c-1d2e3f4a5b6c";

    const created = await repository.createCheckin(
      newCheckin(BOB, BEER, { rating: 4.5, price: 3.2, comment: "Top", photoId, format: BeerFormatEnum.DRAFT }),
    );

    expect(await repository.findCheckinById(created.id)).toMatchObject({
      rating: 4.5,
      price: 3.2,
      comment: "Top",
      photoId,
      format: BeerFormatEnum.DRAFT,
    });
  });

  it("returns null for an unknown check-in id", async () => {
    expect(await repository.findCheckinById(999)).toBeNull();
  });

  it("counts only the check-ins of one user for one beer", async () => {
    await repository.createCheckin(newCheckin(ALICE, BEER));
    await repository.createCheckin(newCheckin(ALICE, BEER));
    await repository.createCheckin(newCheckin(BOB, BEER));
    await repository.createCheckin(newCheckin(ALICE, OTHER_BEER));

    expect(await repository.countCheckins(ALICE, BEER)).toBe(2);
    expect(await repository.countCheckins(BOB, BEER)).toBe(1);
    expect(await repository.countCheckins(BOB, OTHER_BEER)).toBe(0);
  });

  describe("createCheckinWithPhoto", () => {
    it("writes the photo and the check-in together and links them with the photo id", async () => {
      const created = await repository.createCheckinWithPhoto(
        newCheckin(ALICE, BEER, { rating: 4, place: "Chez Alice" }),
        { contentType: PhotoContentTypeEnum.PNG, content: PNG_CONTENT },
      );

      expect(created.photoId).toMatch(UUID_PATTERN);
      const stored = await photos.find();
      expect(stored).toHaveLength(1);
      expect(stored[0].id).toBe(created.photoId);
      expect(stored[0].contentType).toBe("image/png");
      expect(Buffer.compare(stored[0].content, PNG_CONTENT)).toBe(0);
      expect(await repository.findCheckinById(created.id)).toStrictEqual({
        id: created.id,
        userId: ALICE,
        beerId: BEER,
        drankAt: "2026-03-14T18:30:00.000Z",
        place: "Chez Alice",
        rating: 4,
        aromas: [],
        format: BeerFormatEnum.BOTTLE,
        price: null,
        comment: "",
        photoId: stored[0].id,
      });
    });

    it("gives each photo its own id", async () => {
      const first = await repository.createCheckinWithPhoto(newCheckin(ALICE, BEER), { contentType: PhotoContentTypeEnum.PNG, content: PNG_CONTENT });
      const second = await repository.createCheckinWithPhoto(newCheckin(ALICE, BEER), { contentType: PhotoContentTypeEnum.PNG, content: PNG_CONTENT });

      expect(first.photoId).not.toBe(second.photoId);
      expect(await photos.count()).toBe(2);
    });

    it("keeps neither the photo nor the check-in when the check-in cannot be written", async () => {
      const invalid = newCheckin(ALICE, BEER, { place: null as unknown as string });

      await expect(repository.createCheckinWithPhoto(invalid, { contentType: PhotoContentTypeEnum.PNG, content: PNG_CONTENT })).rejects.toThrow();

      expect(await photos.count()).toBe(0);
      expect(await checkins.count()).toBe(0);
    });
  });

  it("finds the content type and the exact bytes of a stored photo, and nothing else", async () => {
    await photos.save(photos.create({ contentType: PhotoContentTypeEnum.JPEG, content: Buffer.from([0xff, 0xd8, 0xff, 0x09]) }));
    const saved = await photos.save(photos.create({ contentType: PhotoContentTypeEnum.PNG, content: PNG_CONTENT }));

    const found = await repository.findPhoto(saved.id);

    expect(found).toEqual({ contentType: PhotoContentTypeEnum.PNG, content: PNG_CONTENT });
    expect(Buffer.isBuffer(found?.content)).toBe(true);
  });

  it("returns null for a photo id that is not stored", async () => {
    await photos.save(photos.create({ contentType: PhotoContentTypeEnum.PNG, content: PNG_CONTENT }));

    await expect(repository.findPhoto("3f2b8c1e-5d4a-4e6b-9a7c-1d2e3f4a5b6c")).resolves.toBeNull();
  });

  describe("findCheckinPage", () => {
    const at = (day: number): Date => new Date(Date.UTC(2026, 0, day, 12));

    it("returns only the check-ins of the user, newest first, ties broken by the larger id", async () => {
      await repository.createCheckin(newCheckin(BOB, BEER, { drankAt: at(30) }));
      const newest = await repository.createCheckin(newCheckin(ALICE, OTHER_BEER, { drankAt: at(20) }));
      const tieFirst = await repository.createCheckin(newCheckin(ALICE, BEER, { drankAt: at(10) }));
      const tieSecond = await repository.createCheckin(newCheckin(ALICE, BEER, { drankAt: at(10) }));
      const oldest = await repository.createCheckin(newCheckin(ALICE, BEER, { drankAt: at(1) }));

      const slice = await repository.findCheckinPage(ALICE, undefined, 1, 20);

      expect(slice.items.map((item) => item.id)).toEqual([newest.id, tieSecond.id, tieFirst.id, oldest.id]);
      expect(slice.total).toBe(4);
      expect(slice.items[0]).toStrictEqual(newest);
    });

    it("restricts to one beer and counts only that beer", async () => {
      await repository.createCheckin(newCheckin(ALICE, OTHER_BEER, { drankAt: at(5) }));
      await repository.createCheckin(newCheckin(BOB, BEER, { drankAt: at(6) }));
      const wanted = await repository.createCheckin(newCheckin(ALICE, BEER, { drankAt: at(1) }));

      const slice = await repository.findCheckinPage(ALICE, BEER, 1, 20);

      expect(slice.items.map((item) => item.id)).toEqual([wanted.id]);
      expect(slice.total).toBe(1);
    });

    it("skips the previous pages but keeps the full total", async () => {
      const created = [];
      for (const day of [5, 4, 3, 2, 1]) {
        created.push(await repository.createCheckin(newCheckin(ALICE, BEER, { drankAt: at(day) })));
      }
      const ids = created.map((item) => item.id);

      const second = await repository.findCheckinPage(ALICE, undefined, 2, 2);
      const third = await repository.findCheckinPage(ALICE, undefined, 3, 2);
      const fourth = await repository.findCheckinPage(ALICE, undefined, 4, 2);

      expect(second.items.map((item) => item.id)).toEqual(ids.slice(2, 4));
      expect(third.items.map((item) => item.id)).toEqual(ids.slice(4));
      expect(fourth.items).toEqual([]);
      expect([second.total, third.total, fourth.total]).toEqual([5, 5, 5]);
    });

    it("returns an empty slice for a beer the user never drank", async () => {
      await repository.createCheckin(newCheckin(ALICE, BEER));

      await expect(repository.findCheckinPage(ALICE, 9999, 1, 20)).resolves.toEqual({ items: [], total: 0 });
    });
  });

  describe("deleteCheckinWithPhoto", () => {
    it("deletes the check-in and its photo and leaves the other rows", async () => {
      await photos.save(photos.create({ contentType: PhotoContentTypeEnum.JPEG, content: Buffer.from([0xff, 0xd8, 0xff, 0x09]) }));
      const withPhoto = await repository.createCheckinWithPhoto(newCheckin(ALICE, BEER), { contentType: PhotoContentTypeEnum.PNG, content: PNG_CONTENT });
      const other = await repository.createCheckin(newCheckin(ALICE, BEER));

      await repository.deleteCheckinWithPhoto(withPhoto.id, withPhoto.photoId);

      expect(await repository.findCheckinById(withPhoto.id)).toBeNull();
      expect(await repository.findPhoto(withPhoto.photoId as string)).toBeNull();
      expect(await repository.findCheckinById(other.id)).not.toBeNull();
      expect(await photos.count()).toBe(1);
    });

    it("keeps the check-in when its photo cannot be deleted", async () => {
      const withPhoto = await repository.createCheckinWithPhoto(newCheckin(ALICE, BEER), { contentType: PhotoContentTypeEnum.PNG, content: PNG_CONTENT });
      const dataSource = moduleRef.get(DataSource);
      await dataSource.query("CREATE TRIGGER keep_photos BEFORE DELETE ON photos BEGIN SELECT RAISE(ABORT, 'photo is locked'); END");

      try {
        await expect(repository.deleteCheckinWithPhoto(withPhoto.id, withPhoto.photoId)).rejects.toThrow("photo is locked");
      } finally {
        await dataSource.query("DROP TRIGGER keep_photos");
      }

      expect(await repository.findCheckinById(withPhoto.id)).not.toBeNull();
      expect(await photos.count()).toBe(1);
    });

    it("deletes only the check-in when it has no photo", async () => {
      await photos.save(photos.create({ contentType: PhotoContentTypeEnum.PNG, content: PNG_CONTENT }));
      const plain = await repository.createCheckin(newCheckin(ALICE, BEER));
      const other = await repository.createCheckin(newCheckin(BOB, BEER));

      await repository.deleteCheckinWithPhoto(plain.id, null);

      expect(await repository.findCheckinById(plain.id)).toBeNull();
      expect(await repository.findCheckinById(other.id)).not.toBeNull();
      expect(await photos.count()).toBe(1);
    });
  });

  describe("findDiscoveries", () => {
    const at = (drankAt: string): Partial<Omit<Checkin, "id" | "createdAt">> => ({ drankAt: new Date(drankAt) });

    it("groups the check-ins of the user by beer, first date descending then beer id ascending, with ISO dates", async () => {
      await repository.createCheckin(newCheckin(BOB, 10, at("2025-09-01T08:00:00.000Z")));
      await repository.createCheckin(newCheckin(BOB, 14, at("2025-10-20T08:00:00.000Z")));
      await repository.createCheckin(newCheckin(ALICE, 10, at("2025-10-10T20:15:00.000Z")));
      await repository.createCheckin(newCheckin(ALICE, 13, at("2025-10-03T19:00:00.000Z")));
      await repository.createCheckin(newCheckin(ALICE, 11, at("2025-10-05T21:30:00.000Z")));
      await repository.createCheckin(newCheckin(ALICE, 10, at("2025-10-01T18:45:00.000Z")));
      await repository.createCheckin(newCheckin(ALICE, 12, at("2025-10-03T19:00:00.000Z")));
      await repository.createCheckin(newCheckin(ALICE, 12, at("2025-10-04T07:00:00.000Z")));

      const discoveries = await repository.findDiscoveries(ALICE);

      expect(discoveries).toStrictEqual([
        { beerId: 11, firstCheckinAt: "2025-10-05T21:30:00.000Z", lastCheckinAt: "2025-10-05T21:30:00.000Z" },
        { beerId: 12, firstCheckinAt: "2025-10-03T19:00:00.000Z", lastCheckinAt: "2025-10-04T07:00:00.000Z" },
        { beerId: 13, firstCheckinAt: "2025-10-03T19:00:00.000Z", lastCheckinAt: "2025-10-03T19:00:00.000Z" },
        { beerId: 10, firstCheckinAt: "2025-10-01T18:45:00.000Z", lastCheckinAt: "2025-10-10T20:15:00.000Z" },
      ]);
    });

    it("returns an empty array for a user who has no check-in, even when another user has some", async () => {
      await repository.createCheckin(newCheckin(BOB, BEER));

      expect(await repository.findDiscoveries(ALICE)).toStrictEqual([]);
    });
  });

  describe("wishlist", () => {
    const wishlistRow = (userId: number, beerId: number, addedAt: string): Pick<WishlistItem, "userId" | "beerId" | "addedAt"> => ({
      userId,
      beerId,
      addedAt: new Date(addedAt),
    });

    it("lists only the items of the user, most recent first, then highest id first on a tie", async () => {
      await wishlistItems.save(wishlistItems.create(wishlistRow(BOB, 40, "2026-03-20T10:00:00.000Z")));
      await wishlistItems.save(wishlistItems.create(wishlistRow(ALICE, 20, "2026-03-14T10:00:00.000Z")));
      await wishlistItems.save(wishlistItems.create(wishlistRow(ALICE, 30, "2026-03-15T10:00:00.000Z")));
      await wishlistItems.save(wishlistItems.create(wishlistRow(ALICE, 31, "2026-03-15T10:00:00.000Z")));

      const items = await repository.findWishlist(ALICE);

      expect(items).toStrictEqual([
        { beerId: 31, addedAt: "2026-03-15T10:00:00.000Z" },
        { beerId: 30, addedAt: "2026-03-15T10:00:00.000Z" },
        { beerId: 20, addedAt: "2026-03-14T10:00:00.000Z" },
      ]);
    });

    it("lists an empty wishlist as an empty array", async () => {
      await wishlistItems.save(wishlistItems.create(wishlistRow(BOB, BEER, "2026-03-20T10:00:00.000Z")));

      expect(await repository.findWishlist(ALICE)).toStrictEqual([]);
    });

    it("tells whether the beer is in the wishlist of the user and not of another user", async () => {
      await wishlistItems.save(wishlistItems.create(wishlistRow(BOB, BEER, "2026-03-20T10:00:00.000Z")));
      await wishlistItems.save(wishlistItems.create(wishlistRow(ALICE, OTHER_BEER, "2026-03-20T10:00:00.000Z")));

      expect(await repository.existsWishlistItem(ALICE, OTHER_BEER)).toBe(true);
      expect(await repository.existsWishlistItem(ALICE, BEER)).toBe(false);
      expect(await repository.existsWishlistItem(BOB, OTHER_BEER)).toBe(false);
    });

    it("adds an item, returns its record with an ISO date and stores it", async () => {
      const before = Date.now();

      const added = await repository.addWishlistItem(ALICE, BEER);

      expect(Object.keys(added).sort()).toStrictEqual(["addedAt", "beerId"]);
      expect(added.beerId).toBe(BEER);
      expect(new Date(added.addedAt).toISOString()).toBe(added.addedAt);
      expect(Date.parse(added.addedAt)).toBeGreaterThanOrEqual(before - 1000);
      expect(await wishlistItems.countBy({ userId: ALICE, beerId: BEER })).toBe(1);
      expect(await repository.findWishlist(ALICE)).toStrictEqual([added]);
    });

    it("removes only the item of the user and the beer and answers true", async () => {
      await wishlistItems.save(wishlistItems.create(wishlistRow(BOB, BEER, "2026-03-20T10:00:00.000Z")));
      await wishlistItems.save(wishlistItems.create(wishlistRow(ALICE, OTHER_BEER, "2026-03-20T10:00:00.000Z")));
      await wishlistItems.save(wishlistItems.create(wishlistRow(ALICE, BEER, "2026-03-20T10:00:00.000Z")));

      const removed = await repository.removeWishlistItem(ALICE, BEER);

      expect(removed).toBe(true);
      expect(await wishlistItems.countBy({ userId: ALICE, beerId: BEER })).toBe(0);
      expect(await wishlistItems.countBy({ userId: BOB, beerId: BEER })).toBe(1);
      expect(await wishlistItems.countBy({ userId: ALICE, beerId: OTHER_BEER })).toBe(1);
    });

    it("answers false when the user has no such item, even if another user has it", async () => {
      await wishlistItems.save(wishlistItems.create(wishlistRow(BOB, BEER, "2026-03-20T10:00:00.000Z")));

      expect(await repository.removeWishlistItem(ALICE, BEER)).toBe(false);
      expect(await wishlistItems.count()).toBe(1);
    });
  });
  describe("beer states", () => {
    const wishlist = async (userId: number, beerId: number): Promise<void> => {
      await wishlistItems.save(wishlistItems.create({ userId, beerId }));
    };

    it("gives one entry per requested id, in the requested order, with the counts and the wishlist presence of the user", async () => {
      await repository.createCheckin(newCheckin(BOB, BEER));
      await repository.createCheckin(newCheckin(BOB, OTHER_BEER));
      await repository.createCheckin(newCheckin(BOB, OTHER_BEER));
      await repository.createCheckin(newCheckin(ALICE, BEER));
      await repository.createCheckin(newCheckin(ALICE, BEER));
      await wishlist(BOB, BEER);
      await wishlist(ALICE, OTHER_BEER);

      const states = await repository.findBeerStates(ALICE, [OTHER_BEER, BEER, 13]);

      expect(states).toStrictEqual([
        { beerId: OTHER_BEER, drunk: false, checkinCount: 0, inWishlist: true },
        { beerId: BEER, drunk: true, checkinCount: 2, inWishlist: false },
        { beerId: 13, drunk: false, checkinCount: 0, inWishlist: false },
      ]);
    });

    it("ignores the check-ins and the wishlist items of beers that were not requested", async () => {
      await repository.createCheckin(newCheckin(ALICE, OTHER_BEER));
      await wishlist(ALICE, OTHER_BEER);

      expect(await repository.findBeerStates(ALICE, [BEER])).toStrictEqual([
        { beerId: BEER, drunk: false, checkinCount: 0, inWishlist: false },
      ]);
    });

    it("answers an empty list for no id, without any query", async () => {
      await repository.createCheckin(newCheckin(ALICE, BEER));
      const createQueryRunner = vi.spyOn(moduleRef.get(DataSource), "createQueryRunner");

      expect(await repository.findBeerStates(ALICE, [])).toStrictEqual([]);
      expect(createQueryRunner).not.toHaveBeenCalled();
      createQueryRunner.mockRestore();
    });

    it("lists the distinct beers the user drank, by increasing id, and not the ones of another user", async () => {
      await repository.createCheckin(newCheckin(BOB, 5));
      await repository.createCheckin(newCheckin(ALICE, OTHER_BEER));
      await repository.createCheckin(newCheckin(ALICE, BEER));
      await repository.createCheckin(newCheckin(ALICE, OTHER_BEER));

      expect(await repository.findDrunkBeerIds(ALICE)).toStrictEqual([BEER, OTHER_BEER]);
    });

    it("lists no drunk beer for a user without check-in", async () => {
      await repository.createCheckin(newCheckin(BOB, BEER));

      expect(await repository.findDrunkBeerIds(ALICE)).toStrictEqual([]);
    });

    it("lists the wishlist beers of the user by increasing id, and not the ones of another user", async () => {
      await wishlist(BOB, 5);
      await wishlist(ALICE, OTHER_BEER);
      await wishlist(ALICE, BEER);

      expect(await repository.findWishlistBeerIds(ALICE)).toStrictEqual([BEER, OTHER_BEER]);
    });

    it("lists no wishlist beer for a user without wishlist", async () => {
      await wishlist(BOB, BEER);

      expect(await repository.findWishlistBeerIds(ALICE)).toStrictEqual([]);
    });
  });

});
