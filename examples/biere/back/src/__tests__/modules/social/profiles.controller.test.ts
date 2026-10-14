import { HttpStatus, ParseIntPipe, RequestMethod } from "@nestjs/common";
import { HTTP_CODE_METADATA, METHOD_METADATA, PATH_METADATA, ROUTE_ARGS_METADATA } from "@nestjs/common/constants";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfilesController } from "@/modules/social/profiles.controller";
import { SocialService } from "@/modules/social/social.service";
import type { ProfileDto } from "@/modules/social/dtos/profile.dto";
import type { ProfileSummaryDto } from "@/modules/social/dtos/profile-summary.dto";

const PROFILE: ProfileDto = {
  id: 2,
  displayName: "Bob",
  avatar: "malt" as ProfileDto["avatar"],
  level: 1,
  title: "curious" as ProfileDto["title"],
  discoveredCount: 3,
  currentThreshold: 0,
  nextThreshold: 5,
  nextTitle: "taster" as ProfileDto["nextTitle"],
  followerCount: 0,
  followingCount: 0,
  isFollowed: false,
  isMe: false,
};

const SUMMARIES: ProfileSummaryDto[] = [
  {
    id: 2,
    displayName: "Bob",
    avatar: "malt" as ProfileSummaryDto["avatar"],
    level: 1,
    title: "curious" as ProfileSummaryDto["title"],
    discoveredCount: 3,
    isFollowed: true,
    isMe: false,
  },
];

const routeUserIdPipes = (handler: string): unknown[] | undefined => {
  const args: Record<string, { data?: string; pipes: unknown[] }> = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    ProfilesController,
    handler,
  );
  return Object.values(args).find((arg) => arg.data === "userId")?.pipes;
};

describe("ProfilesController", () => {
  const service = {
    getProfile: vi.fn(),
    getProfiles: vi.fn(),
    getFollowers: vi.fn(),
    getFollowing: vi.fn(),
    follow: vi.fn(),
    unfollow: vi.fn(),
  };

  const buildController = async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProfilesController],
      providers: [{ provide: SocialService, useValue: service }],
    }).compile();
    return moduleRef.get(ProfilesController);
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("reads the profile of the route user for the current user and answers what the service answers", async () => {
    service.getProfile.mockResolvedValue(PROFILE);
    const controller = await buildController();

    expect(await controller.getProfile(1, 2)).toEqual(PROFILE);
    expect(service.getProfile).toHaveBeenCalledExactlyOnceWith(1, 2);
  });

  it("is mounted on GET users/:userId/profile and declares 200", () => {
    expect(Reflect.getMetadata(PATH_METADATA, ProfilesController)).toBe("users");
    expect(Reflect.getMetadata(PATH_METADATA, ProfilesController.prototype.getProfile)).toBe(":userId/profile");
    expect(Reflect.getMetadata(METHOD_METADATA, ProfilesController.prototype.getProfile)).toBe(RequestMethod.GET);
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, ProfilesController.prototype.getProfile)).toBe(HttpStatus.OK);
  });

  it("binds the user id of the route through a ParseIntPipe", () => {
    const args: Record<string, { data?: string; pipes: unknown[] }> = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      ProfilesController,
      "getProfile",
    );
    const userIdArg = Object.values(args).find((arg) => arg.data === "userId");

    expect(userIdArg?.pipes).toEqual([ParseIntPipe]);
    expect(Reflect.getMetadata("design:paramtypes", ProfilesController.prototype, "getProfile")).toEqual([
      Number,
      Number,
    ]);
  });

  it("lists the profiles for the current user and answers what the service answers", async () => {
    service.getProfiles.mockResolvedValue(SUMMARIES);
    const controller = await buildController();

    expect(await controller.getAll(1)).toBe(SUMMARIES);
    expect(service.getProfiles).toHaveBeenCalledExactlyOnceWith(1);
  });

  it("lists the followers and the following of the route user for the current user", async () => {
    service.getFollowers.mockResolvedValue(SUMMARIES);
    service.getFollowing.mockResolvedValue([]);
    const controller = await buildController();

    expect(await controller.getFollowers(1, 3)).toBe(SUMMARIES);
    expect(await controller.getFollowing(1, 3)).toEqual([]);
    expect(service.getFollowers).toHaveBeenCalledExactlyOnceWith(1, 3);
    expect(service.getFollowing).toHaveBeenCalledExactlyOnceWith(1, 3);
  });

  it("follows the route user for the current user and answers the profile the service answers", async () => {
    service.follow.mockResolvedValue(PROFILE);
    const controller = await buildController();

    expect(await controller.follow(1, 2)).toBe(PROFILE);
    expect(service.follow).toHaveBeenCalledExactlyOnceWith(1, 2);
  });

  it("unfollows the route user for the current user and answers nothing", async () => {
    service.unfollow.mockResolvedValue(undefined);
    const controller = await buildController();

    expect(await controller.unfollow(1, 2)).toBeUndefined();
    expect(service.unfollow).toHaveBeenCalledExactlyOnceWith(1, 2);
  });

  it.each([
    ["getAll", "", RequestMethod.GET, HttpStatus.OK],
    ["getFollowers", ":userId/followers", RequestMethod.GET, HttpStatus.OK],
    ["getFollowing", ":userId/following", RequestMethod.GET, HttpStatus.OK],
    ["follow", ":userId/follow", RequestMethod.POST, HttpStatus.CREATED],
    ["unfollow", ":userId/follow", RequestMethod.DELETE, HttpStatus.NO_CONTENT],
  ] as const)("mounts %s on %s with its method and declares its status", (handler, path, method, status) => {
    const target = ProfilesController.prototype[handler];

    expect(Reflect.getMetadata(PATH_METADATA, target)).toBe(path === "" ? "/" : path);
    expect(Reflect.getMetadata(METHOD_METADATA, target)).toBe(method);
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, target)).toBe(status);
  });

  it.each(["getFollowers", "getFollowing", "follow", "unfollow"])("binds the user id of %s through a ParseIntPipe", (handler) => {
    expect(routeUserIdPipes(handler)).toEqual([ParseIntPipe]);
  });
});
