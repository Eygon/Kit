import { formValuesToProfileChanges, isDisplayNameValid, profileToFormValues } from "@/pages/profile/utils/profileFormValues";
import { AvatarEnum } from "@/types/enums/user/avatarEnum";
import { LevelTitleEnum } from "@/types/enums/user/levelTitleEnum";
import type { Profile } from "@/types/models/profile/profile";

const ALICE: Profile = {
  id: 1,
  displayName: "Alice",
  avatar: AvatarEnum.MALT,
  level: 2,
  title: LevelTitleEnum.TASTER,
  discoveredCount: 12,
  currentThreshold: 5,
  nextThreshold: 15,
  nextTitle: LevelTitleEnum.HOP_HEAD,
  followerCount: 3,
  followingCount: 2,
  isFollowed: false,
  isMe: true,
};

describe("profileToFormValues", () => {
  it("keeps only the editable fields of the profile", () => {
    expect(profileToFormValues(ALICE)).toEqual({ displayName: "Alice", avatar: "malt" });
  });
});

describe("formValuesToProfileChanges", () => {
  it("gives the name and the avatar of the form", () => {
    expect(formValuesToProfileChanges({ displayName: "Alice B", avatar: AvatarEnum.FOAM })).toEqual({
      displayName: "Alice B",
      avatar: "foam",
    });
  });
});

describe("isDisplayNameValid", () => {
  it.each([
    ["Al", true],
    ["  Al  ", true],
    ["a".repeat(24), true],
    ["  " + "a".repeat(24) + "  ", true],
    ["A", false],
    ["  A  ", false],
    ["", false],
    ["     ", false],
    ["a".repeat(25), false],
    ["  " + "a".repeat(25) + "  ", false],
  ])("judges %j after the trim: %s", (name, expected) => {
    expect(isDisplayNameValid(name)).toBe(expected);
  });
});
