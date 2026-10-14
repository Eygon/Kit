import { describe, expect, it } from "vitest";
import { hasApproximableWord, matchesApproximately as matches } from "@/common/text/matches-approximately";

describe("matchesApproximately", () => {
  it("accepts a missing letter and rejects an unrelated word (cantilon / cantillon)", () => {
    expect(matches("cantilon", ["brasserie cantillon"])).toBe(true);
    expect(matches("xyzwqk", ["brasserie cantillon"])).toBe(false);
  });

  it("accepts distance 1 and refuses distance 2 for a word of 4 letters", () => {
    expect(matches("zinc", ["zind"])).toBe(true);
    expect(matches("zinc", ["zook"])).toBe(false);
    expect(matches("zinc", ["zinnia"])).toBe(false);
  });

  it("accepts distance 1 and refuses distance 2 for a word of 7 letters", () => {
    expect(matches("chimaya", ["chimays"])).toBe(true);
    expect(matches("chimaya", ["chimxxs"])).toBe(false);
  });

  it("accepts distance 2 and refuses distance 3 for a word of 8 letters", () => {
    expect(matches("cantilon", ["cantillons"])).toBe(true);
    expect(matches("cantilon", ["cantxxxx"])).toBe(false);
    expect(matches("cantilon", ["cantilxxn"])).toBe(true);
    expect(matches("cantilon", ["cantixxxn"])).toBe(false);
  });

  it("accepts a word of 7 letters at distance 1 only, but a word of 8 letters at distance 2", () => {
    expect(matches("abcdefg", ["abcdexx"])).toBe(false);
    expect(matches("abcdefgh", ["abcdefxx"])).toBe(true);
  });

  it("returns false when the term has no word of at least 4 letters", () => {
    expect(matches("xyz", ["xyz brasserie"])).toBe(false);
    expect(matches("xyz", ["xyzz"])).toBe(false);
    expect(matches("   ", ["anything"])).toBe(false);
    expect(matches("", ["anything"])).toBe(false);
  });

  it("ignores the words shorter than 4 letters of the term", () => {
    expect(matches("mouse zinc du", ["mousse du zinc"])).toBe(true);
    expect(matches("mouse zinc qq", ["mousse du zinc"])).toBe(true);
  });

  it("ignores the words shorter than 4 letters of the texts", () => {
    expect(matches("abcd", ["abc"])).toBe(false);
    expect(matches("abcd", ["abc", "abcde"])).toBe(true);
  });

  it("requires every retained word of the term to approach a word", () => {
    expect(matches("mouse zinc", ["mousse du zinc"])).toBe(true);
    expect(matches("mouse zinc", ["mousse du plomb"])).toBe(false);
    expect(matches("zinc mouse", ["mousse du plomb"])).toBe(false);
  });

  it("searches the words of every text", () => {
    expect(matches("cantilon gueuze", ["gueuze", "cantillon"])).toBe(true);
    expect(matches("cantilon gueuze", ["gueuze", "orval"])).toBe(false);
  });

  it("returns false for no text", () => {
    expect(matches("cantilon", [])).toBe(false);
    expect(matches("cantilon", [""])).toBe(false);
  });

  it("ignores case, accents and repeated spaces on both sides", () => {
    expect(matches("  CANTILON  ", ["Brasserie   Cantillon"])).toBe(true);
    expect(matches("pecheresse", ["Pêcheresse Rose"])).toBe(true);
    expect(matches("PÊCHERESE", ["pecheresse rose"])).toBe(true);
  });

  it("does not match an exact word of the wrong length from a distant word", () => {
    expect(matches("mous", ["mousse"])).toBe(false);
  });
});

describe("hasApproximableWord", () => {
  it("is true as soon as one word has at least 4 letters, after normalization", () => {
    expect(hasApproximableWord("zinc")).toBe(true);
    expect(hasApproximableWord("  la   ZINC ")).toBe(true);
    expect(hasApproximableWord("qq zinc qq")).toBe(true);
  });

  it("is false for no word, for blanks and for words shorter than 4 letters", () => {
    expect(hasApproximableWord("")).toBe(false);
    expect(hasApproximableWord("   ")).toBe(false);
    expect(hasApproximableWord("bqr")).toBe(false);
    expect(hasApproximableWord("le bar de la")).toBe(false);
  });
});
