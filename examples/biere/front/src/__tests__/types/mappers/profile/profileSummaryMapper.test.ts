import type { ProfileSummaryDto } from "@/types/dtos/profile/profileSummaryDto";
import { AvatarEnum } from "@/types/enums/user/avatarEnum";
import { LevelTitleEnum } from "@/types/enums/user/levelTitleEnum";
import { profileSummaryDtoToModel } from "@/types/mappers/profile/profileSummaryMapper";

const dto: ProfileSummaryDto = {
  id: 2,
  displayName: "Bob",
  avatar: "glass",
  level: 2,
  title: "taster",
  discoveredCount: 12,
  isFollowed: true,
  isMe: false,
};

describe("profileSummaryDtoToModel", () => {
  it("maps every field of a known summary", () => {
    expect(profileSummaryDtoToModel(dto)).toEqual({
      id: 2,
      displayName: "Bob",
      avatar: AvatarEnum.GLASS,
      level: 2,
      title: LevelTitleEnum.TASTER,
      discoveredCount: 12,
      isFollowed: true,
      isMe: false,
    });
  });

  it("falls back to the hop avatar for an unknown avatar", () => {
    expect(profileSummaryDtoToModel({ ...dto, avatar: "dragon" }).avatar).toBe(AvatarEnum.HOP);
  });

  it("falls back to the curious title for an unknown title", () => {
    expect(profileSummaryDtoToModel({ ...dto, title: "legend" }).title).toBe(LevelTitleEnum.CURIOUS);
  });

  it("applies the defaults when counters and flags are missing", () => {
    const partial = { id: 3, displayName: "Carol", avatar: "malt", level: 1, title: "curious" } as ProfileSummaryDto;

    expect(profileSummaryDtoToModel(partial)).toEqual({
      id: 3,
      displayName: "Carol",
      avatar: AvatarEnum.MALT,
      level: 1,
      title: LevelTitleEnum.CURIOUS,
      discoveredCount: 0,
      isFollowed: false,
      isMe: false,
    });
  });

  it("applies the defaults on null counters and flags", () => {
    const nulls = { ...dto, discoveredCount: null, isFollowed: null, isMe: null } as unknown as ProfileSummaryDto;

    const model = profileSummaryDtoToModel(nulls);

    expect(model.discoveredCount).toBe(0);
    expect(model.isFollowed).toBe(false);
    expect(model.isMe).toBe(false);
  });

  it("keeps falsy but valid values", () => {
    const model = profileSummaryDtoToModel({ ...dto, discoveredCount: 0, level: 0, isFollowed: false, displayName: "" });

    expect(model.discoveredCount).toBe(0);
    expect(model.level).toBe(0);
    expect(model.isFollowed).toBe(false);
    expect(model.displayName).toBe("");
  });
});
