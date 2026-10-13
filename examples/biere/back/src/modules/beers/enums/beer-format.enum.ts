export enum BeerFormatEnum {
  BOTTLE = "bottle",
  CAN = "can",
  DRAFT = "draft",
}

export const isBeerFormat = (value: string): value is BeerFormatEnum =>
  Object.values(BeerFormatEnum).includes(value as BeerFormatEnum);
