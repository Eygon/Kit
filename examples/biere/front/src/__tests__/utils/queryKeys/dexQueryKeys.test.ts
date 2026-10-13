import { dexKeys } from "@/utils/queryKeys/dexQueryKeys";

describe("dexKeys", () => {
  it("roots every dex key under all", () => {
    expect(dexKeys.all()).toEqual(["dex"]);
    expect(dexKeys.me().slice(0, 1)).toEqual(dexKeys.all());
  });

  it("gives the current user dex its own stable key", () => {
    expect(dexKeys.me()).toEqual(["dex", "me"]);
    expect(dexKeys.me()).toEqual(dexKeys.me());
    expect(dexKeys.me()).not.toEqual(dexKeys.all());
  });
});
