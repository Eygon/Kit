import { beerKeys } from "@/utils/queryKeys/beerQueryKeys";
import { beerStyleKeys } from "@/utils/queryKeys/beerStyleQueryKeys";

describe("beerStyleKeys", () => {
  it("roots every key under all", () => {
    expect(beerStyleKeys.all()).toEqual(["beer-styles"]);
    expect(beerStyleKeys.groups().slice(0, 1)).toEqual(beerStyleKeys.all());
  });

  it("builds the groups key under the root", () => {
    expect(beerStyleKeys.groups()).toEqual(["beer-styles", "groups"]);
  });

  it("never collides with a beer key", () => {
    expect(beerStyleKeys.all()).not.toEqual(beerKeys.all());
    expect(beerStyleKeys.groups()[0]).not.toBe(beerKeys.all()[0]);
  });
});
