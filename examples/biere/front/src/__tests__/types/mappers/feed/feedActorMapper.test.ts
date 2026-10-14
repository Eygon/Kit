import type { FeedActorDto } from "@/types/dtos/feed/feedActorDto";
import { AvatarEnum } from "@/types/enums/user/avatarEnum";
import { LevelTitleEnum } from "@/types/enums/user/levelTitleEnum";
import { feedActorDtoToModel } from "@/types/mappers/feed/feedActorMapper";

const actorDto: FeedActorDto = { id: 3, displayName: "Carol", avatar: "glass", level: 4, title: "finePalate" };

describe("feedActorDtoToModel", () => {
  it("maps every field of a known actor", () => {
    expect(feedActorDtoToModel(actorDto)).toEqual({
      id: 3,
      displayName: "Carol",
      avatar: AvatarEnum.GLASS,
      level: 4,
      title: LevelTitleEnum.FINE_PALATE,
    });
  });

  it("falls back to the hop avatar for an unknown avatar", () => {
    expect(feedActorDtoToModel({ ...actorDto, avatar: "dragon" }).avatar).toBe(AvatarEnum.HOP);
  });

  it("falls back to the curious title for an unknown title", () => {
    expect(feedActorDtoToModel({ ...actorDto, title: "legend" }).title).toBe(LevelTitleEnum.CURIOUS);
  });

  it("falls back on both when avatar and title are missing", () => {
    const partial = { id: 3, displayName: "Carol", level: 1 } as unknown as FeedActorDto;

    expect(feedActorDtoToModel(partial)).toEqual({
      id: 3,
      displayName: "Carol",
      avatar: AvatarEnum.HOP,
      level: 1,
      title: LevelTitleEnum.CURIOUS,
    });
  });

  it("keeps falsy but valid values", () => {
    const model = feedActorDtoToModel({ ...actorDto, id: 0, displayName: "", level: 0 });

    expect(model.id).toBe(0);
    expect(model.displayName).toBe("");
    expect(model.level).toBe(0);
  });
});
