import { act, screen } from "@testing-library/react";
import { Route, Routes, useLocation, useNavigationType } from "react-router";
import { useUndrunkOnlyFilter } from "@/pages/map/hooks/useUndrunkOnlyFilter";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";

type UndrunkApi = {
  isUndrunkOnly: boolean;
  setUndrunkOnly: (next: boolean) => void;
};

const renderFilter = (initialPath: string) => {
  const holder: { api: UndrunkApi | null } = { api: null };

  const Probe = () => {
    const api: UndrunkApi = useUndrunkOnlyFilter();
    const location = useLocation();
    holder.api = api;
    const navigationType = useNavigationType();
    return (
      <>
        <output aria-label="search">{location.search}</output>
        <output aria-label="navigation">{navigationType}</output>
      </>
    );
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
const navigationType = () => screen.getByLabelText("navigation").textContent;

describe("useUndrunkOnlyFilter", () => {
  it("is off for a bare address", () => {
    const api = renderFilter("/carte");

    expect(api().isUndrunkOnly).toBe(false);
  });

  it("is on only when the undrunk parameter is exactly 1", () => {
    const api = renderFilter("/carte?undrunk=1");

    expect(api().isUndrunkOnly).toBe(true);
  });

  it.each(["0", "true", "", "2"])("is off when the undrunk parameter is %j", (value) => {
    const api = renderFilter(`/carte?undrunk=${value}`);

    expect(api().isUndrunkOnly).toBe(false);
  });

  it("adds the parameter and keeps every other one", () => {
    const api = renderFilter("/carte?type=bar&type=shop&family=stout&confirmed=1");

    act(() => api().setUndrunkOnly(true));

    expect(urlSearch()).toBe("?type=bar&type=shop&family=stout&confirmed=1&undrunk=1");
    expect(api().isUndrunkOnly).toBe(true);
  });

  it("removes only the parameter and keeps every other one", () => {
    const api = renderFilter("/carte?type=bar&undrunk=1&family=stout");

    act(() => api().setUndrunkOnly(false));

    expect(urlSearch()).toBe("?type=bar&family=stout");
    expect(api().isUndrunkOnly).toBe(false);
  });

  it("replaces the history entry instead of pushing one", () => {
    const api = renderFilter("/carte");
    expect(navigationType()).toBe("POP");

    act(() => api().setUndrunkOnly(true));

    expect(navigationType()).toBe("REPLACE");
    expect(urlSearch()).toBe("?undrunk=1");
  });
});
