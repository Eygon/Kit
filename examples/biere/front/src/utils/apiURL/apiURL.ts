import { API_BASE_URL } from "@/config/apiConfig";

export const API_V1 = () => `${API_BASE_URL}/api/v1`;

export const BEERS = () => `${API_V1()}/beers`;

export const BEER_STYLES = () => `${API_V1()}/beer-styles`;

export const BREWERIES = () => `${API_V1()}/breweries`;

export const BEER_BY_ID = (beerId: number) => `${BEERS()}/${beerId}`;

export const BEER_VENUES = (beerId: number) => `${BEER_BY_ID(beerId)}/venues`;

export const BEER_REVIEWS = (beerId: number) => `${BEER_BY_ID(beerId)}/reviews`;

export const BEER_MY_REVIEW = (beerId: number) => `${BEER_REVIEWS(beerId)}/me`;

export const ME_DEX = () => `${API_V1()}/me/dex`;

export const ME_WISHLIST = () => `${API_V1()}/me/wishlist`;

export const ME_WISHLIST_ITEM = (beerId: number) => `${ME_WISHLIST()}/${beerId}`;

export const CHECKINS = () => `${API_V1()}/checkins`;

export const CHECKIN_BY_ID = (checkinId: number) => `${CHECKINS()}/${checkinId}`;

export const VENUES = () => `${API_V1()}/venues`;

export const VENUE_BY_ID = (venueId: number) => `${VENUES()}/${venueId}`;

export const VENUE_BEERS = (venueId: number) => `${VENUES()}/${venueId}/beers`;

export const VENUE_BEER_VOTES = (venueId: number, beerId: number) => `${VENUE_BEERS(venueId)}/${beerId}/votes`;

export const PHOTO_BY_ID = (photoId: string) => `${API_V1()}/photos/${photoId}`;

export const ME_BADGES = () => `${API_V1()}/me/badges`;

export const ME_STATS = () => `${API_V1()}/me/stats`;

export const ME_FEED = () => `${API_V1()}/me/feed`;

export const USERS = () => `${API_V1()}/users`;

export const USER_PROFILE = (userId: number) => `${USERS()}/${userId}/profile`;

export const ME_PROFILE = () => `${API_V1()}/me/profile`;

export const USER_FOLLOW = (userId: number) => `${USERS()}/${userId}/follow`;

export const USER_FOLLOWERS = (userId: number) => `${USERS()}/${userId}/followers`;

export const USER_FOLLOWING = (userId: number) => `${USERS()}/${userId}/following`;

export const USER_COLLECTIONS = (userId: number) => `${USERS()}/${userId}/collections`;

export const ME_COLLECTIONS = () => `${API_V1()}/me/collections`;

export const ME_COLLECTIONS_CONTAINING = (beerId: number) => `${ME_COLLECTIONS()}?beerId=${beerId}`;

export const ME_COLLECTION = (collectionId: number) => `${ME_COLLECTIONS()}/${collectionId}`;

export const ME_COLLECTION_BEERS = (collectionId: number) => `${ME_COLLECTION(collectionId)}/beers`;

export const ME_COLLECTION_BEER = (collectionId: number, beerId: number) => `${ME_COLLECTION(collectionId)}/beers/${beerId}`;

export const USER_COLLECTION = (userId: number, collectionId: number) => `${USER_COLLECTIONS(userId)}/${collectionId}`;

export const USER_WISHLIST = (userId: number) => `${USERS()}/${userId}/wishlist`;

export const BEER_CORRECTIONS = (beerId: number) => `${BEER_BY_ID(beerId)}/corrections`;

export const CORRECTIONS = () => `${API_V1()}/corrections`;

export const CORRECTION_VOTE = (correctionId: number) => `${CORRECTIONS()}/${correctionId}/vote`;
