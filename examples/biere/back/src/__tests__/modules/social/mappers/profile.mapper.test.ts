import { describe, expect, it } from "vitest";
import { LevelTitleEnum } from "@/modules/social/enums/level-title.enum";
import { toProfileDto, toProfileSummaryDto } from "@/modules/social/mappers/profile.mapper";
import type { LevelDto } from "@/modules/social/dtos/level.dto";
import type { UserDto } from "@/modules/users/dtos/user.dto";
import { AvatarEnum } from "@/modules/users/enums/avatar.enum";

const BOB: UserDto = { id: 2, displayName: "Bob", avatarColor: "#10B981", avatar: AvatarEnum.MALT };

const LEVEL: LevelDto = {
  level: 1,
  title: LevelTitleEnum.CURIOUS,
  discoveredCount: 3,
  currentThreshold: 0,
  nextThreshold: 5,
  nextTitle: LevelTitleEnum.TASTER,
};

describe("toProfileDto", () => {
  it("lists the profile fields one by one, with the avatar and without the avatar color", () => {
    expect(toProfileDto(BOB, LEVEL, { followerCount: 4, followingCount: 7 }, true, false)).toEqual({
      id: 2,
      displayName: "Bob",
      avatar: "malt",
      level: 1,
      title: "curious",
      discoveredCount: 3,
      currentThreshold: 0,
      nextThreshold: 5,
      nextTitle: "taster",
      followerCount: 4,
      followingCount: 7,
      isFollowed: true,
      isMe: false,
    });
  });

  it("keeps a null next threshold and next title at the top level", () => {
    const top: LevelDto = {
      level: 6,
      title: LevelTitleEnum.FOAM_LEGEND,
      discoveredCount: 120,
      currentThreshold: 100,
      nextThreshold: null,
      nextTitle: null,
    };

    expect(toProfileDto(BOB, top, { followerCount: 0, followingCount: 0 }, false, true)).toMatchObject({
      level: 6,
      nextThreshold: null,
      nextTitle: null,
      isFollowed: false,
      isMe: true,
    });
  });
});

describe("toProfileSummaryDto", () => {
  it("lists the summary fields one by one, without the avatar color nor the thresholds and the counts", () => {
    expect(toProfileSummaryDto(BOB, LEVEL, true, false)).toStrictEqual({
      id: 2,
      displayName: "Bob",
      avatar: "malt",
      level: 1,
      title: "curious",
      discoveredCount: 3,
      isFollowed: true,
      isMe: false,
    });
  });

  it("carries the isMe flag as given", () => {
    expect(toProfileSummaryDto(BOB, LEVEL, false, true)).toMatchObject({ isFollowed: false, isMe: true });
  });
});
