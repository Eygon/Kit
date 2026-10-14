import { getMapBannerMessage } from "@/pages/map/utils/getMapBannerMessage";

const QUIET = {
  locateErrorKey: null,
  tilesUnavailable: false,
  hasPointPrompt: false,
  isPointPicked: false,
};

describe("getMapBannerMessage", () => {
  it("returns nothing when nothing needs saying", () => {
    expect(getMapBannerMessage(QUIET)).toBeNull();
  });

  it("puts the position error before the unavailable tiles and the point hint", () => {
    expect(
      getMapBannerMessage({
        locateErrorKey: "pages.map.locate.denied",
        tilesUnavailable: true,
        hasPointPrompt: true,
        isPointPicked: false,
      }),
    ).toEqual({ key: "pages.map.locate.denied", isError: true });
  });

  it("puts the unavailable tiles before the point hint", () => {
    expect(
      getMapBannerMessage({
        ...QUIET,
        tilesUnavailable: true,
        hasPointPrompt: true,
      }),
    ).toEqual({
      key: "pages.map.tilesUnavailable",
      isError: false,
    });
  });

  it("falls back to the pick hint, then the picked hint", () => {
    expect(getMapBannerMessage({ ...QUIET, hasPointPrompt: true })).toEqual({
      key: "pages.map.propose.pickHint",
      isError: false,
    });
    expect(
      getMapBannerMessage({
        ...QUIET,
        hasPointPrompt: true,
        isPointPicked: true,
      }),
    ).toEqual({
      key: "pages.map.propose.pickedHint",
      isError: false,
    });
  });
});
