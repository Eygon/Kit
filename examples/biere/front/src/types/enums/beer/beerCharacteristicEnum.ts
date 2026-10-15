export enum BeerCharacteristicEnum {
  ABV = "abv",
  IBU = "ibu",
  EBC = "ebc",
  SWEETNESS = "sweetness",
  ACIDITY = "acidity",
  BODY = "body",
  AROMAS = "aromas",
  FORMATS = "formats",
}

export const BEER_CHARACTERISTICS: readonly BeerCharacteristicEnum[] = [
  BeerCharacteristicEnum.ABV,
  BeerCharacteristicEnum.IBU,
  BeerCharacteristicEnum.EBC,
  BeerCharacteristicEnum.SWEETNESS,
  BeerCharacteristicEnum.ACIDITY,
  BeerCharacteristicEnum.BODY,
  BeerCharacteristicEnum.AROMAS,
  BeerCharacteristicEnum.FORMATS,
];

export const BEER_CHARACTERISTIC_LABEL_KEYS: Record<BeerCharacteristicEnum, string> = {
  [BeerCharacteristicEnum.ABV]: "beer.characteristics.abv",
  [BeerCharacteristicEnum.IBU]: "beer.characteristics.ibu",
  [BeerCharacteristicEnum.EBC]: "beer.characteristics.ebc",
  [BeerCharacteristicEnum.SWEETNESS]: "beer.characteristics.sweetness",
  [BeerCharacteristicEnum.ACIDITY]: "beer.characteristics.acidity",
  [BeerCharacteristicEnum.BODY]: "beer.characteristics.body",
  [BeerCharacteristicEnum.AROMAS]: "beer.characteristics.aromas",
  [BeerCharacteristicEnum.FORMATS]: "beer.characteristics.formats",
};

export const BEER_SCALE_LEVEL_LABEL_KEYS: Partial<Record<BeerCharacteristicEnum, readonly string[]>> = {
  [BeerCharacteristicEnum.SWEETNESS]: [1, 2, 3, 4, 5].map((level) => `beer.criteria.sweetness.levels.${level}`),
  [BeerCharacteristicEnum.ACIDITY]: [1, 2, 3, 4, 5].map((level) => `beer.criteria.acidity.levels.${level}`),
  [BeerCharacteristicEnum.BODY]: [1, 2, 3, 4, 5].map((level) => `beer.criteria.body.levels.${level}`),
};

export const isBeerCharacteristic = (value: unknown): value is BeerCharacteristicEnum =>
  typeof value === "string" && Object.values<string>(BeerCharacteristicEnum).includes(value);
