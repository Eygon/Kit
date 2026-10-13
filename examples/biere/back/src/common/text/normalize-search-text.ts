const COMBINING_MARKS = /\p{M}/gu;
const WHITESPACE_RUNS = /\s+/g;

export const normalizeSearchText = (value: string): string =>
  value
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replaceAll("ß", "ss")
    .replace(WHITESPACE_RUNS, " ")
    .trim();
