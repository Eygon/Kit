import { beerKeys } from "@/utils/queryKeys/beerQueryKeys";
import { beerStyleKeys } from "@/utils/queryKeys/beerStyleQueryKeys";
import { breweryKeys } from "@/utils/queryKeys/breweryQueryKeys";

describe("breweryKeys", () => {
  it("roots every key under all", () => {
    expect(breweryKeys.all()).toEqual(["breweries"]);
    expect(breweryKeys.list().slice(0, 1)).toEqual(breweryKeys.all());
  });

  it("builds the list key under the root", () => {
    expect(breweryKeys.list()).toEqual(["breweries", "list"]);
  });

  it("never collides with a beer or a beer style key", () => {
    expect(breweryKeys.all()).not.toEqual(beerKeys.all());
    expect(breweryKeys.all()).not.toEqual(beerStyleKeys.all());
    expect(breweryKeys.list()[0]).not.toBe(beerKeys.all()[0]);
  });
});
