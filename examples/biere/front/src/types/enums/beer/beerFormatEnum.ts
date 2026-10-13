export enum BeerFormatEnum {
  BOTTLE = "bottle",
  CAN = "can",
  DRAFT = "draft",
}

export const BEER_FORMAT_LABEL_KEYS: Record<BeerFormatEnum, string> = {
  [BeerFormatEnum.BOTTLE]: "beer.formats.bottle",
  [BeerFormatEnum.CAN]: "beer.formats.can",
  [BeerFormatEnum.DRAFT]: "beer.formats.draft",
};

export const isBeerFormat = (value: unknown): value is BeerFormatEnum =>
  typeof value === "string" && Object.values<string>(BeerFormatEnum).includes(value);
