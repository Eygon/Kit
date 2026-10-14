import { HttpStatus, RequestMethod } from "@nestjs/common";
import { HTTP_CODE_METADATA, METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BadgesController } from "@/modules/profile/badges.controller";
import type { BadgeDto } from "@/modules/profile/dtos/badge.dto";
import { BadgeKindEnum } from "@/modules/profile/enums/badge-kind.enum";
import { ProfileService } from "@/modules/profile/profile.service";

const BADGES: BadgeDto[] = [
  {
    id: "firstSip",
    kind: BadgeKindEnum.FIRST_SIP,
    family: null,
    unlocked: true,
    unlockedAt: "2026-03-14T18:30:00.000Z",
    current: 1,
    target: 1,
    comingSoon: false,
  },
];

describe("BadgesController", () => {
  const service = { getBadges: vi.fn() };

  const buildController = async (): Promise<BadgesController> => {
    const moduleRef = await Test.createTestingModule({
      controllers: [BadgesController],
      providers: [{ provide: ProfileService, useValue: service }],
    }).compile();
    return moduleRef.get(BadgesController);
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("is mounted on me/badges and answers GET on the root with 200", () => {
    expect(Reflect.getMetadata(PATH_METADATA, BadgesController)).toBe("me/badges");
    expect(Reflect.getMetadata(PATH_METADATA, BadgesController.prototype.getAll)).toBe("/");
    expect(Reflect.getMetadata(METHOD_METADATA, BadgesController.prototype.getAll)).toBe(RequestMethod.GET);
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, BadgesController.prototype.getAll)).toBe(HttpStatus.OK);
  });

  it("returns the badges of the current user", async () => {
    service.getBadges.mockResolvedValue(BADGES);
    const controller = await buildController();

    await expect(controller.getAll(4)).resolves.toBe(BADGES);
    expect(service.getBadges).toHaveBeenCalledExactlyOnceWith(4);
  });
});
