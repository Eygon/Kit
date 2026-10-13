import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";
import { countMapFilters, mapFiltersToSearchParams, searchParamsToMapFilters } from "@/types/mappers/venue/mapFiltersMapper";
import type { MapFilters } from "@/types/models/venue/mapFilters";

export const useMapFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => searchParamsToMapFilters(searchParams), [searchParams]);

  const applyFilters = useCallback(
    (next: MapFilters) => setSearchParams(mapFiltersToSearchParams(next)),
    [setSearchParams],
  );

  return { filters, applyFilters, activeCount: countMapFilters(filters) };
};
