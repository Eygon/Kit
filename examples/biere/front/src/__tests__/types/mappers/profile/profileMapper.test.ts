import type { ProfileDto } from "@/types/dtos/profile/profileDto";
import { AvatarEnum } from "@/types/enums/user/avatarEnum";
import { LevelTitleEnum } from "@/types/enums/user/levelTitleEnum";
import { profileDtoToModel } from "@/types/mappers/profile/profileMapper";

const dto: ProfileDto = {
  id: 1,
  displayName: "Alice",
  avatar: "glass",
  level: 2,
  title: "taster",
  discoveredCount: 12,
  currentThreshold: 5,
  nextThreshold: 15,
  nextTitle: "hopHead",
  followerCount: 0,
  followingCount: 2,
  isFollowed: false,
  isMe: true,
};

describe("profileDtoToModel", () => {
  it("maps every field of a known profile", () => {
    expect(profileDtoToModel(dto)).toEqual({
      id: 1,
      displayName: "Alice",
      avatar: AvatarEnum.GLASS,
      level: 2,
      title: LevelTitleEnum.TASTER,
      discoveredCount: 12,
      currentThreshold: 5,
      nextThreshold: 15,
      nextTitle: LevelTitleEnum.HOP_HEAD,
      followerCount: 0,
      followingCount: 2,
      isFollowed: false,
      isMe: true,
    });
  });

  it("falls back to the hop avatar for an unknown avatar", () => {
    expect(profileDtoToModel({ ...dto, avatar: "dragon" }).avatar).toBe(AvatarEnum.HOP);
  });

  it("falls back to the curious title for an unknown title", () => {
    expect(profileDtoToModel({ ...dto, title: "legend" }).title).toBe(LevelTitleEnum.CURIOUS);
  });

  it("drops an unknown next title to null and keeps its threshold", () => {
    const model = profileDtoToModel({ ...dto, nextTitle: "legend" });

    expect(model.nextTitle).toBeNull();
    expect(model.nextThreshold).toBe(15);
  });

  it("keeps a null next threshold and next title", () => {
    const model = profileDtoToModel({ ...dto, level: 6, title: "foamLegend", nextThreshold: null, nextTitle: null });

    expect(model.nextThreshold).toBeNull();
    expect(model.nextTitle).toBeNull();
  });

  it("turns missing optional values into defaults", () => {
    const partial = { id: 1, displayName: "Alice", level: 1 } as unknown as ProfileDto;

    expect(profileDtoToModel(partial)).toEqual({
      id: 1,
      displayName: "Alice",
      avatar: AvatarEnum.HOP,
      level: 1,
      title: LevelTitleEnum.CURIOUS,
      discoveredCount: 0,
      currentThreshold: 0,
      nextThreshold: null,
      nextTitle: null,
      followerCount: 0,
      followingCount: 0,
      isFollowed: false,
      isMe: false,
    });
  });

  it("keeps falsy but valid values", () => {
    const model = profileDtoToModel({ ...dto, id: 0, displayName: "", discoveredCount: 0, currentThreshold: 0, nextThreshold: 0 });

    expect(model.id).toBe(0);
    expect(model.displayName).toBe("");
    expect(model.discoveredCount).toBe(0);
    expect(model.currentThreshold).toBe(0);
    expect(model.nextThreshold).toBe(0);
  });

  it("keeps the follow flags true", () => {
    const model = profileDtoToModel({ ...dto, isFollowed: true, isMe: false });

    expect(model.isFollowed).toBe(true);
    expect(model.isMe).toBe(false);
  });
});
