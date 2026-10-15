import { BEER_ABV_MAX, BEER_ABV_MIN, BEER_SCALE_NONE } from "@/constants/beerSpecsConstants";
import type { BeerFormErrorKeys, BeerFormValues } from "@/pages/encyclopedia/types/beerFormValues";
import {
  BEER_DESCRIPTION_MAX_LENGTH,
  BEER_NAME_MAX_LENGTH,
  BEER_NAME_MIN_LENGTH,
  BREWERY_NAME_MAX_LENGTH,
  BREWERY_NAME_MIN_LENGTH,
  PROPOSE_BEER_SPEC_CHARACTERISTICS,
} from "@/pages/encyclopedia/utils/proposeBeerConstants";
import type { NewBeer } from "@/types/models/beer/newBeer";
import { getCharacteristicErrorKey } from "@/utils/beer/getCharacteristicErrorKey";

const ABV_DECIMAL_FACTOR = 10;
const ERROR_KEY_PREFIX = "pages.encyclopedia.propose.errors";

export const EMPTY_BEER_FORM: BeerFormValues = {
  name: "",
  breweryName: "",
  country: null,
  styleId: null,
  abv: Number.NaN,
  ibu: Number.NaN,
  ebc: Number.NaN,
  sweetness: BEER_SCALE_NONE,
  acidity: BEER_SCALE_NONE,
  body: BEER_SCALE_NONE,
  aromas: [],
  formats: [],
  description: "",
};

const cleanLabel = (value: string): string => value.replace(/\s+/g, " ").trim();

const isOutOfLength = (value: string, min: number, max: number): boolean => value.length < min || value.length > max;

const hasOneDecimalAtMost = (abv: number): boolean =>
  Math.round(abv * ABV_DECIMAL_FACTOR) === abv * ABV_DECIMAL_FACTOR;

const getAbvErrorKey = (abv: number): string | undefined => {
  if (Number.isNaN(abv)) return `${ERROR_KEY_PREFIX}.abvRequired`;
  if (abv < BEER_ABV_MIN || abv > BEER_ABV_MAX) return `${ERROR_KEY_PREFIX}.abvRange`;
  if (!hasOneDecimalAtMost(abv)) return `${ERROR_KEY_PREFIX}.abvStep`;
  return undefined;
};

const numberOrNull = (value: number): number | null => (Number.isNaN(value) ? null : value);

const scaleOrNull = (value: number): number | null => (value === BEER_SCALE_NONE ? null : value);

export const formValuesToNewBeer = (values: BeerFormValues): NewBeer | null => {
  if (values.country === null || values.styleId === null) return null;
  return {
    name: cleanLabel(values.name),
    breweryName: cleanLabel(values.breweryName),
    country: values.country,
    styleId: values.styleId,
    abv: values.abv,
    ibu: numberOrNull(values.ibu),
    ebc: numberOrNull(values.ebc),
    sweetness: scaleOrNull(values.sweetness),
    acidity: scaleOrNull(values.acidity),
    body: scaleOrNull(values.body),
    aromas: values.aromas,
    formats: values.formats,
    description: values.description.trim(),
  };
};

const getSpecErrorKeys = (values: BeerFormValues): BeerFormErrorKeys =>
  Object.fromEntries(
    PROPOSE_BEER_SPEC_CHARACTERISTICS.flatMap((characteristic) => {
      const errorKey = getCharacteristicErrorKey(characteristic, values[characteristic], false);
      return errorKey === undefined ? [] : [[characteristic, errorKey]];
    }),
  );

export const getBeerFormErrorKeys = (values: BeerFormValues): BeerFormErrorKeys => {
  const abvErrorKey = getAbvErrorKey(values.abv);
  return {
    ...(isOutOfLength(cleanLabel(values.name), BEER_NAME_MIN_LENGTH, BEER_NAME_MAX_LENGTH)
      ? { name: `${ERROR_KEY_PREFIX}.nameLength` }
      : {}),
    ...(isOutOfLength(cleanLabel(values.breweryName), BREWERY_NAME_MIN_LENGTH, BREWERY_NAME_MAX_LENGTH)
      ? { breweryName: `${ERROR_KEY_PREFIX}.breweryLength` }
      : {}),
    ...(values.country === null ? { country: `${ERROR_KEY_PREFIX}.countryRequired` } : {}),
    ...(values.styleId === null ? { styleId: `${ERROR_KEY_PREFIX}.styleRequired` } : {}),
    ...(abvErrorKey === undefined ? {} : { abv: abvErrorKey }),
    ...(values.description.trim().length > BEER_DESCRIPTION_MAX_LENGTH
      ? { description: `${ERROR_KEY_PREFIX}.descriptionLength` }
      : {}),
    ...getSpecErrorKeys(values),
  };
};
