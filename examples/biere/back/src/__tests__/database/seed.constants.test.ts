import { describe, expect, it } from "vitest";
import { AvatarEnum } from "@/modules/users/enums/avatar.enum";
import { ALICE_USER_ID, BOB_USER_ID, CAROL_USER_ID, DEMO_CHECKIN_USER_IDS, SEED_DEMO_FOLLOWS, SEED_USERS } from "@/database/seed.constants";

describe("seed constants", () => {
  it("seeds Alice, Bob and Carol with ids 1 to 3", () => {
    expect([ALICE_USER_ID, BOB_USER_ID, CAROL_USER_ID]).toEqual([1, 2, 3]);
    expect(SEED_USERS.map((user) => [user.id, user.displayName])).toEqual([
      [1, "Alice"],
      [2, "Bob"],
      [3, "Carol"],
    ]);
  });

  it("gives every seeded user a hex avatar color", () => {
    for (const user of SEED_USERS) {
      expect(user.avatarColor).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it("gives Alice the hop, Bob the malt and Carol the glass as avatar", () => {
    expect(SEED_USERS.map((user) => [user.id, user.avatar])).toEqual([
      [ALICE_USER_ID, AvatarEnum.HOP],
      [BOB_USER_ID, AvatarEnum.MALT],
      [CAROL_USER_ID, AvatarEnum.GLASS],
    ]);
  });

  it("makes Alice follow Bob and Carol in the demo", () => {
    expect(SEED_DEMO_FOLLOWS).toEqual([
      { followerId: ALICE_USER_ID, followedId: BOB_USER_ID },
      { followerId: ALICE_USER_ID, followedId: CAROL_USER_ID },
    ]);
  });

  it("gives the demo tastings to Bob and Carol only", () => {
    expect(DEMO_CHECKIN_USER_IDS).toEqual([BOB_USER_ID, CAROL_USER_ID]);
  });
});
