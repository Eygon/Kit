import { AvatarEnum } from "@/types/enums/user/avatarEnum";
import { buildSaveProfileDto } from "@/types/mappers/profile/saveProfileMapper";

describe("buildSaveProfileDto", () => {
  it("keeps the avatar and a clean name as they are", () => {
    expect(buildSaveProfileDto({ displayName: "Alice B", avatar: AvatarEnum.FOAM })).toEqual({
      displayName: "Alice B",
      avatar: "foam",
    });
  });

  it("trims the spaces around the name only", () => {
    expect(buildSaveProfileDto({ displayName: "  Alice  B \t", avatar: AvatarEnum.HOP })).toEqual({
      displayName: "Alice  B",
      avatar: "hop",
    });
  });

  it("keeps an empty name empty instead of inventing a default", () => {
    expect(buildSaveProfileDto({ displayName: "   ", avatar: AvatarEnum.MUG })).toEqual({ displayName: "", avatar: "mug" });
  });
});
