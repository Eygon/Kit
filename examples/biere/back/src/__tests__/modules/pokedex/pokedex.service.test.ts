import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BeersService } from "@/modules/beers/beers.service";
import { PokedexService } from "@/modules/pokedex/pokedex.service";
import type { BeerDto } from "@/modules/beers/dtos/beer.dto";
import { BeerAromaEnum } from "@/modules/beers/enums/beer-aroma.enum";
import { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";
import { BeerFormatEnum } from "@/modules/beers/enums/beer-format.enum";
import type { CreateCheckinDto } from "@/modules/tastings/dtos/create-checkin.dto";
import type { TastingsService } from "@/modules/tastings/tastings.service";
import type { CheckinRecordDto } from "@/modules/tastings/dtos/checkin-record.dto";
import type { PhotoContentDto } from "@/modules/tastings/dtos/photo-content.dto";
import { PhotoContentTypeEnum } from "@/modules/tastings/enums/photo-content-type.enum";

const NOW = new Date("2026-03-14T18:00:00.000Z");
const MINUTE_MS = 60_000;
const USER_ID = 1;
const PHOTO_ID = "3f2b8c1e-5d4a-4e6b-9a7c-1d2e3f4a5b6c";
const PNG_BUFFER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const WEBP_BUFFER = Buffer.concat([Buffer.from("RIFF"), Buffer.from([0x24, 0x00, 0x00, 0x00]), Buffer.from("WEBP")]);
const TEXT_BUFFER = Buffer.from("this is only text renamed photo.jpg");

const buildFile = (buffer: Buffer, mimetype: string): Express.Multer.File =>
  ({ buffer, mimetype, originalname: "photo.jpg", fieldname: "file", size: buffer.length }) as Express.Multer.File;

const ORVAL: BeerDto = {
  id: 12,
  name: "Orval",
  breweryName: "Orval",
  country: "BE",
  styleId: 2,
  styleName: "Trappiste blonde",
  family: BeerFamilyEnum.TRAPPIST,
  abv: 6.2,
  aromas: [],
  formats: [],
  description: "Trappiste.",
  bitternessLevel: null,
  colorLevel: null,
  styleColorRange: null,
};

const buildDto = (drankAt: string): CreateCheckinDto => ({
  beerId: ORVAL.id,
  drankAt,
  place: "Le Bistrot",
  rating: 4.5,
  aromas: [BeerAromaEnum.FRUITY, BeerAromaEnum.HOPPY],
  format: BeerFormatEnum.BOTTLE,
  price: 6.5,
  comment: "Superbe",
});

const minutesFromNow = (minutes: number): string => new Date(NOW.getTime() + minutes * MINUTE_MS).toISOString();

const RECORD: CheckinRecordDto = {
  id: 31,
  userId: USER_ID,
  beerId: ORVAL.id,
  drankAt: "2026-03-14T17:00:00.000Z",
  place: "Le Bistrot",
  rating: 4.5,
  aromas: [BeerAromaEnum.FRUITY, BeerAromaEnum.HOPPY],
  format: BeerFormatEnum.BOTTLE,
  price: 6.5,
  comment: "Superbe",
  photoId: null,
};

describe("PokedexService", () => {
  const beersService = { getBeer: vi.fn(), getBeersByIds: vi.fn(), getCatalogTotals: vi.fn() };
  const tastingsService = { isFirstCheckin: vi.fn(), createCheckin: vi.fn(), createCheckinWithPhoto: vi.fn(), getOwnedCheckin: vi.fn(), getPhoto: vi.fn(), getCheckinPage: vi.fn(), deleteOwnedCheckin: vi.fn(), getWishlist: vi.fn(), addToWishlist: vi.fn(), removeFromWishlist: vi.fn(), getDiscoveries: vi.fn() };

  const buildService = (): PokedexService =>
    new PokedexService(beersService as unknown as BeersService, tastingsService as unknown as TastingsService);

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    beersService.getBeer.mockResolvedValue(ORVAL);
    tastingsService.isFirstCheckin.mockResolvedValue(true);
    tastingsService.createCheckin.mockResolvedValue(RECORD);
    tastingsService.createCheckinWithPhoto.mockResolvedValue({ ...RECORD, photoId: PHOTO_ID });
    tastingsService.getOwnedCheckin.mockResolvedValue(RECORD);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("createCheckin", () => {
    it("writes the mapped check-in for the user and returns it with the beer name and a first discovery", async () => {
      const service = buildService();

      const created = await service.createCheckin(USER_ID, buildDto("2026-03-14T17:00:00.000Z"), undefined);

      expect(tastingsService.createCheckin).toHaveBeenCalledWith({
        userId: USER_ID,
        beerId: ORVAL.id,
        drankAt: new Date("2026-03-14T17:00:00.000Z"),
        place: "Le Bistrot",
        rating: 4.5,
        aromas: [BeerAromaEnum.FRUITY, BeerAromaEnum.HOPPY],
        format: BeerFormatEnum.BOTTLE,
        price: 6.5,
        comment: "Superbe",
        photoId: null,
      });
      expect(created).toStrictEqual({
        checkin: {
          id: 31,
          beerId: ORVAL.id,
          beerName: "Orval",
          drankAt: "2026-03-14T17:00:00.000Z",
          place: "Le Bistrot",
          rating: 4.5,
          aromas: [BeerAromaEnum.FRUITY, BeerAromaEnum.HOPPY],
          format: BeerFormatEnum.BOTTLE,
          price: 6.5,
          comment: "Superbe",
          photoId: null,
        },
        isFirstDiscovery: true,
      });
    });

    it("reports no first discovery when the user already had a check-in of this beer", async () => {
      tastingsService.isFirstCheckin.mockResolvedValue(false);
      const service = buildService();

      const created = await service.createCheckin(USER_ID, buildDto("2026-03-14T17:00:00.000Z"), undefined);

      expect(created.isFirstDiscovery).toBe(false);
      expect(tastingsService.isFirstCheckin).toHaveBeenCalledWith(USER_ID, ORVAL.id);
    });

    it("reads the first-discovery state before writing", async () => {
      const service = buildService();

      await service.createCheckin(USER_ID, buildDto("2026-03-14T17:00:00.000Z"), undefined);

      expect(tastingsService.isFirstCheckin.mock.invocationCallOrder[0]).toBeLessThan(
        tastingsService.createCheckin.mock.invocationCallOrder[0],
      );
      expect(beersService.getBeer.mock.invocationCallOrder[0]).toBeLessThan(
        tastingsService.isFirstCheckin.mock.invocationCallOrder[0],
      );
    });

    it("accepts a date 4 minutes ahead of the server clock", async () => {
      const service = buildService();

      await expect(service.createCheckin(USER_ID, buildDto(minutesFromNow(4)), undefined)).resolves.toBeDefined();
      expect(tastingsService.createCheckin).toHaveBeenCalledTimes(1);
    });

    it("accepts a date exactly 5 minutes ahead of the server clock", async () => {
      const service = buildService();

      await expect(service.createCheckin(USER_ID, buildDto(minutesFromNow(5)), undefined)).resolves.toBeDefined();
    });

    it("rejects a date 6 minutes ahead with a 400 before looking the beer up or writing", async () => {
      const service = buildService();

      const rejection = service.createCheckin(USER_ID, buildDto(minutesFromNow(6)), undefined);

      await expect(rejection).rejects.toBeInstanceOf(BadRequestException);
      await expect(rejection).rejects.toThrow("drankAt must not be in the future.");
      expect(beersService.getBeer).not.toHaveBeenCalled();
      expect(tastingsService.createCheckin).not.toHaveBeenCalled();
    });

    it("rejects a future date 5 minutes and one millisecond ahead", async () => {
      const service = buildService();
      const drankAt = new Date(NOW.getTime() + 5 * MINUTE_MS + 1).toISOString();

      await expect(service.createCheckin(USER_ID, buildDto(drankAt), undefined)).rejects.toBeInstanceOf(BadRequestException);
    });

    it("lets the 404 of an unknown beer through without reading the history or writing", async () => {
      beersService.getBeer.mockRejectedValue(new NotFoundException("Beer 12 not found."));
      const service = buildService();

      await expect(service.createCheckin(USER_ID, buildDto("2026-03-14T17:00:00.000Z"), undefined)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(tastingsService.isFirstCheckin).not.toHaveBeenCalled();
      expect(tastingsService.createCheckin).not.toHaveBeenCalled();
    });
  });

  describe("createCheckin with a photo", () => {
    const DRANK_AT = "2026-03-14T17:00:00.000Z";
    const EXPECTED_NEW_CHECKIN = {
      userId: USER_ID,
      beerId: ORVAL.id,
      drankAt: new Date(DRANK_AT),
      place: "Le Bistrot",
      rating: 4.5,
      aromas: [BeerAromaEnum.FRUITY, BeerAromaEnum.HOPPY],
      format: BeerFormatEnum.BOTTLE,
      price: 6.5,
      comment: "Superbe",
      photoId: null,
    };

    it("writes the check-in and the png together and returns the photo id", async () => {
      const service = buildService();

      const created = await service.createCheckin(USER_ID, buildDto(DRANK_AT), buildFile(PNG_BUFFER, "image/png"));

      expect(tastingsService.createCheckinWithPhoto).toHaveBeenCalledExactlyOnceWith(EXPECTED_NEW_CHECKIN, {
        contentType: PhotoContentTypeEnum.PNG,
        content: PNG_BUFFER,
      });
      expect(tastingsService.createCheckin).not.toHaveBeenCalled();
      expect(created.checkin.photoId).toBe(PHOTO_ID);
      expect(created.isFirstDiscovery).toBe(true);
    });

    it("stores the detected type and ignores the declared one", async () => {
      const service = buildService();

      await service.createCheckin(USER_ID, buildDto(DRANK_AT), buildFile(WEBP_BUFFER, "image/png"));

      expect(tastingsService.createCheckinWithPhoto).toHaveBeenCalledExactlyOnceWith(EXPECTED_NEW_CHECKIN, {
        contentType: PhotoContentTypeEnum.WEBP,
        content: WEBP_BUFFER,
      });
    });

    it("rejects a text file declared as image/jpeg with a 400 before looking the beer up or writing", async () => {
      const service = buildService();

      const rejection = service.createCheckin(USER_ID, buildDto(DRANK_AT), buildFile(TEXT_BUFFER, "image/jpeg"));

      await expect(rejection).rejects.toBeInstanceOf(BadRequestException);
      await expect(rejection).rejects.toThrow("The photo must be a JPEG, PNG or WebP image.");
      expect(beersService.getBeer).not.toHaveBeenCalled();
      expect(tastingsService.createCheckin).not.toHaveBeenCalled();
      expect(tastingsService.createCheckinWithPhoto).not.toHaveBeenCalled();
    });

    it("answers the future date before the photo type when both are wrong", async () => {
      const service = buildService();

      const rejection = service.createCheckin(USER_ID, buildDto(minutesFromNow(60)), buildFile(TEXT_BUFFER, "image/jpeg"));

      await expect(rejection).rejects.toThrow("drankAt must not be in the future.");
    });

    it("answers the photo type 400 before the 404 of an unknown beer", async () => {
      beersService.getBeer.mockRejectedValue(new NotFoundException("Beer 12 not found."));
      const service = buildService();

      const rejection = service.createCheckin(USER_ID, buildDto(DRANK_AT), buildFile(TEXT_BUFFER, "image/jpeg"));

      await expect(rejection).rejects.toBeInstanceOf(BadRequestException);
    });

    it("lets the 404 of an unknown beer through without writing the photo", async () => {
      beersService.getBeer.mockRejectedValue(new NotFoundException("Beer 12 not found."));
      const service = buildService();

      await expect(
        service.createCheckin(USER_ID, buildDto(DRANK_AT), buildFile(PNG_BUFFER, "image/png")),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(tastingsService.createCheckinWithPhoto).not.toHaveBeenCalled();
      expect(tastingsService.createCheckin).not.toHaveBeenCalled();
    });

    it("reads the first-discovery state before writing the photo", async () => {
      const service = buildService();

      await service.createCheckin(USER_ID, buildDto(DRANK_AT), buildFile(PNG_BUFFER, "image/png"));

      expect(tastingsService.isFirstCheckin.mock.invocationCallOrder[0]).toBeLessThan(
        tastingsService.createCheckinWithPhoto.mock.invocationCallOrder[0],
      );
    });
  });

  describe("getCheckin", () => {
    it("returns the owned check-in with the name of its beer", async () => {
      const service = buildService();

      const checkin = await service.getCheckin(USER_ID, RECORD.id);

      expect(tastingsService.getOwnedCheckin).toHaveBeenCalledWith(USER_ID, RECORD.id);
      expect(beersService.getBeer).toHaveBeenCalledWith(ORVAL.id);
      expect(checkin).toStrictEqual({
        id: 31,
        beerId: ORVAL.id,
        beerName: "Orval",
        drankAt: "2026-03-14T17:00:00.000Z",
        place: "Le Bistrot",
        rating: 4.5,
        aromas: [BeerAromaEnum.FRUITY, BeerAromaEnum.HOPPY],
        format: BeerFormatEnum.BOTTLE,
        price: 6.5,
        comment: "Superbe",
        photoId: null,
      });
    });

    it.each([
      ["404", new NotFoundException("Check-in 31 not found.")],
      ["403", new ForbiddenException("You can only access your own check-ins.")],
    ])("lets the %s of the ownership check through without looking the beer up", async (_status, error) => {
      tastingsService.getOwnedCheckin.mockRejectedValue(error);
      const service = buildService();

      await expect(service.getCheckin(USER_ID, RECORD.id)).rejects.toBe(error);
      expect(beersService.getBeer).not.toHaveBeenCalled();
    });
  });

  describe("getPhoto", () => {
    it("delegates the photo read to the tastings service and returns its content", async () => {
      const photo: PhotoContentDto = { contentType: PhotoContentTypeEnum.PNG, content: PNG_BUFFER };
      tastingsService.getPhoto.mockResolvedValue(photo);

      await expect(buildService().getPhoto(PHOTO_ID)).resolves.toBe(photo);
      expect(tastingsService.getPhoto).toHaveBeenCalledExactlyOnceWith(PHOTO_ID);
    });

    it("lets the not-found of the tastings service through", async () => {
      tastingsService.getPhoto.mockRejectedValue(new NotFoundException(`Photo ${PHOTO_ID} not found.`));

      await expect(buildService().getPhoto(PHOTO_ID)).rejects.toThrow(`Photo ${PHOTO_ID} not found.`);
    });
  });

  describe("getCheckins", () => {
    const CHIMAY: BeerDto = { ...ORVAL, id: 13, name: "Chimay Rouge" };
    const second: CheckinRecordDto = { ...RECORD, id: 30, beerId: CHIMAY.id };
    const third: CheckinRecordDto = { ...RECORD, id: 29 };

    it("reads page 1 of size 20 by default and names the items with one beer lookup of the distinct ids", async () => {
      tastingsService.getCheckinPage.mockResolvedValue({ items: [RECORD, second, third], total: 3 });
      beersService.getBeersByIds.mockResolvedValue([CHIMAY, ORVAL]);

      const page = await buildService().getCheckins(USER_ID, {});

      expect(tastingsService.getCheckinPage).toHaveBeenCalledExactlyOnceWith(USER_ID, undefined, 1, 20);
      expect(beersService.getBeersByIds).toHaveBeenCalledExactlyOnceWith([ORVAL.id, CHIMAY.id]);
      expect(page.total).toBe(3);
      expect(page.page).toBe(1);
      expect(page.size).toBe(20);
      expect(page.items.map((item) => [item.id, item.beerName])).toEqual([
        [31, "Orval"],
        [30, "Chimay Rouge"],
        [29, "Orval"],
      ]);
    });

    it("passes the beer filter and the requested page to the tastings service", async () => {
      tastingsService.getCheckinPage.mockResolvedValue({ items: [], total: 25 });
      beersService.getBeersByIds.mockResolvedValue([]);

      const page = await buildService().getCheckins(USER_ID, { beerId: ORVAL.id, page: 3 });

      expect(tastingsService.getCheckinPage).toHaveBeenCalledExactlyOnceWith(USER_ID, ORVAL.id, 3, 20);
      expect(page).toStrictEqual({ items: [], total: 25, page: 3, size: 20 });
    });
  });

  describe("deleteCheckin", () => {
    it("deletes through the owned deletion of the tastings service", async () => {
      tastingsService.deleteOwnedCheckin.mockResolvedValue(undefined);

      await expect(buildService().deleteCheckin(USER_ID, RECORD.id)).resolves.toBeUndefined();
      expect(tastingsService.deleteOwnedCheckin).toHaveBeenCalledExactlyOnceWith(USER_ID, RECORD.id);
    });

    it("lets the 403 through", async () => {
      const error = new ForbiddenException("You can only access your own check-ins.");
      tastingsService.deleteOwnedCheckin.mockRejectedValue(error);

      await expect(buildService().deleteCheckin(USER_ID, RECORD.id)).rejects.toBe(error);
    });
  });

  describe("getWishlist", () => {
    it("names every item with the catalog and keeps the order of the records", async () => {
      tastingsService.getWishlist.mockResolvedValue([
        { beerId: 30, addedAt: "2026-03-15T10:00:00.000Z" },
        { beerId: ORVAL.id, addedAt: "2026-03-14T10:00:00.000Z" },
      ]);
      beersService.getBeersByIds.mockResolvedValue([ORVAL, { ...ORVAL, id: 30, name: "Duvel" }]);

      const items = await buildService().getWishlist(USER_ID);

      expect(tastingsService.getWishlist).toHaveBeenCalledExactlyOnceWith(USER_ID);
      expect(beersService.getBeersByIds).toHaveBeenCalledExactlyOnceWith([30, ORVAL.id]);
      expect(items).toStrictEqual([
        { beerId: 30, beerName: "Duvel", addedAt: "2026-03-15T10:00:00.000Z" },
        { beerId: ORVAL.id, beerName: "Orval", addedAt: "2026-03-14T10:00:00.000Z" },
      ]);
    });

    it("answers an empty list for an empty wishlist", async () => {
      tastingsService.getWishlist.mockResolvedValue([]);
      beersService.getBeersByIds.mockResolvedValue([]);

      await expect(buildService().getWishlist(USER_ID)).resolves.toStrictEqual([]);
    });

    it("falls back to an empty name for a beer missing from the catalog", async () => {
      tastingsService.getWishlist.mockResolvedValue([{ beerId: 77, addedAt: "2026-03-14T10:00:00.000Z" }]);
      beersService.getBeersByIds.mockResolvedValue([]);

      await expect(buildService().getWishlist(USER_ID)).resolves.toStrictEqual([
        { beerId: 77, beerName: "", addedAt: "2026-03-14T10:00:00.000Z" },
      ]);
    });
  });

  describe("addToWishlist", () => {
    it("checks the beer, adds it and returns the item with the beer name", async () => {
      tastingsService.addToWishlist.mockResolvedValue({ beerId: ORVAL.id, addedAt: "2026-03-14T10:00:00.000Z" });

      const item = await buildService().addToWishlist(USER_ID, { beerId: ORVAL.id });

      expect(beersService.getBeer).toHaveBeenCalledExactlyOnceWith(ORVAL.id);
      expect(tastingsService.addToWishlist).toHaveBeenCalledExactlyOnceWith(USER_ID, ORVAL.id);
      expect(item).toStrictEqual({ beerId: ORVAL.id, beerName: "Orval", addedAt: "2026-03-14T10:00:00.000Z" });
    });

    it("lets the 404 of an unknown beer through before any write, even if the beer is already listed", async () => {
      const error = new NotFoundException("Beer 99 not found.");
      beersService.getBeer.mockRejectedValue(error);
      tastingsService.addToWishlist.mockRejectedValue(new ConflictException("Beer 99 is already in the wishlist."));

      await expect(buildService().addToWishlist(USER_ID, { beerId: 99 })).rejects.toBe(error);
      expect(tastingsService.addToWishlist).not.toHaveBeenCalled();
    });

    it("lets the 409 of a beer already listed through", async () => {
      const error = new ConflictException("Beer 12 is already in the wishlist.");
      tastingsService.addToWishlist.mockRejectedValue(error);

      await expect(buildService().addToWishlist(USER_ID, { beerId: ORVAL.id })).rejects.toBe(error);
    });
  });

  describe("removeFromWishlist", () => {
    it("removes through the tastings service without checking the beer", async () => {
      tastingsService.removeFromWishlist.mockResolvedValue(undefined);

      await expect(buildService().removeFromWishlist(USER_ID, ORVAL.id)).resolves.toBeUndefined();
      expect(tastingsService.removeFromWishlist).toHaveBeenCalledExactlyOnceWith(USER_ID, ORVAL.id);
      expect(beersService.getBeer).not.toHaveBeenCalled();
    });

    it("lets the 404 of an absent item through", async () => {
      const error = new NotFoundException("Beer 12 is not in the wishlist.");
      tastingsService.removeFromWishlist.mockRejectedValue(error);

      await expect(buildService().removeFromWishlist(USER_ID, ORVAL.id)).rejects.toBe(error);
    });
  });

  describe("getDex", () => {
    const TOTALS = { total: 120, families: [{ value: "trappist", count: 11 }] };
    const DISCOVERIES = [
      { beerId: 5, firstCheckinAt: "2025-10-05T18:00:00.000Z", lastCheckinAt: "2025-10-05T18:00:00.000Z" },
      { beerId: ORVAL.id, firstCheckinAt: "2025-10-01T18:00:00.000Z", lastCheckinAt: "2025-10-10T18:00:00.000Z" },
    ];
    const DUVEL: BeerDto = { ...ORVAL, id: 5, name: "Duvel", family: BeerFamilyEnum.BELGIAN_STRONG };

    it("composes the discoveries, the catalog totals and the families of the discovered beers", async () => {
      tastingsService.getDiscoveries.mockResolvedValue(DISCOVERIES);
      beersService.getCatalogTotals.mockResolvedValue(TOTALS);
      beersService.getBeersByIds.mockResolvedValue([DUVEL, ORVAL]);

      const dex = await buildService().getDex(USER_ID);

      expect(tastingsService.getDiscoveries).toHaveBeenCalledExactlyOnceWith(USER_ID);
      expect(beersService.getBeersByIds).toHaveBeenCalledExactlyOnceWith([5, ORVAL.id]);
      expect(dex.discovered).toBe(2);
      expect(dex.total).toBe(120);
      expect(dex.families).toHaveLength(18);
      expect(dex.families.filter((family) => family.discovered > 0).map((family) => family.family)).toStrictEqual([
        BeerFamilyEnum.TRAPPIST,
        BeerFamilyEnum.BELGIAN_STRONG,
      ]);
      expect(dex.beers).toStrictEqual(DISCOVERIES);
    });

    it("answers an empty progression when the user has no discovery", async () => {
      tastingsService.getDiscoveries.mockResolvedValue([]);
      beersService.getCatalogTotals.mockResolvedValue(TOTALS);
      beersService.getBeersByIds.mockResolvedValue([]);

      const dex = await buildService().getDex(USER_ID);

      expect(beersService.getBeersByIds).toHaveBeenCalledExactlyOnceWith([]);
      expect(dex.discovered).toBe(0);
      expect(dex.beers).toStrictEqual([]);
    });
  });
});
