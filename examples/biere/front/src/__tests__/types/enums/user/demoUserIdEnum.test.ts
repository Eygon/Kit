import { DEFAULT_DEMO_USER_ID, DEMO_USER_OPTIONS, DemoUserIdEnum, isDemoUserId } from "@/types/enums/user/demoUserIdEnum";

describe("DemoUserIdEnum", () => {
  it("lists the three seeded users in id order", () => {
    expect(DEMO_USER_OPTIONS.map((option) => option.id)).toEqual([1, 2, 3]);
    expect(DEFAULT_DEMO_USER_ID).toBe(DemoUserIdEnum.ALICE);
  });

  it.each([1, 2, 3])("accepts the demo user %s", (value) => {
    expect(isDemoUserId(value)).toBe(true);
  });

  it.each([0, 4, -1, Number.NaN, "1", "ALICE", null, undefined])("rejects %s", (value) => {
    expect(isDemoUserId(value)).toBe(false);
  });
});
