import { HttpStatusCodeEnum } from "../types/enums/http/httpStatusCodeEnum";

export const API_CACHE_NAME = "mousse-api";
export const API_NETWORK_TIMEOUT_SECONDS = 4;
export const API_CACHE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
export const API_CACHE_MAX_ENTRIES = 200;
export const API_CACHEABLE_STATUSES: readonly HttpStatusCodeEnum[] = [HttpStatusCodeEnum.OK];
