import { getMascotStandInPieces } from "@/components/elements/mascot/components/mascotMoodStandIn/utils/getMascotStandInPieces";
import { MascotMoodEnum } from "@/types/enums/mascot/mascotMoodEnum";

describe("getMascotStandInPieces", () => {
  it("floats a question mark bubble while searching", () => {
    const [bubble] = getMascotStandInPieces(MascotMoodEnum.SEARCHING);

    expect(bubble).toContain("after:content-['?']");
    expect(bubble).toContain("motion-safe:animate-mascot-float");
  });

  it("twinkles amber sparkles when a beer is captured", () => {
    getMascotStandInPieces(MascotMoodEnum.CAPTURED).forEach((piece) => {
      expect(piece).toContain("sparkle-shape");
      expect(piece).toContain("bg-highlight");
    });
  });

  it("drops hop grains when confused, still visible without motion", () => {
    getMascotStandInPieces(MascotMoodEnum.CONFUSED).forEach((piece) => {
      expect(piece).toContain("bg-accent");
      expect(piece).toContain("motion-safe:animate-mascot-fall");
      expect(piece).toContain("motion-reduce:opacity-100");
    });
  });

  it("pins palette badges when loaded", () => {
    const pieces = getMascotStandInPieces(MascotMoodEnum.LOADED);

    expect(pieces.map((piece) => piece.match(/bg-(highlight|accent|secondary)\b/)?.[1])).toEqual([
      "highlight",
      "accent",
      "secondary",
    ]);
  });

  it("animates only behind motion-safe and draws with tokens only", () => {
    Object.values(MascotMoodEnum).forEach((mood) => {
      getMascotStandInPieces(mood).forEach((piece) => {
        expect(piece).not.toMatch(/(^|\s)animate-/);
        expect(piece).not.toMatch(/#[0-9a-f]{3,8}|gradient|blur|shadow-(sm|md|lg|xl)/i);
      });
    });
  });
});
