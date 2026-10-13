export enum RoutePathEnum {
  ENCYCLOPEDIA = "/",
  MAP = "/carte",
  JOURNAL = "/journal",
  PROFILE = "/profil",
  BEER_DETAIL = "/bieres/:beerId",
}

const POSITIVE_INTEGER_PATTERN = /^[1-9]\d*$/;

export const buildBeerDetailPath = (beerId: number): string =>
  RoutePathEnum.BEER_DETAIL.replace(":beerId", beerId.toString());

export const parseBeerIdParam = (value: string | undefined): number | null =>
  value !== undefined && POSITIVE_INTEGER_PATTERN.test(value) ? Number(value) : null;
