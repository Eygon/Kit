import { describe, expect, it } from "vitest";
import { AvatarEnum } from "@/modules/users/enums/avatar.enum";
import { User } from "@/modules/users/entities/user.entity";
import { UpdateProfileDto } from "@/modules/users/dtos/update-profile.dto";
import { toProfileChanges, toUserDto } from "@/modules/users/mappers/user.mapper";

describe("toUserDto", () => {
  it("copies only the public fields of the entity", () => {
    const entity = Object.assign(new User(), { id: 2, displayName: "Bob", avatarColor: "#10B981", avatar: AvatarEnum.MALT, extra: "x" });

    expect(toUserDto(entity)).toEqual({ id: 2, displayName: "Bob", avatarColor: "#10B981", avatar: "malt" });
  });
});

describe("toProfileChanges", () => {
  it("trims the display name and keeps the avatar, listing only those two fields", () => {
    const dto = Object.assign(new UpdateProfileDto(), { displayName: "  Alice B  ", avatar: AvatarEnum.FOAM, id: 9 });

    expect(toProfileChanges(dto)).toEqual({ displayName: "Alice B", avatar: "foam" });
  });
});
