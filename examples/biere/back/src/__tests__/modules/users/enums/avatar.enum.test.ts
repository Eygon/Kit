import { describe, expect, it } from "vitest";
import { AvatarEnum, isAvatar } from "@/modules/users/enums/avatar.enum";

describe("AvatarEnum", () => {
  it("lists the twelve avatars in order", () => {
    expect(Object.entries(AvatarEnum)).toEqual([
      ["HOP", "hop"],
      ["MALT", "malt"],
      ["GLASS", "glass"],
      ["MUG", "mug"],
      ["BOTTLE", "bottle"],
      ["CAN", "can"],
      ["BARREL", "barrel"],
      ["TAP", "tap"],
      ["CAP", "cap"],
      ["FOAM", "foam"],
      ["WHEAT", "wheat"],
      ["PRETZEL", "pretzel"],
    ]);
  });
});

describe("isAvatar", () => {
  it.each(Object.values(AvatarEnum))("accepts %s", (value) => {
    expect(isAvatar(value)).toBe(true);
  });

  it.each(["", "HOP", "beer", " hop", "hop "])("rejects %j", (value) => {
    expect(isAvatar(value)).toBe(false);
  });

  it.each([undefined, null, 1, {}])("rejects the non string %j", (value) => {
    expect(isAvatar(value)).toBe(false);
  });
});
