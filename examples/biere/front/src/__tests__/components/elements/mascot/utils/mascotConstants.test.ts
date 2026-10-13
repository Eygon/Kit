import { MASCOT_IMAGE_WIDTH_PX, MASCOT_SMALL_IMAGE_WIDTH_PX } from "@/components/elements/mascot/utils/mascotConstants";

describe("mascotConstants", () => {
  it("matches the widths of the two exported illustrations", () => {
    expect(MASCOT_IMAGE_WIDTH_PX).toBe(512);
    expect(MASCOT_SMALL_IMAGE_WIDTH_PX).toBe(256);
  });
});
