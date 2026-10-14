import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "@/app";
import CollectionService from "@/api/collections/collectionService";
import ProfileService from "@/api/profiles/profileService";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";

const mockBeer = vi.hoisted(() => ({ useBeerQuery: vi.fn() }));
const mockVenues = vi.hoisted(() => ({
  useVenuesQuery: vi.fn(() => ({ venues: [], isPending: false, isError: false, refetch: vi.fn() })),
}));

vi.mock("@/pages/beerDetail/hooks/useBeerQuery", () => mockBeer);
vi.mock("@/pages/map/hooks/useVenuesQuery", () => mockVenues);

describe("App", () => {
  it.each([
    ["/", "Accueil", "Accueil"],
    ["/bieres", "Encyclopédie", "Bières"],
    ["/journal", "Journal", "Journal"],
    ["/profil", "Profil", "Profil"],
  ])("renders the page of %s with its tab marked current", (path, title, tab) => {
    renderWithProviders(<App />, { initialPath: path });

    expect(screen.getByRole("heading", { level: 1, name: title })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: tab })).toHaveAttribute("aria-current", "page");
  });

  it("shows the page loading status with the Map tab current on /carte until the page arrives", async () => {
    renderWithProviders(<App />, { initialPath: "/carte" });

    expect(screen.getByRole("status")).toHaveTextContent("Chargement de la page…");
    expect(screen.getByRole("link", { name: "Carte" })).toHaveAttribute("aria-current", "page");
    expect(await screen.findByRole("heading", { level: 1, name: "Carte" }, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Carte" })).toHaveAttribute("aria-current", "page");
  });

  it("renders the map page of /carte with its tab marked current", async () => {
    renderWithProviders(<App />, { initialPath: "/carte" });

    expect(await screen.findByRole("heading", { level: 1, name: "Carte" }, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Carte" })).toHaveAttribute("aria-current", "page");
  });

  it("never shows the page loading status on the eager pages", () => {
    renderWithProviders(<App />, { initialPath: "/" });

    expect(screen.getByRole("heading", { level: 1, name: "Accueil" })).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows the map page without a new loading status when coming back to it", async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />, { initialPath: "/carte" });
    await screen.findByRole("heading", { level: 1, name: "Carte" }, { timeout: 5000 });

    await user.click(screen.getByRole("link", { name: "Journal" }));
    await user.click(screen.getByRole("link", { name: "Carte" }));

    expect(screen.getByRole("heading", { level: 1, name: "Carte" })).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("redirects an unknown path to the home page with the Home tab current", () => {
    renderWithProviders(<App />, { initialPath: "/inconnu" });

    expect(screen.getByRole("heading", { level: 1, name: "Accueil" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Accueil" })).toHaveAttribute("aria-current", "page");
  });

  it("offers the Find profiles shortcut towards /profils on the redirected home page", () => {
    renderWithProviders(<App />, { initialPath: "/inconnu" });

    expect(screen.getByRole("link", { name: "Trouver des profils" })).toHaveAttribute("href", "/profils");
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

  it("renders the beer sheet of /bieres/1 with the beers tab current", async () => {
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

    expect(await screen.findByRole("heading", { level: 1, name: "Chimay Rouge" })).toBeInTheDocument();
    expect(mockBeer.useBeerQuery).toHaveBeenCalledWith(1);
    expect(screen.getByRole("link", { name: "Bières" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Carte" })).not.toHaveAttribute("aria-current");
  });

  it("does not redirect /bieres/abc to the encyclopedia but tells the beer is unknown", async () => {
    mockBeer.useBeerQuery.mockReturnValue({ data: undefined, isPending: true, isError: false, refetch: vi.fn() });

    renderWithProviders(<App />, { initialPath: "/bieres/abc" });

    await waitFor(() => expect(screen.getByRole("heading", { name: "Bière inconnue" })).toBeInTheDocument());
    expect(mockBeer.useBeerQuery).toHaveBeenCalledWith(null);
  });

  it("renders the people page of /profils with its rows and the Profile tab current", async () => {
    vi.spyOn(ProfileService, "getAll").mockResolvedValue([
      { id: 1, displayName: "Alice", avatar: "hop", level: 2, title: "taster", discoveredCount: 12, isFollowed: false, isMe: true },
    ] as never);

    renderWithProviders(<App />, { initialPath: "/profils" });

    expect(await screen.findByRole("heading", { level: 1, name: "Profils" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Profil" })).toHaveAttribute("aria-current", "page");
    expect(await screen.findByRole("link", { name: "Alice" })).toHaveAttribute("href", "/profils/1");
    expect(screen.getByText("Vous")).toBeInTheDocument();
  });

  it("renders the user profile page of /profils/2 with the Profile tab current", async () => {
    vi.spyOn(ProfileService, "getProfile").mockResolvedValue({
      id: 2, displayName: "Bob", avatar: "hop", level: 2, title: "taster", discoveredCount: 12, currentThreshold: 10,
      nextThreshold: 20, nextTitle: "hopHead", followerCount: 3, followingCount: 1, isFollowed: false, isMe: false,
    } as never);

    renderWithProviders(<App />, { initialPath: "/profils/2" });

    expect(await screen.findByRole("heading", { level: 1, name: "Bob" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Suivre Bob" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Profil" })).toHaveAttribute("aria-current", "page");
  });

  it("renders the collection page of /profils/2/collections/5", async () => {
    vi.spyOn(CollectionService, "getDetail").mockResolvedValue({
      id: 5, kind: "custom", name: "Trappistes", ownerId: 2,
      beers: [{ beerId: 12, beerName: "Orval", styleName: "Trappiste", family: null, drunkByMe: true, addedAt: null }],
    } as never);

    renderWithProviders(<App />, { initialPath: "/profils/2/collections/5" });

    expect(await screen.findByRole("heading", { level: 1, name: "Trappistes" })).toBeInTheDocument();
    expect(CollectionService.getDetail).toHaveBeenCalledWith(2, 5);
    expect(screen.getByText("Déjà bue")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Profil" })).toHaveAttribute("aria-current", "page");
  });

  // Must stay before the other wishlist test: the lazy instance of a loader is cached for the whole file.
  it("shows the wishlist page without any loading status once the collection page has been downloaded (same loader)", async () => {
    vi.spyOn(CollectionService, "getDetail").mockResolvedValue({
      id: 5, kind: "custom", name: "Trappistes", ownerId: 2, beers: [],
    } as never);
    vi.spyOn(CollectionService, "getWishlistOf").mockResolvedValue({
      id: null, kind: "wishlist", name: "", ownerId: 2, beers: [],
    } as never);
    const collection = renderWithProviders(<App />, { initialPath: "/profils/2/collections/5" });
    expect(await screen.findByRole("heading", { level: 1, name: "Trappistes" })).toBeInTheDocument();
    collection.unmount();

    renderWithProviders(<App />, { initialPath: "/profils/2/wishlist" });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 1, name: "À goûter" })).toBeInTheDocument();
  });

  it("renders the wishlist page of /profils/2/wishlist", async () => {
    vi.spyOn(CollectionService, "getWishlistOf").mockResolvedValue({
      id: null, kind: "wishlist", name: "", ownerId: 2,
      beers: [{ beerId: 13, beerName: "Duvel", styleName: "Blonde forte", family: null, drunkByMe: false, addedAt: null }],
    } as never);

    renderWithProviders(<App />, { initialPath: "/profils/2/wishlist" });

    expect(await screen.findByRole("heading", { level: 1, name: "À goûter" })).toBeInTheDocument();
    expect(CollectionService.getWishlistOf).toHaveBeenCalledWith(2);
    expect(screen.getByText("Pas encore")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Profil" })).toHaveAttribute("aria-current", "page");
  });

  it("shows the unknown profile panel on /profils/abc instead of redirecting", async () => {
    renderWithProviders(<App />, { initialPath: "/profils/abc" });

    expect(await screen.findByRole("heading", { level: 2, name: "Profil introuvable" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir les profils" })).toHaveAttribute("href", "/profils");
  });
});
