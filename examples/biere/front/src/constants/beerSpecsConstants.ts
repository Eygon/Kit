import { BeerCharacteristicEnum } from "@/types/enums/beer/beerCharacteristicEnum";

export const BEER_ABV_MIN = 0;
export const BEER_ABV_MAX = 20;
export const BEER_ABV_STEP = 0.1;
export const BEER_IBU_MIN = 0;
export const BEER_IBU_MAX = 120;
export const BEER_EBC_MIN = 2;
export const BEER_EBC_MAX = 80;
export const BEER_SCALE_MIN = 1;
export const BEER_SCALE_MAX = 5;
export const BEER_SCALE_NONE = 0;
export const BEER_AROMAS_MAX = 5;
export const BEER_FORMATS_MAX = 3;
export const BEER_LIST_MIN_ITEMS = 1;

export const BEER_CHARACTERISTIC_BOUNDS = {
  [BeerCharacteristicEnum.ABV]: { min: BEER_ABV_MIN, max: BEER_ABV_MAX },
  [BeerCharacteristicEnum.IBU]: { min: BEER_IBU_MIN, max: BEER_IBU_MAX },
  [BeerCharacteristicEnum.EBC]: { min: BEER_EBC_MIN, max: BEER_EBC_MAX },
  [BeerCharacteristicEnum.SWEETNESS]: { min: BEER_SCALE_MIN, max: BEER_SCALE_MAX },
  [BeerCharacteristicEnum.ACIDITY]: { min: BEER_SCALE_MIN, max: BEER_SCALE_MAX },
  [BeerCharacteristicEnum.BODY]: { min: BEER_SCALE_MIN, max: BEER_SCALE_MAX },
  [BeerCharacteristicEnum.AROMAS]: { min: BEER_LIST_MIN_ITEMS, max: BEER_AROMAS_MAX },
  [BeerCharacteristicEnum.FORMATS]: { min: BEER_LIST_MIN_ITEMS, max: BEER_FORMATS_MAX },
} as const;
