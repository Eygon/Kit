import { HttpStatus, ParseIntPipe } from "@nestjs/common";
import { HTTP_CODE_METADATA, INTERCEPTORS_METADATA, PARAMTYPES_METADATA, ROUTE_ARGS_METADATA } from "@nestjs/common/constants";
import { RouteParamtypes } from "@nestjs/common/enums/route-paramtypes.enum";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BeerAromaEnum } from "@/modules/beers/enums/beer-aroma.enum";
import { BeerFormatEnum } from "@/modules/beers/enums/beer-format.enum";
import { CheckinsController } from "@/modules/pokedex/checkins.controller";
import { PokedexService } from "@/modules/pokedex/pokedex.service";
import type { CheckinDto } from "@/modules/pokedex/dtos/checkin.dto";
import type { CreatedCheckinDto } from "@/modules/pokedex/dtos/created-checkin.dto";
import { CheckinsQueryDto } from "@/modules/pokedex/dtos/checkins-query.dto";
import { CreateCheckinDto } from "@/modules/tastings/dtos/create-checkin.dto";

const CHECKIN: CheckinDto = {
  id: 31,
  beerId: 12,
  beerName: "Orval",
  drankAt: "2026-03-14T17:00:00.000Z",
  place: "Le Bistrot",
  venueId: null,
  rating: 4.5,
  aromas: [BeerAromaEnum.FRUITY],
  format: BeerFormatEnum.BOTTLE,
  price: null,
  comment: "",
  photoId: null,
};

const FILE = { buffer: Buffer.from([0x89, 0x50]), mimetype: "image/png", originalname: "photo.png" } as Express.Multer.File;

const DTO: CreateCheckinDto = {
  beerId: 12,
  drankAt: "2026-03-14T17:00:00.000Z",
  place: "Le Bistrot",
  format: BeerFormatEnum.BOTTLE,
};

describe("CheckinsController", () => {
  const service = { createCheckin: vi.fn(), getCheckin: vi.fn(), getCheckins: vi.fn(), deleteCheckin: vi.fn() };

  const buildController = async (): Promise<CheckinsController> => {
    const moduleRef = await Test.createTestingModule({
      controllers: [CheckinsController],
      providers: [{ provide: PokedexService, useValue: service }],
    }).compile();
    return moduleRef.get(CheckinsController);
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("creates the check-in of the current user from the body and returns what the service builds", async () => {
    const created: CreatedCheckinDto = { checkin: CHECKIN, isFirstDiscovery: true };
    service.createCheckin.mockResolvedValue(created);
    const controller = await buildController();

    await expect(controller.create(4, DTO, undefined)).resolves.toBe(created);
    expect(service.createCheckin).toHaveBeenCalledExactlyOnceWith(4, DTO, undefined);
  });

  it("hands the uploaded file to the service next to the body", async () => {
    const created: CreatedCheckinDto = { checkin: { ...CHECKIN, photoId: "3f2b8c1e-5d4a-4e6b-9a7c-1d2e3f4a5b6c" }, isFirstDiscovery: false };
    service.createCheckin.mockResolvedValue(created);
    const controller = await buildController();

    await expect(controller.create(4, DTO, FILE)).resolves.toBe(created);
    expect(service.createCheckin).toHaveBeenCalledExactlyOnceWith(4, DTO, FILE);
  });

  it("returns the check-in of the current user for the id", async () => {
    service.getCheckin.mockResolvedValue(CHECKIN);
    const controller = await buildController();

    await expect(controller.getOne(4, 31)).resolves.toBe(CHECKIN);
    expect(service.getCheckin).toHaveBeenCalledWith(4, 31);
  });

  it("answers 201 to the creation and 200 to the read", () => {
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, CheckinsController.prototype.create)).toBe(HttpStatus.CREATED);
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, CheckinsController.prototype.getOne)).toBe(HttpStatus.OK);
  });

  it("parses the multipart body through a file interceptor on the creation only", () => {
    expect(Reflect.getMetadata(INTERCEPTORS_METADATA, CheckinsController.prototype.create)).toHaveLength(1);
    expect(Reflect.getMetadata(INTERCEPTORS_METADATA, CheckinsController.prototype.getOne)).toBeUndefined();
  });

  it("validates the creation body as CreateCheckinDto", () => {
    const parameterTypes: unknown[] = Reflect.getMetadata(PARAMTYPES_METADATA, CheckinsController.prototype, "create");

    expect(parameterTypes).toEqual([Number, CreateCheckinDto, Object]);
  });

  it("binds the third parameter of the creation to the uploaded file", () => {
    const bindings: Record<string, { index: number }> = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      CheckinsController,
      "create",
    );

    expect(bindings[`${RouteParamtypes.FILE}:2`]).toMatchObject({ index: 2 });
  });

  it("lists the check-ins of the current user for the query", async () => {
    const page = { items: [CHECKIN], total: 1, page: 2, size: 20 };
    const query: CheckinsQueryDto = { beerId: 12, page: 2 };
    service.getCheckins.mockResolvedValue(page);
    const controller = await buildController();

    await expect(controller.getAll(4, query)).resolves.toBe(page);
    expect(service.getCheckins).toHaveBeenCalledExactlyOnceWith(4, query);
  });

  it("deletes the check-in of the current user and returns nothing", async () => {
    service.deleteCheckin.mockResolvedValue(undefined);
    const controller = await buildController();

    await expect(controller.remove(4, 31)).resolves.toBeUndefined();
    expect(service.deleteCheckin).toHaveBeenCalledExactlyOnceWith(4, 31);
  });

  it("answers 200 to the list and 204 to the deletion", () => {
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, CheckinsController.prototype.getAll)).toBe(HttpStatus.OK);
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, CheckinsController.prototype.remove)).toBe(HttpStatus.NO_CONTENT);
  });

  it("validates the list query as CheckinsQueryDto", () => {
    const parameterTypes: unknown[] = Reflect.getMetadata(PARAMTYPES_METADATA, CheckinsController.prototype, "getAll");

    expect(parameterTypes).toEqual([Number, CheckinsQueryDto]);
  });

  it("parses the deletion id with a ParseIntPipe", () => {
    const bindings: Record<string, { index: number; pipes: unknown[] }> = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      CheckinsController,
      "remove",
    );
    const idBinding = bindings[`${RouteParamtypes.PARAM}:1`];

    expect(idBinding.pipes).toEqual([ParseIntPipe]);
  });
});
