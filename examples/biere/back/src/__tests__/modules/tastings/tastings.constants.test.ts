import { describe, expect, it } from "vitest";
import * as constants from "@/modules/tastings/tastings.constants";


describe("tastings constants", () => {
  it("exposes the check-in limits", () => {

    expect({
      placeMaxLength: constants.CHECKIN_PLACE_MAX_LENGTH,
      commentMaxLength: constants.CHECKIN_COMMENT_MAX_LENGTH,
      aromasMax: constants.CHECKIN_AROMAS_MAX,
      ratingMin: constants.CHECKIN_RATING_MIN,
      ratingMax: constants.CHECKIN_RATING_MAX,
      ratingStep: constants.CHECKIN_RATING_STEP,
      priceMax: constants.CHECKIN_PRICE_MAX,
      priceDecimals: constants.CHECKIN_PRICE_DECIMALS,
      photoIdLength: constants.PHOTO_ID_LENGTH,
    }).toEqual({
      placeMaxLength: 80,
      commentMaxLength: 500,
      aromasMax: 5,
      ratingMin: 0.5,
      ratingMax: 5,
      ratingStep: 0.5,
      priceMax: 1000,
      priceDecimals: 2,
      photoIdLength: 36,
    });
  });
});
