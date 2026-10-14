import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "@/i18n/i18n";
import { ProfilePage } from "@/pages/profile/profile";
import { createCollection, fetchUserCollections } from "@/utils/queryFunctions/collectionQueryFunctions";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";

const pending = vi.hoisted(() => ({ isPending: true, isError: false, refetch: vi.fn() }));

vi.mock("@/hooks/dex/useDexQuery", () => ({ useDexQuery: () => ({ dex: null, ...pending }) }));
vi.mock("@/hooks/profile/useProfileQuery", () => ({ useProfileQuery: () => ({ profile: null, ...pending }) }));
vi.mock("@/pages/profile/hooks/useBadgesQuery", () => ({ useBadgesQuery: () => ({ badges: [], ...pending }) }));
vi.mock("@/pages/profile/hooks/useStatsQuery", () => ({ useStatsQuery: () => ({ stats: null, ...pending }) }));
vi.mock("@/pages/profile/hooks/useWishlistQuery", () => ({ useWishlistQuery: () => ({ items: [], ...pending }) }));
vi.mock("@/pages/profile/hooks/useRemoveFromWishlistMutation", () => ({
  useRemoveFromWishlistMutation: () => ({ removeItem: vi.fn(), pendingBeerId: null }),
}));
vi.mock("@/utils/queryFunctions/collectionQueryFunctions", () => ({
  fetchUserCollections: vi.fn(),
  createCollection: vi.fn(),
}));

const WISHLIST = { id: null, kind: "wishlist", name: "", beerCount: 2 };
const TRAPPISTES = { id: 9, kind: "custom", name: "Trappistes", beerCount: 0 };

describe("ProfilePage collection creation (hooks not mocked)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await i18n.changeLanguage("fr");
    window.localStorage.clear();
  });

  it("shows the created collection in the section once the sheet is closed, through the refetch of the list", async () => {
    let created = false;
    vi.mocked(fetchUserCollections).mockImplementation(async () => (created ? [WISHLIST, TRAPPISTES] : [WISHLIST]) as never);
    vi.mocked(createCollection).mockImplementation(async () => {
      created = true;
      return TRAPPISTES as never;
    });
    const user = userEvent.setup();
    renderWithProviders(<ProfilePage />);
    const section = (await screen.findByRole("heading", { level: 2, name: "Mes collections" })).closest("section") as HTMLElement;
    expect(await within(section).findByRole("link", { name: "À goûter" })).toBeInTheDocument();
    expect(within(section).queryByRole("link", { name: "Trappistes" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Nouvelle collection" }));
    await user.type(await screen.findByRole("textbox", { name: /Nom de la collection/ }), "Trappistes");
    await user.click(screen.getByRole("button", { name: "Créer" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const link = await within(section).findByRole("link", { name: "Trappistes" });
    expect(link).toHaveAttribute("href", "/profils/1/collections/9");
    expect(within(link.closest("li") as HTMLElement).getByText("0 bière")).toBeInTheDocument();
    expect(createCollection).toHaveBeenCalledWith("Trappistes");
  });
});
