const RATING_FRACTION_DIGITS = 1;

export const formatRating = (value: number, language: string): string =>
  new Intl.NumberFormat(language, {
    minimumFractionDigits: RATING_FRACTION_DIGITS,
    maximumFractionDigits: RATING_FRACTION_DIGITS,
  }).format(value);
