export enum BeerSortEnum {
  NAME = "name",
  ABV = "abv",
  BREWERY = "brewery",
  RATING = "rating",
}

export interface SortColumn {
  readonly expression: string;
  readonly direction: "ASC" | "DESC";
}

export const BEER_SORT_ORDERS: Readonly<Record<BeerSortEnum, readonly SortColumn[]>> = {
  [BeerSortEnum.NAME]: [{ expression: "LOWER(beer.name)", direction: "ASC" }],
  [BeerSortEnum.ABV]: [
    { expression: "beer.abv", direction: "DESC" },
    { expression: "LOWER(beer.name)", direction: "ASC" },
  ],
  [BeerSortEnum.BREWERY]: [
    { expression: "LOWER(brewery.name)", direction: "ASC" },
    { expression: "LOWER(beer.name)", direction: "ASC" },
  ],
  [BeerSortEnum.RATING]: [
    { expression: "(rating.averageRating IS NULL)", direction: "ASC" },
    { expression: "rating.averageRating", direction: "DESC" },
    { expression: "rating.reviewCount", direction: "DESC" },
    { expression: "LOWER(beer.name)", direction: "ASC" },
  ],
};
