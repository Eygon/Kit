export enum BeerSortEnum {
  NAME = "name",
  ABV = "abv",
  BREWERY = "brewery",
}

export const DEFAULT_BEER_SORT = BeerSortEnum.NAME;

export const BEER_SORT_LABEL_KEYS: Record<BeerSortEnum, string> = {
  [BeerSortEnum.NAME]: "beer.sorts.name",
  [BeerSortEnum.ABV]: "beer.sorts.abv",
  [BeerSortEnum.BREWERY]: "beer.sorts.brewery",
};

export const isBeerSort = (value: unknown): value is BeerSortEnum =>
  typeof value === "string" && Object.values<string>(BeerSortEnum).includes(value);
