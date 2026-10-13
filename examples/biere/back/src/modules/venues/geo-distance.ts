import type { GeoPointDto } from "@/modules/venues/dtos/geo-point.dto";
import { DISTANCE_DECIMALS, EARTH_RADIUS_KM } from "@/modules/venues/venues.constants";

const DEGREES_PER_HALF_TURN = 180;

const toRadians = (degrees: number): number => (degrees * Math.PI) / DEGREES_PER_HALF_TURN;

const roundDistance = (distanceKm: number): number => {
  const factor = 10 ** DISTANCE_DECIMALS;
  return Math.round(distanceKm * factor) / factor;
};

export const computeDistanceKm = (from: GeoPointDto, to: GeoPointDto): number => {
  const deltaLatitude = toRadians(to.latitude - from.latitude);
  const deltaLongitude = toRadians(to.longitude - from.longitude);
  const haversine =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.sin(deltaLongitude / 2) ** 2;
  return roundDistance(2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(haversine)));
};
