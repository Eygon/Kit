import { reviewKeys } from "@/utils/queryKeys/reviewQueryKeys";

describe("reviewKeys", () => {
  it("roots every review key under all", async () => {

    expect(reviewKeys.all()).toEqual(["reviews"]);
    expect(reviewKeys.list(7).slice(0, 1)).toEqual(reviewKeys.all());
  });

  it("gives each beer its own stable list key", async () => {

    expect(reviewKeys.list(7)).toEqual(["reviews", "list", 7]);
    expect(reviewKeys.list(7)).toEqual(reviewKeys.list(7));
    expect(reviewKeys.list(7)).not.toEqual(reviewKeys.list(8));
  });
});
