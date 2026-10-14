import { wishlistKeys } from "@/utils/queryKeys/wishlistQueryKeys";

describe("wishlistKeys", () => {
  it("roots every wishlist key under all", () => {
    expect(wishlistKeys.all()).toEqual(["wishlist"]);
    expect(wishlistKeys.me().slice(0, 1)).toEqual(wishlistKeys.all());
  });

  it("gives the current user wishlist its own stable key", () => {
    expect(wishlistKeys.me()).toEqual(["wishlist", "me"]);
    expect(wishlistKeys.me()).toEqual(wishlistKeys.me());
    expect(wishlistKeys.me()).not.toEqual(wishlistKeys.all());
  });
});
