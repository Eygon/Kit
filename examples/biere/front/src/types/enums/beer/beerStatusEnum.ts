export enum BeerStatusEnum {
  DRUNK = "drunk",
  WISHLIST = "wishlist",
  UNTASTED = "untasted",
}

export const BEER_STATUS_LABEL_KEYS: Record<BeerStatusEnum, string> = {
  [BeerStatusEnum.DRUNK]: "beer.statuses.drunk",
  [BeerStatusEnum.WISHLIST]: "beer.statuses.wishlist",
  [BeerStatusEnum.UNTASTED]: "beer.statuses.untasted",
};

export const isBeerStatus = (value: unknown): value is BeerStatusEnum =>
  typeof value === "string" && Object.values<string>(BeerStatusEnum).includes(value);
