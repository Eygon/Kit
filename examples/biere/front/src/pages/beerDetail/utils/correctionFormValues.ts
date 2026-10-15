import { BEER_SCALE_NONE } from "@/constants/beerSpecsConstants";
import type { CorrectionFormErrorKeys, CorrectionFormValues } from "@/pages/beerDetail/types/correctionFormValues";
import type { CharacteristicFormValue } from "@/types/components/characteristicFormValue";
import { BeerCharacteristicEnum } from "@/types/enums/beer/beerCharacteristicEnum";
import type { CharacteristicValue } from "@/types/models/beer/characteristicValue";
import type { NewCorrection } from "@/types/models/correction/newCorrection";
import { getCharacteristicErrorKey } from "@/utils/beer/getCharacteristicErrorKey";

export const CORRECTION_REASON_MAX_LENGTH = 200;

const ERROR_KEY_PREFIX = "corrections.propose.errors";

const SCALE_CHARACTERISTICS: readonly BeerCharacteristicEnum[] = [
  BeerCharacteristicEnum.SWEETNESS,
  BeerCharacteristicEnum.ACIDITY,
  BeerCharacteristicEnum.BODY,
];

const LIST_CHARACTERISTICS: readonly BeerCharacteristicEnum[] = [
  BeerCharacteristicEnum.AROMAS,
  BeerCharacteristicEnum.FORMATS,
];

const getEmptyValue = (characteristic: BeerCharacteristicEnum): CharacteristicFormValue => {
  if (LIST_CHARACTERISTICS.includes(characteristic)) return [];
  return SCALE_CHARACTERISTICS.includes(characteristic) ? BEER_SCALE_NONE : Number.NaN;
};

export const getEmptyCorrectionForm = (characteristic: BeerCharacteristicEnum): CorrectionFormValues => ({
  value: getEmptyValue(characteristic),
  reason: "",
});

const isSameValue = (value: CharacteristicFormValue, currentValue: CharacteristicValue | null): boolean => {
  if (currentValue === null) return false;
  if (!Array.isArray(value) || !Array.isArray(currentValue)) return value === currentValue;
  return value.length === currentValue.length && value.every((item) => currentValue.includes(item));
};

const getValueErrorKey = (
  characteristic: BeerCharacteristicEnum,
  value: CharacteristicFormValue,
  currentValue: CharacteristicValue | null,
): string | undefined => {
  const errorKey = getCharacteristicErrorKey(characteristic, value, true);
  if (errorKey !== undefined) return errorKey;
  return isSameValue(value, currentValue) ? `${ERROR_KEY_PREFIX}.sameValue` : undefined;
};

export const getCorrectionFormErrorKeys = (
  characteristic: BeerCharacteristicEnum,
  values: CorrectionFormValues,
  currentValue: CharacteristicValue | null,
): CorrectionFormErrorKeys => {
  const valueErrorKey = getValueErrorKey(characteristic, values.value, currentValue);
  return {
    ...(valueErrorKey === undefined ? {} : { value: valueErrorKey }),
    ...(values.reason.trim().length > CORRECTION_REASON_MAX_LENGTH ? { reason: `${ERROR_KEY_PREFIX}.reasonLength` } : {}),
  };
};

export const formValuesToNewCorrection = (
  characteristic: BeerCharacteristicEnum,
  values: CorrectionFormValues,
): NewCorrection => ({
  characteristic,
  value: values.value,
  reason: values.reason.trim(),
});
