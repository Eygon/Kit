import { describe, expect, it } from "vitest";
import { ALICE_USER_ID, BOB_USER_ID, CAROL_USER_ID, SEED_USERS } from "@/database/seed.constants";

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
});
