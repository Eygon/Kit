import { API_BASE_URL } from "@/config/apiConfig";

export const API_V1 = () => `${API_BASE_URL}/api/v1`;

export const BEERS = () => `${API_V1()}/beers`;

export const BEER_STYLES = () => `${API_V1()}/beer-styles`;

export const BEER_BY_ID = (beerId: number) => `${BEERS()}/${beerId}`;

export const ME_DEX = () => `${API_V1()}/me/dex`;

export const ME_WISHLIST = () => `${API_V1()}/me/wishlist`;

export const ME_WISHLIST_ITEM = (beerId: number) => `${ME_WISHLIST()}/${beerId}`;

export const CHECKINS = () => `${API_V1()}/checkins`;
