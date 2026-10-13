import { describe, expect, it } from "vitest";
import { isVenueType, VenueTypeEnum } from "@/modules/venues/enums/venue-type.enum";

describe("VenueTypeEnum", () => {
  it("lists bar, shop and brewery", () => {
    expect(Object.values(VenueTypeEnum)).toEqual(["bar", "shop", "brewery"]);
  });

  it("recognises the three types and nothing else", () => {
    expect(["bar", "shop", "brewery"].every((value) => isVenueType(value))).toBe(true);
    expect(["cave", "Bar", "", "toString"].some((value) => isVenueType(value))).toBe(false);
  });
});
