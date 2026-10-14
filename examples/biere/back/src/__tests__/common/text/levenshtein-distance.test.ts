import { describe, expect, it } from "vitest";
import { levenshteinDistance as distance } from "@/common/text/levenshtein-distance";

describe("levenshteinDistance", () => {
  it("is 0 for identical strings, empty ones included", () => {
    expect(distance("cantillon", "cantillon")).toBe(0);
    expect(distance("", "")).toBe(0);
  });

  it("is the length of the other string when one is empty", () => {
    expect(distance("", "zinc")).toBe(4);
    expect(distance("zinc", "")).toBe(4);
  });

  it("counts one deletion, one insertion and one substitution as 1 each", () => {
    expect(distance("cantilon", "cantillon")).toBe(1);
    expect(distance("cantillon", "cantilon")).toBe(1);
    expect(distance("mouse", "mousse")).toBe(1);
    expect(distance("zinc", "zind")).toBe(1);
  });

  it("counts a transposition as 2", () => {
    expect(distance("ab", "ba")).toBe(2);
  });

  it("is symmetric and sums several edits", () => {
    expect(distance("kitten", "sitting")).toBe(3);
    expect(distance("sitting", "kitten")).toBe(3);
    expect(distance("abc", "xyz")).toBe(3);
  });

  it("is case sensitive and does not fold accents", () => {
    expect(distance("Zinc", "zinc")).toBe(1);
    expect(distance("été", "ete")).toBe(2);
  });
});
