const NO_BREAK_SPACE = " ";
const MAX_ABV_FRACTION_DIGITS = 1;

export const formatAbv = (abv: number, language: string): string =>
  `${new Intl.NumberFormat(language, { maximumFractionDigits: MAX_ABV_FRACTION_DIGITS }).format(abv)}${NO_BREAK_SPACE}%`;
