import { HttpStatus, RequestMethod } from "@nestjs/common";
import { HTTP_CODE_METADATA, METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";
import { DexController } from "@/modules/pokedex/dex.controller";
import type { DexDto } from "@/modules/pokedex/dtos/dex.dto";
import { PokedexService } from "@/modules/pokedex/pokedex.service";

const DEX: DexDto = {
  discovered: 1,
  total: 120,
  families: [{ family: BeerFamilyEnum.TRAPPIST, discovered: 1, total: 11 }],
  beers: [{ beerId: 12, firstCheckinAt: "2025-10-01T18:00:00.000Z", lastCheckinAt: "2025-10-10T18:00:00.000Z" }],
};

describe("DexController", () => {
  const service = { getDex: vi.fn() };

  const buildController = async (): Promise<DexController> => {
    const moduleRef = await Test.createTestingModule({
      controllers: [DexController],
      providers: [{ provide: PokedexService, useValue: service }],
    }).compile();
    return moduleRef.get(DexController);
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("is mounted on me/dex and answers GET on the root with 200", () => {
    expect(Reflect.getMetadata(PATH_METADATA, DexController)).toBe("me/dex");
    expect(Reflect.getMetadata(PATH_METADATA, DexController.prototype.get)).toBe("/");
    expect(Reflect.getMetadata(METHOD_METADATA, DexController.prototype.get)).toBe(RequestMethod.GET);
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, DexController.prototype.get)).toBe(HttpStatus.OK);
  });

  it("returns the dex of the current user", async () => {
    service.getDex.mockResolvedValue(DEX);
    const controller = await buildController();

    await expect(controller.get(4)).resolves.toBe(DEX);
    expect(service.getDex).toHaveBeenCalledExactlyOnceWith(4);
  });
});
