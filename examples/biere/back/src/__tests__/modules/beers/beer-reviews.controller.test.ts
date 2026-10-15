import { HttpStatus, ParseIntPipe, RequestMethod } from "@nestjs/common";
import { HTTP_CODE_METADATA, METHOD_METADATA, PATH_METADATA, ROUTE_ARGS_METADATA } from "@nestjs/common/constants";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BeerReviewsController } from "@/modules/beers/beer-reviews.controller";
import { BeersService } from "@/modules/beers/beers.service";
import type { ReviewDto } from "@/modules/beers/dtos/review.dto";
import { ReviewsQueryDto } from "@/modules/beers/dtos/reviews-query.dto";
import { UpsertReviewDto } from "@/modules/beers/dtos/upsert-review.dto";
import { AvatarEnum } from "@/modules/users/enums/avatar.enum";

const REVIEW: ReviewDto = {
  id: 7,
  beerId: 4,
  authorId: 1,
  authorName: "Alice",
  authorAvatarColor: "#F59E0B",
  authorAvatar: AvatarEnum.HOP,
  rating: 4.5,
  text: "Superbe amertume",
  createdAt: "2026-03-01T10:00:00.000Z",
  updatedAt: "2026-03-01T10:00:00.000Z",
  isMine: true,
};

describe("BeerReviewsController", () => {
  const service = { saveMyReview: vi.fn(), deleteMyReview: vi.fn(), getReviewPage: vi.fn() };

  const buildController = async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [BeerReviewsController],
      providers: [{ provide: BeersService, useValue: service }],
    }).compile();
    return moduleRef.get(BeerReviewsController);
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("saves the review of the current user on the beer of the route and answers what the service answers", async () => {
    service.saveMyReview.mockResolvedValue(REVIEW);
    const controller = await buildController();
    const dto = { rating: 4.5, text: "Superbe amertume", sweetness: 2 };

    expect(await controller.saveMine(1, 4, dto)).toEqual(REVIEW);
    expect(service.saveMyReview).toHaveBeenCalledExactlyOnceWith(1, 4, dto);
  });

  it("is mounted on PUT beers/:beerId/reviews/me and declares 200", async () => {
    expect(Reflect.getMetadata(PATH_METADATA, BeerReviewsController)).toBe("beers/:beerId/reviews");
    expect(Reflect.getMetadata(PATH_METADATA, BeerReviewsController.prototype.saveMine)).toBe("me");
    expect(Reflect.getMetadata(METHOD_METADATA, BeerReviewsController.prototype.saveMine)).toBe(RequestMethod.PUT);
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, BeerReviewsController.prototype.saveMine)).toBe(HttpStatus.OK);
  });

  it("binds the beer id through a ParseIntPipe and the body as an UpsertReviewDto", async () => {
    const args: Record<string, { data?: string; pipes: unknown[] }> = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      BeerReviewsController,
      "saveMine",
    );
    const beerIdArg = Object.values(args).find((arg) => arg.data === "beerId");

    expect(beerIdArg?.pipes).toEqual([ParseIntPipe]);
    expect(Reflect.getMetadata("design:paramtypes", BeerReviewsController.prototype, "saveMine")).toEqual([
      Number,
      Number,
      UpsertReviewDto,
    ]);
  });

  it("deletes the review of the current user on the beer of the route and answers nothing", async () => {
    service.deleteMyReview.mockResolvedValue(undefined);
    const controller = await buildController();

    expect(await controller.removeMine(1, 4)).toBeUndefined();
    expect(service.deleteMyReview).toHaveBeenCalledExactlyOnceWith(1, 4);
  });

  it("is mounted on DELETE beers/:beerId/reviews/me and declares 204", async () => {
    expect(Reflect.getMetadata(PATH_METADATA, BeerReviewsController.prototype.removeMine)).toBe("me");
    expect(Reflect.getMetadata(METHOD_METADATA, BeerReviewsController.prototype.removeMine)).toBe(RequestMethod.DELETE);
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, BeerReviewsController.prototype.removeMine)).toBe(HttpStatus.NO_CONTENT);
  });

  it("binds the beer id of the delete route through a ParseIntPipe", async () => {
    const args: Record<string, { data?: string; pipes: unknown[] }> = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      BeerReviewsController,
      "removeMine",
    );
    const beerIdArg = Object.values(args).find((arg) => arg.data === "beerId");

    expect(beerIdArg?.pipes).toEqual([ParseIntPipe]);
    expect(Reflect.getMetadata("design:paramtypes", BeerReviewsController.prototype, "removeMine")).toEqual([Number, Number]);
  });

  it("reads the review page of the current user on the beer of the route and answers what the service answers", async () => {
    const page = { mine: null, items: [REVIEW], total: 1, page: 2, size: 10 };
    service.getReviewPage.mockResolvedValue(page);
    const controller = await buildController();
    const query = { page: 2 };

    expect(await controller.getPage(1, 4, query)).toEqual(page);
    expect(service.getReviewPage).toHaveBeenCalledExactlyOnceWith(1, 4, query);
  });

  it("is mounted on GET beers/:beerId/reviews and declares 200", async () => {
    expect(Reflect.getMetadata(PATH_METADATA, BeerReviewsController.prototype.getPage)).toBe("/");
    expect(Reflect.getMetadata(METHOD_METADATA, BeerReviewsController.prototype.getPage)).toBe(RequestMethod.GET);
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, BeerReviewsController.prototype.getPage)).toBe(HttpStatus.OK);
  });

  it("binds the beer id through a ParseIntPipe and the query as a ReviewsQueryDto", async () => {
    const args: Record<string, { data?: string; pipes: unknown[] }> = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      BeerReviewsController,
      "getPage",
    );
    const beerIdArg = Object.values(args).find((arg) => arg.data === "beerId");

    expect(beerIdArg?.pipes).toEqual([ParseIntPipe]);
    expect(Reflect.getMetadata("design:paramtypes", BeerReviewsController.prototype, "getPage")).toEqual([
      Number,
      Number,
      ReviewsQueryDto,
    ]);
  });
});
