import { statsKeys } from "@/utils/queryKeys/statsQueryKeys";

describe("statsKeys", () => {
  it("roots every stats key under all", () => {
    expect(statsKeys.all()).toEqual(["stats"]);
    expect(statsKeys.me().slice(0, 1)).toEqual(statsKeys.all());
  });

  it("gives the current user stats their own stable key", () => {
    expect(statsKeys.me()).toEqual(["stats", "me"]);
    expect(statsKeys.me()).toEqual(statsKeys.me());
    expect(statsKeys.me()).not.toEqual(statsKeys.all());
  });
});
