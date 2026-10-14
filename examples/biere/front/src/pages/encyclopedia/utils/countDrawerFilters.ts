import { DEFAULT_BEER_SORT } from "@/types/enums/beer/beerSortEnum";
import type { BeerQuery } from "@/types/models/beer/beerQuery";

export const countDrawerFilters = (query: BeerQuery): number => {
  const hasFamily = query.family !== null ? 1 : 0;
  const hasAbvBound = query.abvMin !== null || query.abvMax !== null ? 1 : 0;
  const hasStatus = query.status !== null ? 1 : 0;
  const hasMinRating = query.minRating !== null ? 1 : 0;
  const hasCustomSort = query.sort !== DEFAULT_BEER_SORT ? 1 : 0;
  return (
    hasFamily + query.styleIds.length + hasAbvBound + query.countries.length + query.formats.length + hasStatus + hasMinRating + hasCustomSort
  );
};
