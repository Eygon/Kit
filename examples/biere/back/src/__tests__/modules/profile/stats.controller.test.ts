import { HttpStatus, RequestMethod } from "@nestjs/common";
import { HTTP_CODE_METADATA, METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";
import type { StatsDto } from "@/modules/profile/dtos/stats.dto";
import { ProfileService } from "@/modules/profile/profile.service";
import { StatsController } from "@/modules/profile/stats.controller";

const STATS: StatsDto = {
  checkinCount: 3,
  discoveredCount: 2,
  averageAbv: 5.6,
  countries: [{ country: "BE", count: 1 }],
  favoriteFamily: BeerFamilyEnum.TRAPPIST,
  averageRating: 4.5,
  currentStreak: 2,
  bestStreak: 5,
  monthlyCheckins: [{ month: "2026-03", count: 3 }],
};

describe("StatsController", () => {
  const service = { getStats: vi.fn() };

  const buildController = async (): Promise<StatsController> => {
    const moduleRef = await Test.createTestingModule({
      controllers: [StatsController],
      providers: [{ provide: ProfileService, useValue: service }],
    }).compile();
    return moduleRef.get(StatsController);
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("is mounted on me/stats and answers GET on the root with 200", () => {
    expect(Reflect.getMetadata(PATH_METADATA, StatsController)).toBe("me/stats");
    expect(Reflect.getMetadata(PATH_METADATA, StatsController.prototype.get)).toBe("/");
    expect(Reflect.getMetadata(METHOD_METADATA, StatsController.prototype.get)).toBe(RequestMethod.GET);
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, StatsController.prototype.get)).toBe(HttpStatus.OK);
  });

  it("returns the statistics of the current user", async () => {
    service.getStats.mockResolvedValue(STATS);
    const controller = await buildController();

    await expect(controller.get(4)).resolves.toBe(STATS);
    expect(service.getStats).toHaveBeenCalledExactlyOnceWith(4);
  });
});
