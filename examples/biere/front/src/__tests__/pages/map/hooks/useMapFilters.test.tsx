import { act, screen } from "@testing-library/react";
import { Route, Routes, useLocation } from "react-router";
import { useMapFilters } from "@/pages/map/hooks/useMapFilters";
import { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";
import { VenueTypeEnum } from "@/types/enums/venue/venueTypeEnum";
import { EMPTY_MAP_FILTERS } from "@/types/mappers/venue/mapFiltersMapper";
import type { MapFilters } from "@/types/models/venue/mapFilters";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";

type FiltersApi = {
  filters: MapFilters;
  applyFilters: (next: MapFilters) => void;
  activeCount: number;
};

const renderFilters = (initialPath: string) => {
  const holder: { api: FiltersApi | null } = { api: null };

  const Probe = () => {
    const api: FiltersApi = useMapFilters();
    const location = useLocation();
    holder.api = api;
    return <output aria-label="search">{location.search}</output>;
  };

  renderWithProviders(
    <Routes>
      <Route path="*" element={<Probe />} />
    </Routes>,
    { initialPath },
  );

  return () => {
    if (holder.api === null) throw new Error("hook not rendered");
    return holder.api;
  };
};

const urlSearch = () => screen.getByLabelText("search").textContent;

describe("useMapFilters", () => {
  it("reads every filter of the address and counts them", () => {
    const api = renderFilters("/carte?type=shop&family=stout&beer=7&confirmed=1&radius=5");

    expect(api().filters).toEqual({
      types: [VenueTypeEnum.SHOP],
      family: BeerFamilyEnum.STOUT,
      beerId: 7,
      confirmedOnly: true,
      radiusKm: 5,
    });
    expect(api().activeCount).toBe(5);
  });

  it("gives the empty filters and no active filter for a bare address", () => {
    const api = renderFilters("/carte");

    expect(api().filters).toEqual(EMPTY_MAP_FILTERS);
    expect(api().activeCount).toBe(0);
  });

  it("ignores an invalid value of the address and keeps the rest", () => {
    const api = renderFilters("/carte?type=castle&family=wine&beer=abc&confirmed=1&radius=3");

    expect(api().filters).toEqual({ types: [], family: null, beerId: null, confirmedOnly: true, radiusKm: null });
    expect(api().activeCount).toBe(1);
  });

  it("writes the applied filters into the address", () => {
    const api = renderFilters("/carte");

    act(() =>
      api().applyFilters({
        types: [VenueTypeEnum.SHOP],
        family: BeerFamilyEnum.STOUT,
        beerId: null,
        confirmedOnly: true,
        radiusKm: null,
      }),
    );

    expect(urlSearch()).toBe("?type=shop&family=stout&confirmed=1");
    expect(api().filters.types).toEqual([VenueTypeEnum.SHOP]);
    expect(api().activeCount).toBe(3);
  });

  it("clears the address when the empty filters are applied", () => {
    const api = renderFilters("/carte?type=bar&family=stout&confirmed=1");

    act(() => api().applyFilters(EMPTY_MAP_FILTERS));

    expect(urlSearch()).toBe("");
    expect(api().activeCount).toBe(0);
  });
});
