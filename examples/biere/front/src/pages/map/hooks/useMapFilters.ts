import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";
import { UNDRUNK_ONLY_PARAM } from "@/pages/map/utils/mapConstants";
import { countMapFilters, mapFiltersToSearchParams, searchParamsToMapFilters } from "@/types/mappers/venue/mapFiltersMapper";
import type { MapFilters } from "@/types/models/venue/mapFilters";

export const useMapFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => searchParamsToMapFilters(searchParams), [searchParams]);

  const applyFilters = useCallback(
    (next: MapFilters) =>
      setSearchParams((previous) => {
        const params = mapFiltersToSearchParams(next);
        const undrunkOnly = previous.get(UNDRUNK_ONLY_PARAM);
        if (undrunkOnly !== null) params.set(UNDRUNK_ONLY_PARAM, undrunkOnly);
        return params;
      }),
    [setSearchParams],
  );

  return { filters, applyFilters, activeCount: countMapFilters(filters) };
};
