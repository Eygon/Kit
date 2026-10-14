import { AVATAR_LABEL_KEYS, AVATAR_OPTIONS, AvatarEnum, DEFAULT_AVATAR, isAvatar } from "@/types/enums/user/avatarEnum";

const CONTRACT_IDS = ["hop", "malt", "glass", "mug", "bottle", "can", "barrel", "tap", "cap", "foam", "wheat", "pretzel"] as AvatarEnum[];

describe("avatarEnum", () => {
  it("lists the twelve contract identifiers in order", () => {
    expect(Object.values(AvatarEnum)).toEqual(CONTRACT_IDS);
  });

  it("maps every avatar to its own label key", () => {
    expect(Object.keys(AVATAR_LABEL_KEYS)).toEqual(CONTRACT_IDS);
    CONTRACT_IDS.forEach((id) => expect(AVATAR_LABEL_KEYS[id]).toBe(`avatar.names.${id}`));
  });

  it("offers one option per avatar with its label key", () => {
    expect(AVATAR_OPTIONS).toEqual(CONTRACT_IDS.map((id) => ({ id, labelKey: `avatar.names.${id}` })));
  });

  it("recognises only the twelve identifiers", () => {
    CONTRACT_IDS.forEach((id) => expect(isAvatar(id)).toBe(true));
    [null, undefined, 3, "", "HOP", "unicorn"].forEach((value) => expect(isAvatar(value)).toBe(false));
  });

  it("defaults to the hop", () => {
    expect(DEFAULT_AVATAR).toBe(AvatarEnum.HOP);
  });
});
