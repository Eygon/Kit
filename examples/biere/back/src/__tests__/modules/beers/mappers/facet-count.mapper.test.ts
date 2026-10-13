import { describe, expect, it } from "vitest";
import { toFacetCountDto } from "@/modules/beers/mappers/facet-count.mapper";

describe("toFacetCountDto", () => {
  it("keeps the value and a numeric count", () => {
    expect(toFacetCountDto({ value: "trappist", count: 11 })).toEqual({ value: "trappist", count: 11 });
  });

  it("converts a count returned as a string into a number", () => {
    const dto = toFacetCountDto({ value: "BE", count: "9" });

    expect(dto).toEqual({ value: "BE", count: 9 });
    expect(typeof dto.count).toBe("number");
  });
});
