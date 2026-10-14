import { describe, expect, it } from "vitest";
import { escapeLikePattern, LIKE_WILDCARDS } from "@/common/text/escape-like-pattern";

describe("escapeLikePattern", () => {
  it("leaves a plain term untouched", () => {
    expect(escapeLikePattern("lyon biere")).toBe("lyon biere");
  });

  it("escapes the percent sign, the underscore and the backslash", () => {
    expect(escapeLikePattern("100%")).toBe("100\\%");
    expect(escapeLikePattern("a_b")).toBe("a\\_b");
    expect(escapeLikePattern("a\\b")).toBe("a\\\\b");
  });

  it("escapes every wildcard of a term and not only the first", () => {
    expect(escapeLikePattern("%_\\%_")).toBe("\\%\\_\\\\\\%\\_");
  });

  it("exposes the wildcard pattern matching those three characters", () => {
    expect("a%b_c\\d".match(LIKE_WILDCARDS)).toEqual(["%", "_", "\\"]);
  });
});
