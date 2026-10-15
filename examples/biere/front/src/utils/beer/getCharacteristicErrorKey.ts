import { BEER_ABV_STEP, BEER_CHARACTERISTIC_BOUNDS, BEER_SCALE_NONE } from "@/constants/beerSpecsConstants";
import type { CharacteristicFormValue } from "@/types/components/characteristicFormValue";
import { BeerCharacteristicEnum } from "@/types/enums/beer/beerCharacteristicEnum";

const ERROR_KEY_PREFIX = "beer.characteristics.errors";
const WHOLE_STEP = 1;
const DECIMAL_FACTOR = 10;

const SCALE_CHARACTERISTICS: readonly BeerCharacteristicEnum[] = [
  BeerCharacteristicEnum.SWEETNESS,
  BeerCharacteristicEnum.ACIDITY,
  BeerCharacteristicEnum.BODY,
];

const isListCharacteristic = (characteristic: BeerCharacteristicEnum): boolean =>
  characteristic === BeerCharacteristicEnum.AROMAS || characteristic === BeerCharacteristicEnum.FORMATS;

const isOnStep = (value: number, step: number): boolean => {
  const scaled = value / step;
  return Math.abs(scaled - Math.round(scaled)) < Number.EPSILON * DECIMAL_FACTOR * Math.max(1, Math.abs(scaled));
};

const getListErrorKey = (characteristic: BeerCharacteristicEnum, items: string[], isRequired: boolean) => {
  const { min, max } = BEER_CHARACTERISTIC_BOUNDS[characteristic];
  if (items.length > max) return `${ERROR_KEY_PREFIX}.listSize`;
  if (isRequired && items.length < min) return `${ERROR_KEY_PREFIX}.required`;
  return undefined;
};

const getNumberErrorKey = (characteristic: BeerCharacteristicEnum, value: number, isRequired: boolean) => {
  const { min, max } = BEER_CHARACTERISTIC_BOUNDS[characteristic];
  const isScale = SCALE_CHARACTERISTICS.includes(characteristic);
  const isEmpty = isScale ? value === BEER_SCALE_NONE : Number.isNaN(value);
  if (isEmpty) return isRequired ? `${ERROR_KEY_PREFIX}.required` : undefined;
  if (value < min || value > max) return `${ERROR_KEY_PREFIX}.range`;
  const step = characteristic === BeerCharacteristicEnum.ABV ? BEER_ABV_STEP : WHOLE_STEP;
  return isOnStep(value, step) ? undefined : `${ERROR_KEY_PREFIX}.step`;
};

export const getCharacteristicErrorKey = (
  characteristic: BeerCharacteristicEnum,
  value: CharacteristicFormValue,
  isRequired: boolean,
): string | undefined => {
  const isList = isListCharacteristic(characteristic);
  if (Array.isArray(value) !== isList) return `${ERROR_KEY_PREFIX}.required`;
  return Array.isArray(value)
    ? getListErrorKey(characteristic, value, isRequired)
    : getNumberErrorKey(characteristic, value, isRequired);
};
