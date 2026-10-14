import { API_BASE_URL } from "@/config/apiConfig";

export const API_V1 = () => `${API_BASE_URL}/api/v1`;

export const BEERS = () => `${API_V1()}/beers`;

export const BEER_STYLES = () => `${API_V1()}/beer-styles`;

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

export const VENUE_BEERS = (venueId: number) => `${VENUES()}/${venueId}/beers`;

export const VENUE_BEER_VOTES = (venueId: number, beerId: number) => `${VENUE_BEERS(venueId)}/${beerId}/votes`;

export const PHOTO_BY_ID = (photoId: string) => `${API_V1()}/photos/${photoId}`;

export const ME_BADGES = () => `${API_V1()}/me/badges`;

export const ME_STATS = () => `${API_V1()}/me/stats`;
