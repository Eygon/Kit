import { toast } from "@heroui/react";
import { QueryClient } from "@tanstack/react-query";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BottomTabBar } from "@/components/widgets/bottomTabBar/bottomTabBar";
import i18n from "@/i18n/i18n";
import type { useRemoveFromWishlistMutation } from "@/pages/profile/hooks/useRemoveFromWishlistMutation";
import type { useWishlistQuery } from "@/pages/profile/hooks/useWishlistQuery";
import { ProfilePage } from "@/pages/profile/profile";
import { StorageKeyEnum } from "@/types/enums/storage/storageKeyEnum";
import { beerKeys } from "@/utils/queryKeys/beerQueryKeys";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";

const mockDex = vi.hoisted(() => ({ useDexQuery: vi.fn() }));

const mockBadges = vi.hoisted(() => ({ useBadgesQuery: vi.fn() }));

const mockStats = vi.hoisted(() => ({ useStatsQuery: vi.fn() }));

const mockWishlist = vi.hoisted(() => ({ useWishlistQuery: vi.fn() }));

const mockRemoveFromWishlist = vi.hoisted(() => ({ useRemoveFromWishlistMutation: vi.fn() }));

vi.mock("@/hooks/dex/useDexQuery", () => mockDex);
vi.mock("@/pages/profile/hooks/useBadgesQuery", () => mockBadges);
vi.mock("@/pages/profile/hooks/useStatsQuery", () => mockStats);
vi.mock("@/pages/profile/hooks/useWishlistQuery", () => mockWishlist);
vi.mock("@/pages/profile/hooks/useRemoveFromWishlistMutation", () => mockRemoveFromWishlist);

const refetchDex = vi.fn();
const refetchBadges = vi.fn();
const refetchStats = vi.fn();
const refetchWishlist = vi.fn();
const removeItem = vi.fn();

const ORVAL = { beerId: 7, beerName: "Orval", addedAt: "2026-10-12T12:00:00.000Z" };
const CHIMAY = { beerId: 9, beerName: "Chimay Rouge", addedAt: "2026-10-11T08:00:00.000Z" };

const stubWishlist = (overrides: Record<string, unknown> = {}) =>
  mockWishlist.useWishlistQuery.mockReturnValue({
    items: [ORVAL],
    isPending: false,
    isError: false,
    refetch: refetchWishlist,
    ...overrides,
  });

const stubRemove = (overrides: Record<string, unknown> = {}) =>
  mockRemoveFromWishlist.useRemoveFromWishlistMutation.mockReturnValue({ removeItem, pendingBeerId: null, ...overrides });

const stubWishlistFetch = (deleteStatus: number) => {
  let items = [ORVAL, CHIMAY];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === "DELETE") {
      if (deleteStatus !== 204) return new Response(JSON.stringify({ message: "Down" }), { status: deleteStatus });
      items = items.filter((item) => !url.endsWith(`/${item.beerId}`));
      return new Response(null, { status: 204 });
    }
    return new Response(JSON.stringify(items), { status: 200 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

const FIRST_SIP_BADGE = {
  id: "firstSip",
  kind: "firstSip",
  family: null,
  unlocked: true,
  unlockedAt: "2026-10-12T12:00:00.000Z",
  current: 1,
  target: 1,
  comingSoon: false,
};

const stubBadges = (overrides: Record<string, unknown> = {}) =>
  mockBadges.useBadgesQuery.mockReturnValue({
    badges: [FIRST_SIP_BADGE],
    isPending: false,
    isError: false,
    refetch: refetchBadges,
    ...overrides,
  });

const STATS = {
  checkinCount: 14,
  discoveredCount: 9,
  averageAbv: 6.5,
  countries: [{ country: "BE", count: 5 }],
  favoriteFamily: "ipa",
  averageRating: 4.5,
  currentStreak: 1,
  bestStreak: 6,
  monthlyCheckins: [],
};

const stubStats = (overrides: Record<string, unknown> = {}) =>
  mockStats.useStatsQuery.mockReturnValue({
    stats: STATS,
    isPending: false,
    isError: false,
    refetch: refetchStats,
    ...overrides,
  });

const stubDex = (overrides: Record<string, unknown> = {}) =>
  mockDex.useDexQuery.mockReturnValue({
    dex: { discovered: 42, total: 120, families: [{ family: "lager", discovered: 3, total: 7 }], beers: [] },
    isPending: false,
    isError: false,
    refetch: refetchDex,
    ...overrides,
  });

describe("ProfilePage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
    refetchDex.mockResolvedValue(undefined);
    refetchBadges.mockResolvedValue(undefined);
    refetchStats.mockResolvedValue(undefined);
    refetchWishlist.mockResolvedValue(undefined);
    stubWishlist();
    stubRemove();
    stubDex();
    stubBadges();
    stubStats();
  });

  afterEach(async () => {
    await i18n.changeLanguage("fr");
    window.localStorage.clear();
  });

  it("renders its title, the demo user selector and the language selector without an empty state", () => {
    renderWithProviders(<ProfilePage />);

    expect(screen.getByRole("heading", { level: 1, name: "Profil" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Utilisateur courant/ })).toHaveTextContent("Alice (utilisateur 1)");
    expect(screen.getByRole("radiogroup", { name: "Langue de l'appli" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Français" })).toHaveAttribute("aria-checked", "true");
    expect(screen.queryByText("Aucune préférence pour l'instant")).not.toBeInTheDocument();
  });

  it("renders the family progress section below the language selector", () => {
    renderWithProviders(<ProfilePage />);

    const languageGroup = screen.getByRole("radiogroup", { name: "Langue de l'appli" });
    const progress = screen.getByRole("heading", { level: 2, name: "Progression" });
    expect(languageGroup.compareDocumentPosition(progress) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("42 / 120 découvertes")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Lager : 3 sur 7" })).toBeInTheDocument();
  });

  it("renders the share button right below the family progress section, active once the dex is loaded", () => {
    renderWithProviders(<ProfilePage />);

    const share = screen.getByRole("button", { name: "Partager" });
    const progress = screen.getByRole("heading", { level: 2, name: "Progression" });
    expect(share).toBeEnabled();
    expect(progress.compareDocumentPosition(share) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  describe("share button", () => {
    afterEach(() => {
      Reflect.deleteProperty(navigator, "share");
    });

    it("shares the discovered count and the percentage read from the dex", async () => {
      const share = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "share", { value: share, configurable: true });
      renderWithProviders(<ProfilePage />);

      await userEvent.setup().click(screen.getByRole("button", { name: "Partager" }));

      await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
      expect(share).toHaveBeenCalledWith({ text: "J'ai découvert 42 bières sur Mousse (35 %)" });
    });
  });

  it("renders the badge section right below the share button with the badges read by the hook", () => {
    renderWithProviders(<ProfilePage />);

    const share = screen.getByRole("button", { name: "Partager" });
    const badges = screen.getByRole("heading", { level: 2, name: "Badges" });
    expect(share.compareDocumentPosition(badges) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("Première gorgée")).toBeInTheDocument();
    expect(screen.getByText("Débloqué le 12/10/2026")).toBeInTheDocument();
  });

  it("shows the badge skeletons while the badges load, next to a working progress section", () => {
    stubBadges({ badges: [], isPending: true });
    renderWithProviders(<ProfilePage />);

    expect(screen.getAllByTestId("badge-skeleton")).toHaveLength(9);
    expect(screen.getByText("42 / 120 découvertes")).toBeInTheDocument();
  });

  it("shows the badges error in its section only and reads the badges again on retry", async () => {
    stubBadges({ badges: [], isError: true });
    renderWithProviders(<ProfilePage />);

    expect(screen.getByRole("alert")).toHaveTextContent("Badges indisponibles.");
    expect(screen.getByText("42 / 120 découvertes")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Réessayer" }));

    expect(refetchBadges).toHaveBeenCalledTimes(1);
    expect(refetchDex).not.toHaveBeenCalled();
  });

  it("renders the stats section right below the badge section with the stats read by the hook", () => {
    renderWithProviders(<ProfilePage />);

    const badges = screen.getByRole("heading", { level: 2, name: "Badges" });
    const stats = screen.getByRole("heading", { level: 2, name: "Statistiques" });
    expect(badges.compareDocumentPosition(stats) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("Dégustations", { selector: "dt" }).nextElementSibling).toHaveTextContent("14");
    expect(screen.getByText("Belgique · 5")).toBeInTheDocument();
  });

  it("shows the stats skeletons while the stats load, next to working progress and badges", () => {
    stubStats({ stats: null, isPending: true });
    renderWithProviders(<ProfilePage />);

    expect(screen.getAllByTestId("stats-skeleton")).toHaveLength(7);
    expect(screen.getByText("42 / 120 découvertes")).toBeInTheDocument();
    expect(screen.getByText("Première gorgée")).toBeInTheDocument();
  });

  it("shows the stats error in its section only and reads the stats again on retry", async () => {
    stubStats({ stats: null, isError: true });
    renderWithProviders(<ProfilePage />);

    expect(screen.getByRole("alert")).toHaveTextContent("Statistiques indisponibles.");
    expect(screen.getByText("42 / 120 découvertes")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Réessayer" }));

    expect(refetchStats).toHaveBeenCalledTimes(1);
    expect(refetchDex).not.toHaveBeenCalled();
    expect(refetchBadges).not.toHaveBeenCalled();
  });

  it("keeps the share button inactive while the dex is not available", () => {
    stubDex({ dex: null, isPending: true });
    renderWithProviders(<ProfilePage />);

    expect(screen.getByRole("button", { name: "Partager" })).toBeDisabled();
  });

  it("keeps the share button inactive when the dex is in error", () => {
    stubDex({ dex: null, isError: true });
    renderWithProviders(<ProfilePage />);

    expect(screen.getByRole("button", { name: "Partager" })).toBeDisabled();
  });

  it("shows the progress error and reads the dex again on retry", async () => {
    stubDex({ dex: null, isError: true });
    renderWithProviders(<ProfilePage />);

    expect(screen.getByRole("alert")).toHaveTextContent("Progression indisponible.");
    expect(screen.getByRole("radiogroup", { name: "Langue de l'appli" })).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Réessayer" }));

    expect(refetchDex).toHaveBeenCalledTimes(1);
  });

  it("keeps the demo user selector and the language selector usable next to the progress error", async () => {
    const user = userEvent.setup();
    stubDex({ dex: null, isError: true });
    renderWithProviders(<ProfilePage />);

    expect(screen.getByRole("alert")).toHaveTextContent("Progression indisponible.");
    expect(screen.getByRole("button", { name: /Utilisateur courant/ })).toBeEnabled();
    screen.getAllByRole("radio").forEach((radio) => expect(radio).toBeEnabled());
    await user.click(screen.getByRole("button", { name: /Utilisateur courant/ }));
    await user.click(screen.getByRole("option", { name: "Bob (utilisateur 2)" }));
    await user.click(screen.getByRole("radio", { name: "English" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Profile" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Current user/ })).toHaveTextContent("Bob (user 2)");
  });

  it("shows the progress skeletons while the dex loads", () => {
    stubDex({ dex: null, isPending: true });
    renderWithProviders(<ProfilePage />);

    expect(screen.getAllByTestId("family-progress-skeleton")).toHaveLength(18);
  });

  it("persists the demo user picked in the selector", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfilePage />);

    await user.click(screen.getByRole("button", { name: /Utilisateur courant/ }));
    await user.click(screen.getByRole("option", { name: "Bob (utilisateur 2)" }));

    expect(window.localStorage.getItem(StorageKeyEnum.CURRENT_USER_ID)).toBe("2");
    expect(screen.getByRole("button", { name: /Utilisateur courant/ })).toHaveTextContent("Bob (utilisateur 2)");
  });

  it("switches the app to english without reload and remembers the choice", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfilePage />);

    await user.click(screen.getByRole("radio", { name: "English" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Profile" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "English" })).toHaveAttribute("aria-checked", "true");
    expect(document.documentElement.lang).toBe("en");
    expect(window.localStorage.getItem(StorageKeyEnum.LANGUAGE)).toBe("en");
  });

  it("switches the tab bar labels to english along with the page", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <ProfilePage />
        <BottomTabBar />
      </>,
    );
    expect(screen.getByRole("link", { name: "Profil" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Carte" })).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "English" }));

    expect(await screen.findByRole("link", { name: "Profile" })).toHaveAttribute("href", "/profil");
    expect(screen.getByRole("link", { name: "Map" })).toHaveAttribute("href", "/carte");
    expect(screen.queryByRole("link", { name: "Profil" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Carte" })).not.toBeInTheDocument();
  });

  it("keeps the demo user picked when the language changes", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfilePage />);
    await user.click(screen.getByRole("button", { name: /Utilisateur courant/ }));
    await user.click(screen.getByRole("option", { name: "Bob (utilisateur 2)" }));

    await user.click(screen.getByRole("radio", { name: "English" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Profile" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Current user/ })).toHaveTextContent("Bob (user 2)");
    expect(window.localStorage.getItem(StorageKeyEnum.CURRENT_USER_ID)).toBe("2");
  });

  it("switches back to french from english", async () => {
    const user = userEvent.setup();
    await i18n.changeLanguage("en");
    renderWithProviders(<ProfilePage />);

    await user.click(screen.getByRole("radio", { name: "Français" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Profil" })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("fr");
    expect(window.localStorage.getItem(StorageKeyEnum.LANGUAGE)).toBe("fr");
  });

  it("renders the wishlist section last, after the stats, with the items read by the hook", () => {
    renderWithProviders(<ProfilePage />);

    const orderedHeadings = ["Progression", "Badges", "Statistiques", "À goûter"].map((name) =>
      screen.getByRole("heading", { level: 2, name }),
    );
    orderedHeadings.slice(1).forEach((heading, index) => {
      expect(orderedHeadings[index].compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
    const share = screen.getByRole("button", { name: "Partager" });
    expect(share.compareDocumentPosition(orderedHeadings[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("link", { name: "Orval" })).toHaveAttribute("href", "/bieres/7");
  });

  it("hands the pressed beer to the removal hook", async () => {
    renderWithProviders(<ProfilePage />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Retirer Orval des envies" }));

    expect(removeItem).toHaveBeenCalledTimes(1);
    expect(removeItem).toHaveBeenCalledWith(7);
  });

  it("shows the beer being removed as busy", () => {
    stubRemove({ pendingBeerId: 7 });
    renderWithProviders(<ProfilePage />);

    expect(screen.getByRole("button", { name: "Retirer Orval des envies" })).toHaveAttribute("aria-disabled", "true");
  });

  it("shows the wishlist error in its section only and reads the wishlist again on retry", async () => {
    stubWishlist({ items: [], isError: true });
    renderWithProviders(<ProfilePage />);

    expect(screen.getByRole("alert")).toHaveTextContent("Liste d'envies indisponible.");
    expect(screen.getByText("42 / 120 découvertes")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Réessayer" }));

    expect(refetchWishlist).toHaveBeenCalledTimes(1);
    expect(refetchDex).not.toHaveBeenCalled();
    expect(refetchStats).not.toHaveBeenCalled();
  });

  it("shows the wishlist skeletons while the wishlist loads", () => {
    stubWishlist({ items: [], isPending: true });
    renderWithProviders(<ProfilePage />);

    expect(screen.getAllByTestId("wishlist-skeleton")).toHaveLength(3);
  });

  it("shows the wishlist empty state when there is no wish", () => {
    stubWishlist({ items: [] });
    renderWithProviders(<ProfilePage />);

    expect(screen.getByRole("heading", { level: 2, name: "Aucune envie pour l'instant" })).toBeInTheDocument();
  });

  describe("demo user change with the real dex hook", () => {
    afterEach(() => vi.unstubAllGlobals());

    it("reads the progress again for the newly picked user", async () => {
      const actualDex = await vi.importActual<{ useDexQuery: typeof mockDex.useDexQuery }>("@/hooks/dex/useDexQuery");
      mockDex.useDexQuery.mockImplementation(actualDex.useDexQuery);
      const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
        const discovered = (init?.headers as Record<string, string>)["X-User-Id"] === "2" ? 7 : 42;
        return new Response(JSON.stringify({ discovered, total: 120, families: [], beers: [] }), { status: 200 });
      });
      vi.stubGlobal("fetch", fetchMock);
      const user = userEvent.setup();
      renderWithProviders(<ProfilePage />);
      expect(await screen.findByText("42 / 120 découvertes")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /Utilisateur courant/ }));
      await user.click(screen.getByRole("option", { name: "Bob (utilisateur 2)" }));

      expect(await screen.findByText("7 / 120 découvertes")).toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe("wishlist removal with the real hooks", () => {
    const createRetryingClient = () =>
      new QueryClient({ defaultOptions: { queries: { retry: 1, retryDelay: 1, gcTime: Infinity } } });

    beforeEach(async () => {
      const actualQuery = await vi.importActual<{ useWishlistQuery: typeof useWishlistQuery }>("@/pages/profile/hooks/useWishlistQuery");
      const actualRemove = await vi.importActual<{ useRemoveFromWishlistMutation: typeof useRemoveFromWishlistMutation }>("@/pages/profile/hooks/useRemoveFromWishlistMutation");
      mockWishlist.useWishlistQuery.mockImplementation(actualQuery.useWishlistQuery);
      mockRemoveFromWishlist.useRemoveFromWishlistMutation.mockImplementation(actualRemove.useRemoveFromWishlistMutation);
      vi.spyOn(toast, "success").mockImplementation(() => "toast-id");
      vi.spyOn(toast, "danger").mockImplementation(() => "toast-id");
    });

    afterEach(() => {
      vi.mocked(toast.success).mockRestore();
      vi.mocked(toast.danger).mockRestore();
      vi.unstubAllGlobals();
    });

    it("removes the beer from the list, shows one success message and refreshes the beers", async () => {
      stubWishlistFetch(204);
      const client = createRetryingClient();
      const invalidate = vi.spyOn(client, "invalidateQueries");
      renderWithProviders(<ProfilePage />, { queryClient: client });

      await userEvent.setup().click(await screen.findByRole("button", { name: "Retirer Orval des envies" }));

      await waitFor(() => expect(screen.queryByRole("link", { name: "Orval" })).not.toBeInTheDocument());
      expect(screen.getByRole("link", { name: "Chimay Rouge" })).toBeInTheDocument();
      expect(toast.success).toHaveBeenCalledTimes(1);
      expect(toast.success).toHaveBeenCalledWith("Retirée de vos envies.");
      expect(toast.danger).not.toHaveBeenCalled();
      expect(invalidate).toHaveBeenCalledWith({ queryKey: beerKeys.all() });
    });

    it("keeps the beer in the list and shows one error message when the removal fails", async () => {
      const fetchMock = stubWishlistFetch(500);
      renderWithProviders(<ProfilePage />, { queryClient: createRetryingClient() });

      await userEvent.setup().click(await screen.findByRole("button", { name: "Retirer Orval des envies" }));

      await waitFor(() => expect(toast.danger).toHaveBeenCalledTimes(1));
      expect(vi.mocked(toast.danger).mock.calls[0][0]).toBeTruthy();
      expect(screen.getByRole("link", { name: "Orval" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Chimay Rouge" })).toBeInTheDocument();
      expect(toast.success).not.toHaveBeenCalled();
      expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "DELETE")).toHaveLength(1);
    });

    it("keeps the beer, shows one error message and reads the list again when it was already removed elsewhere", async () => {
      const fetchMock = stubWishlistFetch(404);
      renderWithProviders(<ProfilePage />, { queryClient: createRetryingClient() });

      await userEvent.setup().click(await screen.findByRole("button", { name: "Retirer Orval des envies" }));

      await waitFor(() => expect(toast.danger).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(fetchMock.mock.calls.filter(([, init]) => init?.method !== "DELETE")).toHaveLength(2));
      expect(screen.getByRole("link", { name: "Orval" })).toBeInTheDocument();
      expect(toast.success).not.toHaveBeenCalled();
    });
  });
});
