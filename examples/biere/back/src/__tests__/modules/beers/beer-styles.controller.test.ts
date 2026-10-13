import { HttpStatus, RequestMethod } from "@nestjs/common";
import { HTTP_CODE_METADATA, METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BeerStylesController } from "@/modules/beers/beer-styles.controller";
import { BeersService } from "@/modules/beers/beers.service";
import type { BeerStyleGroupDto } from "@/modules/beers/dtos/beer-style-group.dto";
import { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";

describe("BeerStylesController", () => {
  const service = { getStyleGroups: vi.fn() };
  let controller: BeerStylesController;

  beforeEach(async () => {
    vi.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [BeerStylesController],
      providers: [{ provide: BeersService, useValue: service }],
    }).compile();
    controller = moduleRef.get(BeerStylesController);
  });

  it("returns the groups the service builds", async () => {
    const groups: BeerStyleGroupDto[] = [
      { family: BeerFamilyEnum.STOUT, styles: [{ id: 1, name: "Stout irlandais", description: "Noire" }] },
    ];
    service.getStyleGroups.mockResolvedValue(groups);

    expect(await controller.getAll()).toBe(groups);
    expect(service.getStyleGroups).toHaveBeenCalledTimes(1);
  });

  it("serves GET /beer-styles with 200", () => {
    expect(Reflect.getMetadata(PATH_METADATA, BeerStylesController)).toBe("beer-styles");
    const handler = BeerStylesController.prototype.getAll;
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.GET);
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(HttpStatus.OK);
  });
});
