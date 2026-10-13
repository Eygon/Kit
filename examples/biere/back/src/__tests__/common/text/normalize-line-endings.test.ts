import { describe, expect, it } from "vitest";
import { normalizeLineEndings } from "@/common/text/normalize-line-endings";

describe("normalizeLineEndings", () => {
  it("turns CRLF into LF", () => {
    expect(normalizeLineEndings("a\r\nb\r\n")).toBe("a\nb\n");
  });

  it("turns a lone CR into LF", () => {
    expect(normalizeLineEndings("a\rb")).toBe("a\nb");
  });

  it("turns each CRLF into a single LF without doubling it", () => {
    expect(normalizeLineEndings("a\r\n\r\nb")).toBe("a\n\nb");
  });

  it("keeps LF and text without line breaks untouched", () => {
    expect(normalizeLineEndings("a\nb")).toBe("a\nb");
    expect(normalizeLineEndings("abc")).toBe("abc");
    expect(normalizeLineEndings("")).toBe("");
  });
});
