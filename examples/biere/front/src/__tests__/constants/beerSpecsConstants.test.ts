import * as specsConstants from "@/constants/beerSpecsConstants";
import * as proposeConstants from "@/pages/encyclopedia/utils/proposeBeerConstants";
import { BeerCharacteristicEnum } from "@/types/enums/beer/beerCharacteristicEnum";

describe("beerSpecsConstants", () => {
  it("carries the bounds the back validates", () => {
    expect(specsConstants.BEER_ABV_MIN).toBe(0);
    expect(specsConstants.BEER_ABV_MAX).toBe(20);
    expect(specsConstants.BEER_ABV_STEP).toBe(0.1);
    expect(specsConstants.BEER_IBU_MIN).toBe(0);
    expect(specsConstants.BEER_IBU_MAX).toBe(120);
    expect(specsConstants.BEER_EBC_MIN).toBe(2);
    expect(specsConstants.BEER_EBC_MAX).toBe(80);
    expect(specsConstants.BEER_SCALE_MIN).toBe(1);
    expect(specsConstants.BEER_SCALE_MAX).toBe(5);
    expect(specsConstants.BEER_SCALE_NONE).toBe(0);
    expect(specsConstants.BEER_AROMAS_MAX).toBe(5);
    expect(specsConstants.BEER_FORMATS_MAX).toBe(3);
    expect(specsConstants.BEER_LIST_MIN_ITEMS).toBe(1);
  });

  it("no longer lets proposeBeerConstants carry the degree bounds", () => {
    expect(proposeConstants).not.toHaveProperty("BEER_ABV_MIN");
    expect(proposeConstants).not.toHaveProperty("BEER_ABV_MAX");
    expect(proposeConstants).not.toHaveProperty("BEER_ABV_STEP");
  });

  it("gives the bounds of each characteristic", () => {
    expect(specsConstants.BEER_CHARACTERISTIC_BOUNDS).toEqual({
      [BeerCharacteristicEnum.ABV]: { min: 0, max: 20 },
      [BeerCharacteristicEnum.IBU]: { min: 0, max: 120 },
      [BeerCharacteristicEnum.EBC]: { min: 2, max: 80 },
      [BeerCharacteristicEnum.SWEETNESS]: { min: 1, max: 5 },
      [BeerCharacteristicEnum.ACIDITY]: { min: 1, max: 5 },
      [BeerCharacteristicEnum.BODY]: { min: 1, max: 5 },
      [BeerCharacteristicEnum.AROMAS]: { min: 1, max: 5 },
      [BeerCharacteristicEnum.FORMATS]: { min: 1, max: 3 },
    });
  });
});
