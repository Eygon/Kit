import type { TFunction } from "i18next";
import { BEER_AROMA_LABEL_KEYS, isBeerAroma } from "@/types/enums/beer/beerAromaEnum";
import { BEER_SCALE_LEVEL_LABEL_KEYS, BeerCharacteristicEnum } from "@/types/enums/beer/beerCharacteristicEnum";
import { BEER_FORMAT_LABEL_KEYS, isBeerFormat } from "@/types/enums/beer/beerFormatEnum";
import type { CharacteristicValue } from "@/types/models/beer/characteristicValue";
import { formatAbv } from "@/utils/beer/formatAbv";

const LIST_SEPARATOR = ", ";

const formatList = (characteristic: BeerCharacteristicEnum, values: string[], t: TFunction): string => {
  const labelKeys =
    characteristic === BeerCharacteristicEnum.AROMAS
      ? values.filter(isBeerAroma).map((aroma) => BEER_AROMA_LABEL_KEYS[aroma])
      : values.filter(isBeerFormat).map((format) => BEER_FORMAT_LABEL_KEYS[format]);
  return labelKeys.map((labelKey) => t(labelKey)).join(LIST_SEPARATOR);
};

const formatNumber = (characteristic: BeerCharacteristicEnum, value: number, t: TFunction, language: string): string => {
  switch (characteristic) {
    case BeerCharacteristicEnum.ABV:
      return formatAbv(value, language);
    case BeerCharacteristicEnum.IBU:
      return t("beer.characteristics.ibuValue", { value });
    case BeerCharacteristicEnum.EBC:
      return t("beer.characteristics.ebcValue", { value });
    default: {
      const levelKeys = BEER_SCALE_LEVEL_LABEL_KEYS[characteristic] ?? [];
      return t("beer.characteristics.scaleValue", { value, label: t(levelKeys[value - 1]) });
    }
  }
};

export const formatCharacteristicValue = (
  characteristic: BeerCharacteristicEnum,
  value: CharacteristicValue | null,
  t: TFunction,
  language: string,
): string => {
  if (value === null) return t("beer.characteristics.notAvailable");
  if (Array.isArray(value)) return formatList(characteristic, value, t);
  return formatNumber(characteristic, value, t, language);
};
