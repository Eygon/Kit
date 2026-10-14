import { getMetadataArgsStorage } from "typeorm";
import { describe, expect, it } from "vitest";
import { AvatarEnum } from "@/modules/users/enums/avatar.enum";
import { DEFAULT_USER_AVATAR } from "@/modules/users/users.constants";
import { User } from "@/modules/users/entities/user.entity";

describe("User entity", () => {
  it("maps to the users table", () => {
    const table = getMetadataArgsStorage().tables.find((entry) => entry.target === User);

    expect(table?.name).toBe("users");
  });

  it("maps a generated id, a bounded display name, an avatar color and an avatar", () => {
    const columns = getMetadataArgsStorage()
      .filterColumns(User)
      .map((column) => [column.propertyName, column.mode, column.options.length]);

    expect(columns).toEqual([
      ["id", "regular", undefined],
      ["displayName", "regular", 50],
      ["avatarColor", "regular", 7],
      ["avatar", "regular", undefined],
    ]);
    expect(getMetadataArgsStorage().generations.find((entry) => entry.target === User)?.propertyName).toBe("id");
  });

  it("stores the avatar as a simple enum defaulting to hop", () => {
    const column = getMetadataArgsStorage()
      .filterColumns(User)
      .find((entry) => entry.propertyName === "avatar");

    expect(column?.options).toEqual({ type: "simple-enum", enum: AvatarEnum, default: DEFAULT_USER_AVATAR });
    expect(DEFAULT_USER_AVATAR).toBe(AvatarEnum.HOP);
  });
});
