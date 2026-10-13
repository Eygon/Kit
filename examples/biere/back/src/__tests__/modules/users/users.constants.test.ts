import { describe, expect, it } from "vitest";
import { USER_AVATAR_COLOR_LENGTH, USER_DISPLAY_NAME_MAX_LENGTH } from "@/modules/users/users.constants";

describe("users constants", () => {
  it("bounds the display name and stores colors as #RRGGBB", () => {
    expect(USER_DISPLAY_NAME_MAX_LENGTH).toBe(50);
    expect(USER_AVATAR_COLOR_LENGTH).toBe("#RRGGBB".length);
  });
});
