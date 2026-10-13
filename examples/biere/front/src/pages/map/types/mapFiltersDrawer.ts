import type { MapFilters } from "@/types/models/venue/mapFilters";

export type MapFiltersDrawerProps = Readonly<{
  appliedFilters: MapFilters;
  hasPosition: boolean;
  onApply: (filters: MapFilters) => void;
}>;
