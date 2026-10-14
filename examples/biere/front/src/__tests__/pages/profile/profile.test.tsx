import { toast } from "@heroui/react";
import { QueryClient } from "@tanstack/react-query";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getAvatarArtwork } from "@/components/elements/userAvatar/utils/avatarArtworks";
import { BottomTabBar } from "@/components/widgets/bottomTabBar/bottomTabBar";
import i18n from "@/i18n/i18n";
import type { useRemoveFromWishlistMutation } from "@/pages/profile/hooks/useRemoveFromWishlistMutation";
import type { useWishlistQuery } from "@/pages/profile/hooks/useWishlistQuery";
import { ProfilePage } from "@/pages/profile/profile";
import { StorageKeyEnum } from "@/types/enums/storage/storageKeyEnum";
import { beerKeys } from "@/utils/queryKeys/beerQueryKeys";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";

const mockDex = vi.hoisted(() => ({ useDexQuery: vi.fn() }));

const mockProfile = vi.hoisted(() => ({ useProfileQuery: vi.fn() }));

const mockBadges = vi.hoisted(() => ({ useBadgesQuery: vi.fn() }));

const mockStats = vi.hoisted(() => ({ useStatsQuery: vi.fn() }));

const mockWishlist = vi.hoisted(() => ({ useWishlistQuery: vi.fn() }));

const mockRemoveFromWishlist = vi.hoisted(() => ({
  useRemoveFromWishlistMutation: vi.fn(),
}));

const mockCollections = vi.hoisted(() => ({
  useUserCollectionsQuery: vi.fn(),
}));

const mockCreateCollection = vi.hoisted(() => ({
  useCreateCollectionMutation: vi.fn(),
}));

vi.mock("@/hooks/dex/useDexQuery", () => mockDex);
vi.mock("@/hooks/profile/useProfileQuery", () => mockProfile);
vi.mock("@/pages/profile/hooks/useBadgesQuery", () => mockBadges);
vi.mock("@/pages/profile/hooks/useStatsQuery", () => mockStats);
vi.mock("@/pages/profile/hooks/useWishlistQuery", () => mockWishlist);
vi.mock(
  "@/pages/profile/hooks/useRemoveFromWishlistMutation",
  () => mockRemoveFromWishlist,
);
vi.mock("@/hooks/collections/useUserCollectionsQuery", () => mockCollections);
vi.mock(
  "@/pages/profile/hooks/useCreateCollectionMutation",
  () => mockCreateCollection,
);

const refetchDex = vi.fn();
const refetchProfile = vi.fn();
const refetchBadges = vi.fn();
const refetchStats = vi.fn();
const refetchWishlist = vi.fn();
const removeItem = vi.fn();
const refetchCollections = vi.fn();
const createCollection = vi.fn();

const stubCreateCollection = () =>
  mockCreateCollection.useCreateCollectionMutation.mockReturnValue({
    createCollection,
    isPending: false,
  });

const customCollections = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    id: index + 10,
    kind: "custom",
    name: `Collection ${index + 1}`,
    beerCount: 0,
  }));

const COLLECTIONS = [
  { id: null, kind: "wishlist", name: "", beerCount: 2 },
  { id: 5, kind: "custom", name: "Trappistes", beerCount: 1 },
];

const stubCollections = (overrides: Record<string, unknown> = {}) =>
  mockCollections.useUserCollectionsQuery.mockReturnValue({
    collections: COLLECTIONS,
    isPending: false,
    isError: false,
    refetch: refetchCollections,
    ...overrides,
  });

const ORVAL = {
  beerId: 7,
  beerName: "Orval",
  addedAt: "2026-10-12T12:00:00.000Z",
};
const CHIMAY = {
  beerId: 9,
  beerName: "Chimay Rouge",
  addedAt: "2026-10-11T08:00:00.000Z",
};

const stubWishlist = (overrides: Record<string, unknown> = {}) =>
  mockWishlist.useWishlistQuery.mockReturnValue({
    items: [ORVAL],
    isPending: false,
    isError: false,
    refetch: refetchWishlist,
    ...overrides,
  });

const stubRemove = (overrides: Record<string, unknown> = {}) =>
  mockRemoveFromWishlist.useRemoveFromWishlistMutation.mockReturnValue({
    removeItem,
    pendingBeerId: null,
    ...overrides,
  });

const stubWishlistFetch = (deleteStatus: number) => {
  let items = [ORVAL, CHIMAY];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === "DELETE") {
      if (deleteStatus !== 204)
        return new Response(JSON.stringify({ message: "Down" }), {
          status: deleteStatus,
        });
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

const ALICE_PROFILE = {
  id: 1,
  displayName: "Alice",
  avatar: "hop",
  level: 2,
  title: "taster",
  discoveredCount: 12,
  currentThreshold: 5,
  nextThreshold: 15,
  nextTitle: "hopHead",
  followerCount: 0,
  followingCount: 2,
  isFollowed: false,
  isMe: true,
};

const stubProfile = (overrides: Record<string, unknown> = {}) =>
  mockProfile.useProfileQuery.mockReturnValue({
    profile: ALICE_PROFILE,
    isPending: false,
    isError: false,
    refetch: refetchProfile,
    ...overrides,
  });

const stubDex = (overrides: Record<string, unknown> = {}) =>
  mockDex.useDexQuery.mockReturnValue({
    dex: {
      discovered: 42,
      total: 120,
      families: [{ family: "lager", discovered: 3, total: 7 }],
      beers: [],
    },
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
    refetchProfile.mockResolvedValue(undefined);
    refetchBadges.mockResolvedValue(undefined);
    refetchStats.mockResolvedValue(undefined);
    refetchWishlist.mockResolvedValue(undefined);
    refetchCollections.mockResolvedValue(undefined);
    createCollection.mockResolvedValue({
      id: 9,
      kind: "custom",
      name: "Trappistes",
      beerCount: 0,
    });
    stubCreateCollection();
    stubCollections();
    stubWishlist();
    stubRemove();
    stubDex();
    stubProfile();
    stubBadges();
    stubStats();
  });

  afterEach(async () => {
    await i18n.changeLanguage("fr");
    window.localStorage.clear();
  });

  it("renders its title, the demo user selector and the language selector without an empty state", () => {
    renderWithProviders(<ProfilePage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Profil" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Utilisateur courant/ }),
    ).toHaveTextContent("Alice (utilisateur 1)");
    expect(
      screen.getByRole("radiogroup", { name: "Langue de l'appli" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Français" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(
      screen.queryByText("Aucune préférence pour l'instant"),
    ).not.toBeInTheDocument();
  });

  it("renders the family progress section below the language selector", () => {
    renderWithProviders(<ProfilePage />);

    const languageGroup = screen.getByRole("radiogroup", {
      name: "Langue de l'appli",
    });
    const progress = screen.getByRole("heading", {
      level: 2,
      name: "Progression",
    });
    expect(
      languageGroup.compareDocumentPosition(progress) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByText("42 / 120 découvertes")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "Lager : 3 sur 7" }),
    ).toBeInTheDocument();
  });

  it("renders the share button right below the family progress section, active once the dex is loaded", () => {
    renderWithProviders(<ProfilePage />);

    const share = screen.getByRole("button", { name: "Partager" });
    const progress = screen.getByRole("heading", {
      level: 2,
      name: "Progression",
    });
    expect(share).toBeEnabled();
    expect(
      progress.compareDocumentPosition(share) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  describe("share button", () => {
    afterEach(() => {
      Reflect.deleteProperty(navigator, "share");
    });

    it("shares the discovered count and the percentage read from the dex", async () => {
      const share = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "share", {
        value: share,
        configurable: true,
      });
      renderWithProviders(<ProfilePage />);

      await userEvent
        .setup()
        .click(screen.getByRole("button", { name: "Partager" }));

      await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
      expect(share).toHaveBeenCalledWith({
        text: "J'ai découvert 42 bières sur Mousse (35 %)",
      });
    });
  });

  it("renders the badge section right below the share button with the badges read by the hook", () => {
    renderWithProviders(<ProfilePage />);

    const share = screen.getByRole("button", { name: "Partager" });
    const badges = screen.getByRole("heading", { level: 2, name: "Badges" });
    expect(
      share.compareDocumentPosition(badges) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
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

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Badges indisponibles.",
    );
    expect(screen.getByText("42 / 120 découvertes")).toBeInTheDocument();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Réessayer" }));

    expect(refetchBadges).toHaveBeenCalledTimes(1);
    expect(refetchDex).not.toHaveBeenCalled();
  });

  it("renders the stats section right below the badge section with the stats read by the hook", () => {
    renderWithProviders(<ProfilePage />);

    const badges = screen.getByRole("heading", { level: 2, name: "Badges" });
    const stats = screen.getByRole("heading", {
      level: 2,
      name: "Statistiques",
    });
    expect(
      badges.compareDocumentPosition(stats) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      screen.getByText("Dégustations", { selector: "dt" }).nextElementSibling,
    ).toHaveTextContent("14");
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

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Statistiques indisponibles.",
    );
    expect(screen.getByText("42 / 120 découvertes")).toBeInTheDocument();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Réessayer" }));

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

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Progression indisponible.",
    );
    expect(
      screen.getByRole("radiogroup", { name: "Langue de l'appli" }),
    ).toBeInTheDocument();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Réessayer" }));

    expect(refetchDex).toHaveBeenCalledTimes(1);
  });

  it("keeps the demo user selector and the language selector usable next to the progress error", async () => {
    const user = userEvent.setup();
    stubDex({ dex: null, isError: true });
    renderWithProviders(<ProfilePage />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Progression indisponible.",
    );
    expect(
      screen.getByRole("button", { name: /Utilisateur courant/ }),
    ).toBeEnabled();
    screen
      .getAllByRole("radio")
      .forEach((radio) => expect(radio).toBeEnabled());
    await user.click(
      screen.getByRole("button", { name: /Utilisateur courant/ }),
    );
    await user.click(
      screen.getByRole("option", { name: "Bob (utilisateur 2)" }),
    );
    await user.click(screen.getByRole("radio", { name: "English" }));

    expect(
      await screen.findByRole("heading", { level: 1, name: "Profile" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Current user/ }),
    ).toHaveTextContent("Bob (user 2)");
  });

  it("shows the progress skeletons while the dex loads", () => {
    stubDex({ dex: null, isPending: true });
    renderWithProviders(<ProfilePage />);

    expect(screen.getAllByTestId("family-progress-skeleton")).toHaveLength(18);
  });

  it("persists the demo user picked in the selector", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfilePage />);

    await user.click(
      screen.getByRole("button", { name: /Utilisateur courant/ }),
    );
    await user.click(
      screen.getByRole("option", { name: "Bob (utilisateur 2)" }),
    );

    expect(window.localStorage.getItem(StorageKeyEnum.CURRENT_USER_ID)).toBe(
      "2",
    );
    expect(
      screen.getByRole("button", { name: /Utilisateur courant/ }),
    ).toHaveTextContent("Bob (utilisateur 2)");
  });

  it("switches the app to english without reload and remembers the choice", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfilePage />);

    await user.click(screen.getByRole("radio", { name: "English" }));

    expect(
      await screen.findByRole("heading", { level: 1, name: "Profile" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "English" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
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

    expect(
      await screen.findByRole("link", { name: "Profile" }),
    ).toHaveAttribute("href", "/profil");
    expect(screen.getByRole("link", { name: "Map" })).toHaveAttribute(
      "href",
      "/carte",
    );
    expect(
      screen.queryByRole("link", { name: "Profil" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Carte" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the demo user picked when the language changes", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfilePage />);
    await user.click(
      screen.getByRole("button", { name: /Utilisateur courant/ }),
    );
    await user.click(
      screen.getByRole("option", { name: "Bob (utilisateur 2)" }),
    );

    await user.click(screen.getByRole("radio", { name: "English" }));

    expect(
      await screen.findByRole("heading", { level: 1, name: "Profile" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Current user/ }),
    ).toHaveTextContent("Bob (user 2)");
    expect(window.localStorage.getItem(StorageKeyEnum.CURRENT_USER_ID)).toBe(
      "2",
    );
  });

  it("switches back to french from english", async () => {
    const user = userEvent.setup();
    await i18n.changeLanguage("en");
    renderWithProviders(<ProfilePage />);

    await user.click(screen.getByRole("radio", { name: "Français" }));

    expect(
      await screen.findByRole("heading", { level: 1, name: "Profil" }),
    ).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("fr");
    expect(window.localStorage.getItem(StorageKeyEnum.LANGUAGE)).toBe("fr");
  });

  it("renders the collections section right below the profile header with the collections read by the hook", () => {
    renderWithProviders(<ProfilePage />);

    const header = screen.getByRole("heading", { level: 2, name: "Alice" });
    const collections = screen.getByRole("heading", {
      level: 2,
      name: "Mes collections",
    });
    const demoUser = screen.getByRole("button", {
      name: /Utilisateur courant/,
    });
    expect(
      header.compareDocumentPosition(collections) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      collections.compareDocumentPosition(demoUser) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    const section = collections.closest("section") as HTMLElement;
    const rows = within(section).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(
      within(rows[0]).getByRole("link", { name: "À goûter" }),
    ).toBeInTheDocument();
    expect(within(rows[0]).getByText("2 bières")).toBeInTheDocument();
    expect(
      within(rows[1]).getByRole("link", { name: "Trappistes" }),
    ).toBeInTheDocument();
    expect(within(rows[1]).getByText("1 bière")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "À goûter" })).toHaveAttribute(
      "href",
      "/profils/1/wishlist",
    );
    expect(screen.getByRole("link", { name: "Trappistes" })).toHaveAttribute(
      "href",
      "/profils/1/collections/5",
    );
  });

  it("offers « Nouvelle collection » inside the collections block, above the demo user selector", () => {
    renderWithProviders(<ProfilePage />);

    const collections = screen.getByRole("heading", {
      level: 2,
      name: "Mes collections",
    });
    const create = screen.getByRole("button", { name: "Nouvelle collection" });
    const demoUser = screen.getByRole("button", {
      name: /Utilisateur courant/,
    });
    expect(
      collections.compareDocumentPosition(create) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      create.compareDocumentPosition(demoUser) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("places « Nouvelle collection » inside the « Mes collections » section, next to its title", () => {
    renderWithProviders(<ProfilePage />);

    const section = screen
      .getByRole("heading", { level: 2, name: "Mes collections" })
      .closest("section") as HTMLElement;
    expect(
      within(section).getByRole("button", { name: "Nouvelle collection" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Nouvelle collection" }),
    ).toHaveLength(1);
  });

  it("creates « Trappistes » from the sheet and closes it", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfilePage />);

    await user.click(
      screen.getByRole("button", { name: "Nouvelle collection" }),
    );
    await user.type(
      await screen.findByRole("textbox", { name: /Nom de la collection/ }),
      "Trappistes",
    );
    await user.click(screen.getByRole("button", { name: "Créer" }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(createCollection).toHaveBeenCalledTimes(1);
    expect(createCollection).toHaveBeenCalledWith("Trappistes");
  });

  it("keeps the sheet open when the creation is refused", async () => {
    createCollection.mockRejectedValue(new Error("Conflict"));
    const user = userEvent.setup();
    renderWithProviders(<ProfilePage />);

    await user.click(
      screen.getByRole("button", { name: "Nouvelle collection" }),
    );
    await user.type(
      await screen.findByRole("textbox", { name: /Nom de la collection/ }),
      "Trappistes",
    );
    await user.click(screen.getByRole("button", { name: "Créer" }));

    await waitFor(() => expect(createCollection).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("refuses a new collection with « 20 collections au plus » when twenty exist, wishlist apart", async () => {
    stubCollections({
      collections: [
        { id: null, kind: "wishlist", name: "", beerCount: 2 },
        ...customCollections(20),
      ],
    });
    const user = userEvent.setup();
    renderWithProviders(<ProfilePage />);

    await user.click(
      screen.getByRole("button", { name: "Nouvelle collection" }),
    );
    await user.type(
      await screen.findByRole("textbox", { name: /Nom de la collection/ }),
      "Abbayes",
    );
    await user.click(screen.getByRole("button", { name: "Créer" }));

    expect(
      await screen.findByText("20 collections au plus"),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(createCollection).not.toHaveBeenCalled();
  });

  it("still accepts a new collection when nineteen exist next to the wishlist", async () => {
    stubCollections({
      collections: [
        { id: null, kind: "wishlist", name: "", beerCount: 2 },
        ...customCollections(19),
      ],
    });
    const user = userEvent.setup();
    renderWithProviders(<ProfilePage />);

    await user.click(
      screen.getByRole("button", { name: "Nouvelle collection" }),
    );
    await user.type(
      await screen.findByRole("textbox", { name: /Nom de la collection/ }),
      "Abbayes",
    );
    await user.click(screen.getByRole("button", { name: "Créer" }));

    await waitFor(() =>
      expect(createCollection).toHaveBeenCalledWith("Abbayes"),
    );
  });

  it("reads the collections of the current user", () => {
    renderWithProviders(<ProfilePage />);

    expect(mockCollections.useUserCollectionsQuery).toHaveBeenCalledWith(
      1,
      true,
    );
  });

  it("shows the collection skeletons while they load, next to a working progress section", () => {
    stubCollections({ collections: [], isPending: true });
    renderWithProviders(<ProfilePage />);

    expect(screen.getAllByTestId("collections-skeleton")).toHaveLength(3);
    expect(screen.getByText("42 / 120 découvertes")).toBeInTheDocument();
  });

  it("shows the collections error in its section only and reads the collections again on retry", async () => {
    stubCollections({ collections: [], isError: true });
    renderWithProviders(<ProfilePage />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Collections indisponibles.",
    );
    expect(screen.getByText("42 / 120 découvertes")).toBeInTheDocument();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Réessayer" }));

    expect(refetchCollections).toHaveBeenCalledTimes(1);
    expect(refetchDex).not.toHaveBeenCalled();
    expect(refetchProfile).not.toHaveBeenCalled();
  });

  it("renders the wishlist section last, after the stats, with the items read by the hook", () => {
    renderWithProviders(<ProfilePage />);

    const orderedHeadings = [
      "Progression",
      "Badges",
      "Statistiques",
      "À goûter",
    ].map((name) => screen.getByRole("heading", { level: 2, name }));
    orderedHeadings.slice(1).forEach((heading, index) => {
      expect(
        orderedHeadings[index].compareDocumentPosition(heading) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });
    const share = screen.getByRole("button", { name: "Partager" });
    expect(
      share.compareDocumentPosition(orderedHeadings[1]) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "Orval" })).toHaveAttribute(
      "href",
      "/bieres/7",
    );
  });

  it("hands the pressed beer to the removal hook", async () => {
    renderWithProviders(<ProfilePage />);

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Retirer Orval des envies" }));

    expect(removeItem).toHaveBeenCalledTimes(1);
    expect(removeItem).toHaveBeenCalledWith(7);
  });

  it("shows the beer being removed as busy", () => {
    stubRemove({ pendingBeerId: 7 });
    renderWithProviders(<ProfilePage />);

    expect(
      screen.getByRole("button", { name: "Retirer Orval des envies" }),
    ).toHaveAttribute("aria-disabled", "true");
  });

  it("shows the wishlist error in its section only and reads the wishlist again on retry", async () => {
    stubWishlist({ items: [], isError: true });
    renderWithProviders(<ProfilePage />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Liste d'envies indisponible.",
    );
    expect(screen.getByText("42 / 120 découvertes")).toBeInTheDocument();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Réessayer" }));

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

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Aucune envie pour l'instant",
      }),
    ).toBeInTheDocument();
  });

  describe("profile header", () => {
    it("renders the profile card right under the page title and before the demo user selector", () => {
      renderWithProviders(<ProfilePage />);

      const title = screen.getByRole("heading", { level: 1, name: "Profil" });
      const name = screen.getByRole("heading", { level: 2, name: "Alice" });
      const demoUser = screen.getByRole("button", {
        name: /Utilisateur courant/,
      });
      expect(
        title.compareDocumentPosition(name) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        name.compareDocumentPosition(demoUser) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(screen.getByText("Niv. 2 · Dégustateur")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "0 abonné" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "2 abonnements" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("progressbar", { name: "Progression" }),
      ).toHaveAttribute("aria-valuetext", "12 / 15 pour Houblonneur");
    });

    it("keeps the F4 sections below the card, in their order", () => {
      renderWithProviders(<ProfilePage />);

      const order = [
        screen.getByRole("heading", { level: 2, name: "Alice" }),
        screen.getByRole("button", { name: /Utilisateur courant/ }),
        screen.getByRole("radiogroup", { name: "Langue de l'appli" }),
        screen.getByRole("heading", { level: 2, name: "Progression" }),
        screen.getByRole("heading", { level: 2, name: "Badges" }),
        screen.getByRole("heading", { level: 2, name: "Statistiques" }),
        screen.getByRole("heading", { level: 2, name: "À goûter" }),
      ];
      order.slice(1).forEach((node, index) => {
        expect(
          order[index]?.compareDocumentPosition(node) &
            Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
      });
    });

    it("reads the profile of the current demo user", () => {
      renderWithProviders(<ProfilePage />);

      expect(mockProfile.useProfileQuery).toHaveBeenCalledWith(1);
    });

    it("reads the profile of the newly picked demo user", async () => {
      const user = userEvent.setup();
      renderWithProviders(<ProfilePage />);

      await user.click(
        screen.getByRole("button", { name: /Utilisateur courant/ }),
      );
      await user.click(
        screen.getByRole("option", { name: "Bob (utilisateur 2)" }),
      );

      expect(mockProfile.useProfileQuery).toHaveBeenLastCalledWith(2);
    });

    it("shows the card skeleton while the profile loads, next to working F4 sections", () => {
      stubProfile({ profile: null, isPending: true });
      renderWithProviders(<ProfilePage />);

      expect(screen.getByTestId("profile-header-skeleton")).toBeInTheDocument();
      expect(screen.getByText("42 / 120 découvertes")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Utilisateur courant/ }),
      ).toBeInTheDocument();
      expect(screen.getByText("Première gorgée")).toBeInTheDocument();
    });

    it("shows the profile error in the card only and reads the profile again on retry", async () => {
      stubProfile({ profile: null, isError: true });
      renderWithProviders(<ProfilePage />);

      expect(screen.getAllByRole("alert")).toHaveLength(1);
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Impossible de charger le profil",
      );
      expect(screen.getByText("42 / 120 découvertes")).toBeInTheDocument();
      expect(screen.getByText("Première gorgée")).toBeInTheDocument();
      await userEvent
        .setup()
        .click(screen.getByRole("button", { name: "Réessayer" }));

      expect(refetchProfile).toHaveBeenCalledTimes(1);
    });
  });

  describe("demo user change with the real profile hook", () => {
    afterEach(() => vi.unstubAllGlobals());

    it("shows the profile of the newly picked user", async () => {
      const actualProfile = await vi.importActual<{
        useProfileQuery: typeof mockProfile.useProfileQuery;
      }>("@/hooks/profile/useProfileQuery");
      mockProfile.useProfileQuery.mockImplementation(
        actualProfile.useProfileQuery,
      );
      const fetchMock = vi.fn(async (url: string) => {
        const isBob = url.endsWith("/users/2/profile");
        return new Response(
          JSON.stringify({
            ...ALICE_PROFILE,
            id: isBob ? 2 : 1,
            displayName: isBob ? "Bob" : "Alice",
            avatar: isBob ? "glass" : "hop",
            followerCount: isBob ? 4 : 0,
          }),
          { status: 200 },
        );
      });
      vi.stubGlobal("fetch", fetchMock);
      const user = userEvent.setup();
      renderWithProviders(<ProfilePage />);
      expect(
        await screen.findByRole("heading", { level: 2, name: "Alice" }),
      ).toBeInTheDocument();

      await user.click(
        screen.getByRole("button", { name: /Utilisateur courant/ }),
      );
      await user.click(
        screen.getByRole("option", { name: "Bob (utilisateur 2)" }),
      );

      expect(
        await screen.findByRole("heading", { level: 2, name: "Bob" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "4 abonnés" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "2 abonnements" }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("heading", { level: 2, name: "Alice" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("edit profile button", () => {
    it("is offered in the profile card once the profile is loaded", () => {
      renderWithProviders(<ProfilePage />);

      const edit = screen.getByRole("button", { name: "Modifier" });
      const name = screen.getByRole("heading", { level: 2, name: "Alice" });
      expect(name.parentElement).toContainElement(edit);
    });

    it.each([
      ["while the profile loads", { profile: null, isPending: true }],
      ["when the profile cannot be read", { profile: null, isError: true }],
    ])("is not offered %s", (_label, overrides) => {
      stubProfile(overrides);
      renderWithProviders(<ProfilePage />);

      expect(
        screen.queryByRole("button", { name: "Modifier" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("profile edition with the real profile hook", () => {
    afterEach(() => vi.unstubAllGlobals());

    const stubServer = (putStatus: number) => {
      let stored = { ...ALICE_PROFILE };
      const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.method === "PUT") {
          if (putStatus !== 200)
            return new Response(JSON.stringify({ message: "Down" }), {
              status: putStatus,
            });
          stored = {
            ...stored,
            ...(JSON.parse(init.body as string) as Record<string, unknown>),
          };
          return new Response(JSON.stringify(stored), { status: 200 });
        }
        return new Response(JSON.stringify(stored), { status: 200 });
      });
      vi.stubGlobal("fetch", fetchMock);
      return fetchMock;
    };

    const useRealProfileHook = async () => {
      const actualProfile = await vi.importActual<{
        useProfileQuery: typeof mockProfile.useProfileQuery;
      }>("@/hooks/profile/useProfileQuery");
      mockProfile.useProfileQuery.mockImplementation(
        actualProfile.useProfileQuery,
      );
    };

    const hasAvatarArtwork = (avatar: string) => {
      const [firstShape] = getAvatarArtwork(avatar).shapes;
      return document.querySelector(`path[d="${firstShape?.d}"]`) !== null;
    };

    it("shows the new name and the new avatar in the profile card after saving", async () => {
      await useRealProfileHook();
      stubServer(200);
      vi.spyOn(toast, "success").mockImplementation(() => "toast-id");
      const user = userEvent.setup();
      renderWithProviders(<ProfilePage />);
      expect(
        await screen.findByRole("heading", { level: 2, name: "Alice" }),
      ).toBeInTheDocument();
      expect(hasAvatarArtwork("hop")).toBe(true);
      expect(hasAvatarArtwork("foam")).toBe(false);

      await user.click(screen.getByRole("button", { name: "Modifier" }));
      const nameField = await screen.findByRole("textbox", {
        name: /Nom d'affichage/,
      });
      await user.clear(nameField);
      await user.type(nameField, "Alice B");
      await user.click(screen.getByRole("radio", { name: "Mousse" }));
      await user.click(screen.getByRole("button", { name: "Enregistrer" }));

      expect(
        await screen.findByRole("heading", { level: 2, name: "Alice B" }),
      ).toBeInTheDocument();
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
      expect(
        screen.queryByRole("heading", { level: 2, name: "Alice" }),
      ).not.toBeInTheDocument();
      expect(hasAvatarArtwork("foam")).toBe(true);
      expect(hasAvatarArtwork("hop")).toBe(false);
      expect(toast.success).toHaveBeenCalledWith("Profil enregistré");
    });

    it("keeps the old card and the open sheet with its values when the server fails", async () => {
      await useRealProfileHook();
      stubServer(500);
      vi.spyOn(toast, "danger").mockImplementation(() => "toast-id");
      const user = userEvent.setup();
      renderWithProviders(<ProfilePage />);
      expect(
        await screen.findByRole("heading", { level: 2, name: "Alice" }),
      ).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Modifier" }));
      const nameField = await screen.findByRole("textbox", {
        name: /Nom d'affichage/,
      });
      await user.clear(nameField);
      await user.type(nameField, "Alice B");
      await user.click(screen.getByRole("button", { name: "Enregistrer" }));

      await waitFor(() => expect(toast.danger).toHaveBeenCalledTimes(1));
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(
        screen.getByRole("textbox", { name: /Nom d'affichage/ }),
      ).toHaveValue("Alice B");
      expect(
        screen.getByRole("heading", { level: 2, name: "Alice", hidden: true }),
      ).toBeInTheDocument();
    });
  });

  describe("demo user change with the real dex hook", () => {
    afterEach(() => vi.unstubAllGlobals());

    it("reads the progress again for the newly picked user", async () => {
      const actualDex = await vi.importActual<{
        useDexQuery: typeof mockDex.useDexQuery;
      }>("@/hooks/dex/useDexQuery");
      mockDex.useDexQuery.mockImplementation(actualDex.useDexQuery);
      const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
        const discovered =
          (init?.headers as Record<string, string>)["X-User-Id"] === "2"
            ? 7
            : 42;
        return new Response(
          JSON.stringify({ discovered, total: 120, families: [], beers: [] }),
          { status: 200 },
        );
      });
      vi.stubGlobal("fetch", fetchMock);
      const user = userEvent.setup();
      renderWithProviders(<ProfilePage />);
      expect(
        await screen.findByText("42 / 120 découvertes"),
      ).toBeInTheDocument();

      await user.click(
        screen.getByRole("button", { name: /Utilisateur courant/ }),
      );
      await user.click(
        screen.getByRole("option", { name: "Bob (utilisateur 2)" }),
      );

      expect(
        await screen.findByText("7 / 120 découvertes"),
      ).toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe("wishlist removal with the real hooks", () => {
    const createRetryingClient = () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, retryDelay: 1, gcTime: Infinity },
        },
      });

    beforeEach(async () => {
      const actualQuery = await vi.importActual<{
        useWishlistQuery: typeof useWishlistQuery;
      }>("@/pages/profile/hooks/useWishlistQuery");
      const actualRemove = await vi.importActual<{
        useRemoveFromWishlistMutation: typeof useRemoveFromWishlistMutation;
      }>("@/pages/profile/hooks/useRemoveFromWishlistMutation");
      mockWishlist.useWishlistQuery.mockImplementation(
        actualQuery.useWishlistQuery,
      );
      mockRemoveFromWishlist.useRemoveFromWishlistMutation.mockImplementation(
        actualRemove.useRemoveFromWishlistMutation,
      );
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

      await userEvent
        .setup()
        .click(
          await screen.findByRole("button", {
            name: "Retirer Orval des envies",
          }),
        );

      await waitFor(() =>
        expect(
          screen.queryByRole("link", { name: "Orval" }),
        ).not.toBeInTheDocument(),
      );
      expect(
        screen.getByRole("link", { name: "Chimay Rouge" }),
      ).toBeInTheDocument();
      expect(toast.success).toHaveBeenCalledTimes(1);
      expect(toast.success).toHaveBeenCalledWith("Retirée de vos envies.");
      expect(toast.danger).not.toHaveBeenCalled();
      expect(invalidate).toHaveBeenCalledWith({ queryKey: beerKeys.all() });
    });

    it("keeps the beer in the list and shows one error message when the removal fails", async () => {
      const fetchMock = stubWishlistFetch(500);
      renderWithProviders(<ProfilePage />, {
        queryClient: createRetryingClient(),
      });

      await userEvent
        .setup()
        .click(
          await screen.findByRole("button", {
            name: "Retirer Orval des envies",
          }),
        );

      await waitFor(() => expect(toast.danger).toHaveBeenCalledTimes(1));
      expect(vi.mocked(toast.danger).mock.calls[0][0]).toBeTruthy();
      expect(screen.getByRole("link", { name: "Orval" })).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "Chimay Rouge" }),
      ).toBeInTheDocument();
      expect(toast.success).not.toHaveBeenCalled();
      expect(
        fetchMock.mock.calls.filter(([, init]) => init?.method === "DELETE"),
      ).toHaveLength(1);
    });

    it("keeps the beer, shows one error message and reads the list again when it was already removed elsewhere", async () => {
      const fetchMock = stubWishlistFetch(404);
      renderWithProviders(<ProfilePage />, {
        queryClient: createRetryingClient(),
      });

      await userEvent
        .setup()
        .click(
          await screen.findByRole("button", {
            name: "Retirer Orval des envies",
          }),
        );

      await waitFor(() => expect(toast.danger).toHaveBeenCalledTimes(1));
      await waitFor(() =>
        expect(
          fetchMock.mock.calls.filter(([, init]) => init?.method !== "DELETE"),
        ).toHaveLength(2),
      );
      expect(screen.getByRole("link", { name: "Orval" })).toBeInTheDocument();
      expect(toast.success).not.toHaveBeenCalled();
    });
  });
});
