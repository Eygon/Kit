import { describe, expect, it } from "vitest";
import { AvatarEnum } from "@/modules/users/enums/avatar.enum";
import { DEFAULT_USER_AVATAR, USER_AVATAR_COLOR_LENGTH, USER_DISPLAY_NAME_MAX_LENGTH } from "@/modules/users/users.constants";

describe("users constants", () => {
  it("bounds the display name and stores colors as #RRGGBB", () => {
    expect(USER_DISPLAY_NAME_MAX_LENGTH).toBe(50);
    expect(USER_AVATAR_COLOR_LENGTH).toBe("#RRGGBB".length);
  });

  it("defaults the avatar to hop", () => {
    expect(DEFAULT_USER_AVATAR).toBe(AvatarEnum.HOP);
  });
});
