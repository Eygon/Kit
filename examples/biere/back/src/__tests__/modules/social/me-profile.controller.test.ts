import { HttpStatus, RequestMethod } from "@nestjs/common";
import { HTTP_CODE_METADATA, METHOD_METADATA, PATH_METADATA, ROUTE_ARGS_METADATA } from "@nestjs/common/constants";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MeProfileController } from "@/modules/social/me-profile.controller";
import { SocialService } from "@/modules/social/social.service";
import type { ProfileDto } from "@/modules/social/dtos/profile.dto";
import { UpdateProfileDto } from "@/modules/users/dtos/update-profile.dto";
import { AvatarEnum } from "@/modules/users/enums/avatar.enum";

const PROFILE: ProfileDto = {
  id: 1,
  displayName: "Alice B",
  avatar: AvatarEnum.FOAM,
  level: 1,
  title: "curious" as ProfileDto["title"],
  discoveredCount: 3,
  currentThreshold: 0,
  nextThreshold: 5,
  nextTitle: "taster" as ProfileDto["nextTitle"],
  followerCount: 0,
  followingCount: 0,
  isFollowed: false,
  isMe: true,
};

describe("MeProfileController", () => {
  const service = { updateMyProfile: vi.fn() };

  const buildController = async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [MeProfileController],
      providers: [{ provide: SocialService, useValue: service }],
    }).compile();
    return moduleRef.get(MeProfileController);
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("updates the profile of the current user and answers what the service answers", async () => {
    service.updateMyProfile.mockResolvedValue(PROFILE);
    const dto = Object.assign(new UpdateProfileDto(), { displayName: "Alice B", avatar: AvatarEnum.FOAM });
    const controller = await buildController();

    expect(await controller.update(1, dto)).toEqual(PROFILE);
    expect(service.updateMyProfile).toHaveBeenCalledExactlyOnceWith(1, dto);
  });

  it("is mounted on PUT me/profile and declares 200", () => {
    expect(Reflect.getMetadata(PATH_METADATA, MeProfileController)).toBe("me/profile");
    expect(Reflect.getMetadata(METHOD_METADATA, MeProfileController.prototype.update)).toBe(RequestMethod.PUT);
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, MeProfileController.prototype.update)).toBe(HttpStatus.OK);
  });

  it("binds the body to the UpdateProfileDto", () => {
    const args: Record<string, { data?: string }> = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      MeProfileController,
      "update",
    );

    expect(Object.keys(args)).toHaveLength(2);
    expect(Reflect.getMetadata("design:paramtypes", MeProfileController.prototype, "update")).toEqual([
      Number,
      UpdateProfileDto,
    ]);
  });
});
