import { describe, expect, it } from "vitest";
import { parseUserId } from "@/common/security/parse-user-id";

describe("parseUserId", () => {
  it.each([
    ["1", 1],
    ["3", 3],
    [" 2 ", 2],
  ])("parses %j as %i", (raw, expected) => {
    expect(parseUserId(raw)).toBe(expected);
  });

  it.each([undefined, "", "abc", "0", "-1", "1.5", "2abc", "99999999999999999999", ["1", "2"]])(
    "rejects %j",
    (raw) => {
      expect(parseUserId(raw)).toBeNull();
    },
  );
});
