import { RADIUS_OPTIONS_KM } from "@/pages/map/utils/mapConstants";
import { isBeerFamily } from "@/types/enums/beer/beerFamilyEnum";
import { isVenueType } from "@/types/enums/venue/venueTypeEnum";
import type { MapFilters } from "@/types/models/venue/mapFilters";

export const EMPTY_MAP_FILTERS: MapFilters = {
  types: [],
  family: null,
  beerId: null,
  confirmedOnly: false,
  radiusKm: null,
};

const POSITIVE_INTEGER_PATTERN = /^[1-9]\d*$/;
const CONFIRMED_VALUE = "1";

const parseBeerId = (value: string | null): number | null =>
  value !== null && POSITIVE_INTEGER_PATTERN.test(value) ? Number(value) : null;

const parseRadius = (value: string | null): number | null => {
  const radius = Number(value);
  return value !== null && RADIUS_OPTIONS_KM.includes(radius) ? radius : null;
};

export const searchParamsToMapFilters = (params: URLSearchParams): MapFilters => {
  const family = params.get("family");
  const types = params.getAll("type").filter(isVenueType);

  return {
    types: types.filter((type, index) => types.indexOf(type) === index),
    family: isBeerFamily(family) ? family : null,
    beerId: parseBeerId(params.get("beer")),
    confirmedOnly: params.get("confirmed") === CONFIRMED_VALUE,
    radiusKm: parseRadius(params.get("radius")),
  };
};

export const mapFiltersToSearchParams = (filters: MapFilters): URLSearchParams => {
  const params = new URLSearchParams();
  filters.types.forEach((type) => params.append("type", type));
  if (filters.family !== null) params.append("family", filters.family);
  if (filters.beerId !== null) params.append("beer", filters.beerId.toString());
  if (filters.confirmedOnly) params.append("confirmed", CONFIRMED_VALUE);
  if (filters.radiusKm !== null) params.append("radius", filters.radiusKm.toString());
  return params;
};

export const countMapFilters = (filters: MapFilters): number => {
  const hasFamily = filters.family !== null ? 1 : 0;
  const hasBeer = filters.beerId !== null ? 1 : 0;
  const hasConfirmedOnly = filters.confirmedOnly ? 1 : 0;
  const hasRadius = filters.radiusKm !== null ? 1 : 0;
  return filters.types.length + hasFamily + hasBeer + hasConfirmedOnly + hasRadius;
};
