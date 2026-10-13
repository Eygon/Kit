const METERS_PER_KILOMETER = 1000;
const METER_ROUNDING_STEP = 10;

export const formatDistance = (distanceKm: number, language: string): string => {
  const meters = Math.round((distanceKm * METERS_PER_KILOMETER) / METER_ROUNDING_STEP) * METER_ROUNDING_STEP;
  if (meters < METERS_PER_KILOMETER)
    return new Intl.NumberFormat(language, { style: "unit", unit: "meter" }).format(meters);
  return new Intl.NumberFormat(language, {
    style: "unit",
    unit: "kilometer",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(distanceKm);
};
