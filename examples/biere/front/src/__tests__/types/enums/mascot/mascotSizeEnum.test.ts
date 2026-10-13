import {
  DEFAULT_MASCOT_SIZE,
  MASCOT_IMAGE_SIZES,
  MASCOT_SIZE_CLASSES,
  MascotSizeEnum,
} from "@/types/enums/mascot/mascotSizeEnum";

describe("MascotSizeEnum", () => {
  it("defaults to the medium size", () => {
    expect(DEFAULT_MASCOT_SIZE).toBe(MascotSizeEnum.MD);
  });

  it.each([
    [MascotSizeEnum.SM, "size-24", "6rem"],
    [MascotSizeEnum.MD, "size-36", "9rem"],
    [MascotSizeEnum.LG, "size-48", "12rem"],
  ])("sizes %s as a square of %s matching its image hint %s", (size, classes, imageSize) => {
    expect(MASCOT_SIZE_CLASSES[size]).toBe(classes);
    expect(MASCOT_IMAGE_SIZES[size]).toBe(imageSize);
  });
});
