import { HttpStatus, ParseIntPipe } from "@nestjs/common";
import { HTTP_CODE_METADATA, PARAMTYPES_METADATA, PATH_METADATA, ROUTE_ARGS_METADATA } from "@nestjs/common/constants";
import { RouteParamtypes } from "@nestjs/common/enums/route-paramtypes.enum";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AddWishlistItemDto } from "@/modules/pokedex/dtos/add-wishlist-item.dto";
import type { WishlistItemDto } from "@/modules/pokedex/dtos/wishlist-item.dto";
import { PokedexService } from "@/modules/pokedex/pokedex.service";
import { WishlistController } from "@/modules/pokedex/wishlist.controller";

const ITEM: WishlistItemDto = { beerId: 12, beerName: "Orval", addedAt: "2026-03-14T17:00:00.000Z" };

describe("WishlistController", () => {
  const service = { getWishlist: vi.fn(), addToWishlist: vi.fn(), removeFromWishlist: vi.fn() };

  const buildController = async (): Promise<WishlistController> => {
    const moduleRef = await Test.createTestingModule({
      controllers: [WishlistController],
      providers: [{ provide: PokedexService, useValue: service }],
    }).compile();
    return moduleRef.get(WishlistController);
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("is mounted on me/wishlist", () => {
    expect(Reflect.getMetadata(PATH_METADATA, WishlistController)).toBe("me/wishlist");
  });

  it("lists the wishlist of the current user", async () => {
    service.getWishlist.mockResolvedValue([ITEM]);
    const controller = await buildController();

    await expect(controller.getAll(4)).resolves.toStrictEqual([ITEM]);
    expect(service.getWishlist).toHaveBeenCalledExactlyOnceWith(4);
  });

  it("adds the beer of the body for the current user and returns the item", async () => {
    const dto: AddWishlistItemDto = { beerId: 12 };
    service.addToWishlist.mockResolvedValue(ITEM);
    const controller = await buildController();

    await expect(controller.add(4, dto)).resolves.toBe(ITEM);
    expect(service.addToWishlist).toHaveBeenCalledExactlyOnceWith(4, dto);
  });

  it("removes the beer of the path for the current user and returns nothing", async () => {
    service.removeFromWishlist.mockResolvedValue(undefined);
    const controller = await buildController();

    await expect(controller.remove(4, 12)).resolves.toBeUndefined();
    expect(service.removeFromWishlist).toHaveBeenCalledExactlyOnceWith(4, 12);
  });

  it("answers 200 to the list, 201 to the addition and 204 to the removal", () => {
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, WishlistController.prototype.getAll)).toBe(HttpStatus.OK);
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, WishlistController.prototype.add)).toBe(HttpStatus.CREATED);
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, WishlistController.prototype.remove)).toBe(HttpStatus.NO_CONTENT);
  });

  it("validates the addition body as AddWishlistItemDto", () => {
    const parameterTypes: unknown[] = Reflect.getMetadata(PARAMTYPES_METADATA, WishlistController.prototype, "add");

    expect(parameterTypes).toEqual([Number, AddWishlistItemDto]);
  });

  it("routes the removal on :beerId and parses it with a ParseIntPipe", () => {
    const bindings: Record<string, { index: number; data: string; pipes: unknown[] }> = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      WishlistController,
      "remove",
    );
    const beerIdBinding = bindings[`${RouteParamtypes.PARAM}:1`];

    expect(Reflect.getMetadata(PATH_METADATA, WishlistController.prototype.remove)).toBe(":beerId");
    expect(beerIdBinding.data).toBe("beerId");
    expect(beerIdBinding.pipes).toEqual([ParseIntPipe]);
  });
});
