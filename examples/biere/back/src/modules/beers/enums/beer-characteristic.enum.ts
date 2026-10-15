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

export const isBeerCharacteristic = (value: string): value is BeerCharacteristicEnum =>
  Object.values(BeerCharacteristicEnum).includes(value as BeerCharacteristicEnum);
