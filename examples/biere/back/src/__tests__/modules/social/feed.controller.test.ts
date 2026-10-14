import { HttpStatus, RequestMethod } from "@nestjs/common";
import { HTTP_CODE_METADATA, METHOD_METADATA, MODULE_METADATA, PATH_METADATA, ROUTE_ARGS_METADATA } from "@nestjs/common/constants";
import { Test } from "@nestjs/testing";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BeersModule } from "@/modules/beers/beers.module";
import type { FeedPageDto } from "@/modules/social/dtos/feed-page.dto";
import { FeedQueryDto } from "@/modules/social/dtos/feed-query.dto";
import { FeedController } from "@/modules/social/feed.controller";
import { SocialModule } from "@/modules/social/social.module";
import { SocialService } from "@/modules/social/social.service";

const PAGE: FeedPageDto = { items: [], total: 0, page: 1, size: 20 };

const validationErrors = async (plain: Record<string, unknown>) =>
  validate(plainToInstance(FeedQueryDto, plain), { whitelist: true, forbidNonWhitelisted: true });

describe("FeedController", () => {
  const service = { getFeed: vi.fn() };

  const buildController = async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [FeedController],
      providers: [{ provide: SocialService, useValue: service }],
    }).compile();
    return moduleRef.get(FeedController);
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("answers the feed page the service builds for the current user and the query", async () => {
    service.getFeed.mockResolvedValue(PAGE);
    const query = Object.assign(new FeedQueryDto(), { page: 2 });
    const controller = await buildController();

    expect(await controller.get(1, query)).toBe(PAGE);
    expect(service.getFeed).toHaveBeenCalledExactlyOnceWith(1, query);
  });

  it("is mounted on GET me/feed and declares 200", () => {
    expect(Reflect.getMetadata(PATH_METADATA, FeedController)).toBe("me/feed");
    expect(Reflect.getMetadata(METHOD_METADATA, FeedController.prototype.get)).toBe(RequestMethod.GET);
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, FeedController.prototype.get)).toBe(HttpStatus.OK);
  });

  it("binds the query string to the FeedQueryDto", () => {
    const args: Record<string, unknown> = Reflect.getMetadata(ROUTE_ARGS_METADATA, FeedController, "get");

    expect(Object.keys(args)).toHaveLength(2);
    expect(Reflect.getMetadata("design:paramtypes", FeedController.prototype, "get")).toEqual([Number, FeedQueryDto]);
  });

  it("is registered as a controller of the social module, which imports the beers module", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, SocialModule)).toContain(FeedController);
    expect(Reflect.getMetadata(MODULE_METADATA.IMPORTS, SocialModule)).toContain(BeersModule);
  });
});

describe("FeedQueryDto", () => {
  it("accepts a missing page", async () => {
    expect(await validationErrors({})).toEqual([]);
  });

  it("converts a numeric string into the page number", async () => {
    const dto = plainToInstance(FeedQueryDto, { page: "2" });

    expect(dto.page).toBe(2);
    expect(await validationErrors({ page: "2" })).toEqual([]);
  });

  it.each([["0"], ["-1"], ["abc"], ["1.5"]])("rejects the page %s", async (page) => {
    const errors = await validationErrors({ page });

    expect(errors.map((error) => error.property)).toEqual(["page"]);
  });

  it("rejects an unknown query parameter", async () => {
    const errors = await validationErrors({ size: "50" });

    expect(errors.map((error) => error.property)).toEqual(["size"]);
  });
});
