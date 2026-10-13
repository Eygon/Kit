import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";
import type { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";
import { beerQueryToSearchParams, isEmptyBeerQuery, searchParamsToBeerQuery } from "@/types/mappers/beer/beerQueryMapper";
import type { BeerQuery } from "@/types/models/beer/beerQuery";

export const useBeerFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useMemo(() => searchParamsToBeerQuery(searchParams), [searchParams]);

  const applyQuery = useCallback(
    (next: BeerQuery) => setSearchParams(beerQueryToSearchParams(next)),
    [setSearchParams],
  );

  const setSearch = useCallback(
    (search: string) => setSearchParams(beerQueryToSearchParams({ ...query, search }), { replace: true }),
    [query, setSearchParams],
  );

  const setFamily = useCallback(
    (family: BeerFamilyEnum | null) => applyQuery({ ...query, family, styleIds: [] }),
    [query, applyQuery],
  );

  return { query, applyQuery, setSearch, setFamily, hasActiveFilters: !isEmptyBeerQuery(query) };
};
