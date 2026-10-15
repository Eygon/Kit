export enum RoutePathEnum {
  HOME = "/",
  ENCYCLOPEDIA = "/bieres",
  MAP = "/carte",
  JOURNAL = "/journal",
  PROFILE = "/profil",
  PEOPLE = "/profils",
  USER_PROFILE = "/profils/:userId",
  BEER_DETAIL = "/bieres/:beerId",
  USER_COLLECTION = "/profils/:userId/collections/:collectionId",
  USER_WISHLIST = "/profils/:userId/wishlist",
  VOTES = "/votes",
}

const POSITIVE_INTEGER_PATTERN = /^[1-9]\d*$/;

export const buildBeerDetailPath = (beerId: number): string =>
  RoutePathEnum.BEER_DETAIL.replace(":beerId", beerId.toString());

export const buildUserProfilePath = (userId: number): string =>
  RoutePathEnum.USER_PROFILE.replace(":userId", userId.toString());

export const buildMapPathForBeer = (beerId: number): string => `${RoutePathEnum.MAP}?beer=${beerId}`;

export const buildMapPathForVenue = (venueId: number): string => `${RoutePathEnum.MAP}?venue=${venueId}`;

export const parseBeerIdParam = (value: string | undefined): number | null =>
  value !== undefined && POSITIVE_INTEGER_PATTERN.test(value) ? Number(value) : null;

export const parseVenueIdParam = (value: string | null): number | null =>
  value !== null && POSITIVE_INTEGER_PATTERN.test(value) ? Number(value) : null;
