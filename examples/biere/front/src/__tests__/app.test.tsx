import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "@/app";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";

const mockBeer = vi.hoisted(() => ({ useBeerQuery: vi.fn() }));
const mockVenues = vi.hoisted(() => ({
  useVenuesQuery: vi.fn(() => ({ venues: [], isPending: false, isError: false, refetch: vi.fn() })),
}));

vi.mock("@/pages/beerDetail/hooks/useBeerQuery", () => mockBeer);
vi.mock("@/pages/map/hooks/useVenuesQuery", () => mockVenues);

describe("App", () => {
  it.each([
    ["/", "Encyclopédie"],
    ["/carte", "Carte"],
    ["/journal", "Journal"],
    ["/profil", "Profil"],
  ])("renders the page of %s with its tab marked current", (path, title) => {
    renderWithProviders(<App />, { initialPath: path });

    expect(screen.getByRole("heading", { level: 1, name: title })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: title })).toHaveAttribute("aria-current", "page");
  });

  it("redirects an unknown path to the encyclopedia", () => {
    renderWithProviders(<App />, { initialPath: "/inconnu" });

    expect(screen.getByRole("heading", { level: 1, name: "Encyclopédie" })).toBeInTheDocument();
  });

  it("navigates between pages from the tab bar", async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />);

    await user.click(screen.getByRole("link", { name: "Journal" }));

    expect(screen.getByRole("heading", { level: 1, name: "Journal" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Journal" })).toHaveAttribute("aria-current", "page");
  });

  it("stays in the light theme even when the system prefers dark", () => {
    const matchMedia = vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) => ({ matches: true, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }) as unknown as MediaQueryList,
    );

    renderWithProviders(<App />);

    expect(document.documentElement).not.toHaveClass("dark");
    expect(document.documentElement).not.toHaveAttribute("data-theme", "dark");
    matchMedia.mockRestore();
  });

  it("keeps the content clear of the tab bar and the safe area", () => {
    renderWithProviders(<App />);

    const main = screen.getByRole("main");
    expect(main.className).toContain("pb-[calc(6rem+env(safe-area-inset-bottom))]");
    expect(main.parentElement?.className).toContain("min-h-dvh");
  });

  it("renders the beer sheet of /bieres/1 with the encyclopedia tab current", () => {
    mockBeer.useBeerQuery.mockReturnValue({
      data: {
        id: 1,
        name: "Chimay Rouge",
        breweryName: "Bières de Chimay",
        country: "BE",
        styleId: 4,
        styleName: "Dubbel trappiste",
        family: null,
        abv: 7,
        aromas: [],
        formats: [],
        description: "Une trappiste.",
        averageRating: null,
        reviewCount: 0,
        ratingDistribution: [],
        criteria: [],
      },
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderWithProviders(<App />, { initialPath: "/bieres/1" });

    expect(mockBeer.useBeerQuery).toHaveBeenCalledWith(1);
    expect(screen.getByRole("heading", { level: 1, name: "Chimay Rouge" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Encyclopédie" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Carte" })).not.toHaveAttribute("aria-current");
  });

  it("does not redirect /bieres/abc to the encyclopedia but tells the beer is unknown", async () => {
    mockBeer.useBeerQuery.mockReturnValue({ data: undefined, isPending: true, isError: false, refetch: vi.fn() });

    renderWithProviders(<App />, { initialPath: "/bieres/abc" });

    await waitFor(() => expect(screen.getByRole("heading", { name: "Bière inconnue" })).toBeInTheDocument());
    expect(mockBeer.useBeerQuery).toHaveBeenCalledWith(null);
  });
});
