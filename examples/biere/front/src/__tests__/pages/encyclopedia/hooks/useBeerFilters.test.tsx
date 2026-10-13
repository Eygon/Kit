import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useLocation, useNavigate } from "react-router";
import { useBeerFilters } from "@/pages/encyclopedia/hooks/useBeerFilters";
import { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";
import { BeerFormatEnum } from "@/types/enums/beer/beerFormatEnum";
import { BeerSortEnum } from "@/types/enums/beer/beerSortEnum";
import { EMPTY_BEER_QUERY } from "@/types/mappers/beer/beerQueryMapper";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";

type FiltersApi = ReturnType<typeof useBeerFilters>;

const renderFilters = (initialPath: string) => {
  const holder: { api: FiltersApi | null } = { api: null };
  const renders: FiltersApi[] = [];

  const Probe = () => {
    const api: FiltersApi = useBeerFilters();
    const location = useLocation();
    const navigate = useNavigate();
    holder.api = api;
    renders.push(api);
    return (
      <>
        <output aria-label="search">{location.search}</output>
        <button type="button" onClick={() => void navigate(-1)}>
          back
        </button>
      </>
    );
  };

  const view = renderWithProviders(
    <Routes>
      <Route path="*" element={<Probe />} />
    </Routes>,
    { initialPath },
  );

  const api = () => {
    if (holder.api === null) throw new Error("hook not rendered");
    return holder.api;
  };

  return { api, renders, view };
};

const urlSearch = () => screen.getByLabelText("search").textContent;

describe("useBeerFilters", () => {
  it("reads every filter of the URL into the query", () => {
    const { api } = renderFilters(
      "/?q=ipa&family=trappist&style=3&style=7&country=BE&country=DE&format=can&format=bottle&abvMin=4.5&abvMax=9&sort=abv",
    );

    expect(api().query).toEqual({
      search: "ipa",
      family: BeerFamilyEnum.TRAPPIST,
      styleIds: [3, 7],
      countries: ["BE", "DE"],
      formats: [BeerFormatEnum.CAN, BeerFormatEnum.BOTTLE],
      abvMin: 4.5,
      abvMax: 9,
      status: null,
      sort: BeerSortEnum.ABV,
    });
  });

  it("ignores an invalid value and keeps the rest", () => {
    const { api } = renderFilters("/?q=ipa&family=unknown&abvMin=abc&sort=abv");

    expect(api().query).toEqual({ ...EMPTY_BEER_QUERY, search: "ipa", sort: BeerSortEnum.ABV });
  });

  it("gives the empty query and no active filter for a bare URL", () => {
    const { api } = renderFilters("/");

    expect(api().query).toEqual(EMPTY_BEER_QUERY);
    expect(api().hasActiveFilters).toBe(false);
  });

  it("does not count the sort as an active filter", () => {
    const { api } = renderFilters("/?sort=brewery");

    expect(api().query.sort).toBe(BeerSortEnum.BREWERY);
    expect(api().hasActiveFilters).toBe(false);
  });

  it("counts a search or a family as an active filter", () => {
    const withSearch = renderFilters("/?q=orval");
    expect(withSearch.api().hasActiveFilters).toBe(true);
    withSearch.view.unmount();

    const withFamily = renderFilters("/?family=stout");
    expect(withFamily.api().hasActiveFilters).toBe(true);
  });

  it("keeps the same query object while the URL string does not change", () => {
    const { api, renders } = renderFilters("/?family=ipa");
    const before = api().query;
    const renderCount = renders.length;

    act(() => api().setSearch(""));

    expect(renders.length).toBeGreaterThan(renderCount);
    expect(api().query).toBe(before);
  });

  it("pushes a history entry on applyQuery and goes back to the previous URL", async () => {
    const user = userEvent.setup();
    const { api } = renderFilters("/?family=ipa");

    act(() => api().applyQuery({ ...EMPTY_BEER_QUERY, family: BeerFamilyEnum.STOUT, countries: ["BE"] }));
    expect(urlSearch()).toBe("?family=stout&country=BE");

    await user.click(screen.getByRole("button", { name: "back" }));
    expect(urlSearch()).toBe("?family=ipa");
    expect(api().query.family).toBe(BeerFamilyEnum.IPA);
  });

  it("replaces the history entry on setSearch", async () => {
    const user = userEvent.setup();
    const { api } = renderFilters("/?family=ipa");

    act(() => api().setFamily(BeerFamilyEnum.STOUT));
    act(() => api().setSearch("orval"));
    act(() => api().setSearch("orval tr"));
    expect(urlSearch()).toBe("?q=orval+tr&family=stout");

    await user.click(screen.getByRole("button", { name: "back" }));
    expect(urlSearch()).toBe("?family=ipa");
  });

  it("keeps the other filters when the search changes and drops the param on an empty search", () => {
    const { api } = renderFilters("/?q=orval&family=trappist&country=BE");

    act(() => api().setSearch(""));

    expect(urlSearch()).toBe("?family=trappist&country=BE");
  });

  it("pushes a history entry on setFamily and removes the styles", async () => {
    const user = userEvent.setup();
    const { api } = renderFilters("/?q=x&family=ipa&style=3&style=4&country=BE");

    act(() => api().setFamily(BeerFamilyEnum.TRAPPIST));
    expect(urlSearch()).toBe("?q=x&family=trappist&country=BE");
    expect(api().query.styleIds).toEqual([]);

    await user.click(screen.getByRole("button", { name: "back" }));
    expect(urlSearch()).toBe("?q=x&family=ipa&style=3&style=4&country=BE");
  });

  it("removes the family param when the family is cleared", () => {
    const { api } = renderFilters("/?family=trappist&q=x");

    act(() => api().setFamily(null));

    expect(urlSearch()).toBe("?q=x");
    expect(api().query.family).toBeNull();
  });
});
