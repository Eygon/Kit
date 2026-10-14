import { levenshteinDistance } from "@/common/text/levenshtein-distance";
import { normalizeSearchText } from "@/common/text/normalize-search-text";
import {
  APPROXIMATE_LONG_WORD_LENGTH,
  APPROXIMATE_LONG_WORD_MAX_DISTANCE,
  APPROXIMATE_MIN_WORD_LENGTH,
  APPROXIMATE_SHORT_WORD_MAX_DISTANCE,
} from "@/common/text/text-search.constants";

const toSignificantWords = (value: string): string[] =>
  normalizeSearchText(value)
    .split(" ")
    .filter((word) => word.length >= APPROXIMATE_MIN_WORD_LENGTH);

const maxDistanceFor = (word: string): number =>
  word.length >= APPROXIMATE_LONG_WORD_LENGTH ? APPROXIMATE_LONG_WORD_MAX_DISTANCE : APPROXIMATE_SHORT_WORD_MAX_DISTANCE;

export const hasApproximableWord = (term: string): boolean => toSignificantWords(term).length > 0;

export const matchesApproximately = (term: string, texts: readonly string[]): boolean => {
  const termWords = toSignificantWords(term);
  if (termWords.length === 0) {
    return false;
  }
  const textWords = texts.flatMap(toSignificantWords);
  return termWords.every((termWord) =>
    textWords.some((textWord) => levenshteinDistance(termWord, textWord) <= maxDistanceFor(termWord)),
  );
};
