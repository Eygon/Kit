import { getMascotImageClasses } from "@/components/elements/mascot/utils/getMascotImageClasses";
import { MascotMoodEnum } from "@/types/enums/mascot/mascotMoodEnum";

describe("getMascotImageClasses", () => {
  it.each([
    [MascotMoodEnum.CAPTURED, "-rotate-6"],
    [MascotMoodEnum.CONFUSED, "rotate-3"],
  ])("tilts the %s mascot", (mood, tilt) => {
    expect(getMascotImageClasses(mood).split(" ")).toContain(tilt);
  });

  it.each([MascotMoodEnum.SEARCHING, MascotMoodEnum.LOADED])("keeps the %s mascot upright", (mood) => {
    expect(getMascotImageClasses(mood)).not.toMatch(/rotate/);
  });

  it("never stretches, filters nor recolours the illustration", () => {
    Object.values(MascotMoodEnum).forEach((mood) => {
      const classes = getMascotImageClasses(mood);
      expect(classes).toContain("object-contain");
      expect(classes).not.toMatch(/object-(fill|cover)|filter|hue-rotate|grayscale|sepia|invert|mix-blend|opacity/);
    });
  });
});
