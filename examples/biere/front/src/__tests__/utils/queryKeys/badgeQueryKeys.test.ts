import { badgeKeys } from "@/utils/queryKeys/badgeQueryKeys";

describe("badgeKeys", () => {
  it("roots every badge key under all", () => {
    expect(badgeKeys.all()).toEqual(["badges"]);
    expect(badgeKeys.me().slice(0, 1)).toEqual(badgeKeys.all());
  });

  it("gives the current user badges their own stable key", () => {
    expect(badgeKeys.me()).toEqual(["badges", "me"]);
    expect(badgeKeys.me()).toEqual(badgeKeys.me());
    expect(badgeKeys.me()).not.toEqual(badgeKeys.all());
  });
});
